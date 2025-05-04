import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"
import fs from "fs"
import type { Session } from "next-auth"

// Path to the log file - update this to match your server's log file location
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || "latest.log"

// Keep track of active connections
const activeConnections = new Map<
  string,
  {
    controller: ReadableStreamDefaultController<Uint8Array>
    intervals: NodeJS.Timeout[]
  }
>()

export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions)) as Session | null

    if (!session || !session.user) {
      return new Response("Unauthorized", { status: 401 })
    }

    const allowedEmails = process.env.AUTHORIZED_EMAILS?.split(",") || []
    if (!allowedEmails.includes(session.user.email || "")) {
      return new Response("Forbidden", { status: 403 })
    }

    // Check if the file exists
    if (!fs.existsSync(LOG_FILE_PATH)) {
      console.error(`Log file not found: ${LOG_FILE_PATH}`)
      return new Response(`Log file not found: ${LOG_FILE_PATH}. Current directory: ${process.cwd()}`, { status: 404 })
    }

    // Get log level from URL params
    const url = new URL(request.url)
    const logLevel = url.searchParams.get("level") || "INFO"

    // Generate a unique client ID based on the user's email and log level
    const clientId = `${session.user.email || "anonymous"}-${logLevel}-${Date.now()}`

    // Set up Server-Sent Events headers
    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Encoding": "identity",
    }

    // Create a transform stream
    const encoder = new TextEncoder()

    // Create a readable stream that will be sent to the client
    const readable = new ReadableStream({
      async start(controller) {
        // Store the controller and intervals for cleanup
        const intervals: NodeJS.Timeout[] = []
        activeConnections.set(clientId, { controller, intervals })

        try {
          // Get file stats
          const stats = fs.statSync(LOG_FILE_PATH)

          // Start with last ~50KB for new clients
          let position = Math.max(0, stats.size - 50000)

          // Send initial data
          const initialChunk = await readNewChunk(position, logLevel)
          if (initialChunk.lines.length > 0) {
            for (const line of initialChunk.lines) {
              controller.enqueue(encoder.encode(`data: ${line}\n\n`))
            }
          } else {
            controller.enqueue(encoder.encode(`data: Waiting for new log entries...\n\n`))
          }

          // Update position
          position = initialChunk.newPosition

          // Set up polling for file changes
          const intervalId = setInterval(async () => {
            try {
              // Check if connection is still active
              if (!activeConnections.has(clientId)) {
                clearInterval(intervalId)
                return
              }

              // Check if file exists and get stats
              if (!fs.existsSync(LOG_FILE_PATH)) {
                controller.enqueue(
                  encoder.encode(`data: Log file no longer exists. Waiting for it to be created...\n\n`),
                )
                return
              }

              const currentStats = fs.statSync(LOG_FILE_PATH)

              // If file size is smaller than our position, the file was rotated/truncated
              if (currentStats.size < position) {
                position = 0
                controller.enqueue(
                  encoder.encode(`data: Log file was rotated or truncated. Starting from beginning.\n\n`),
                )
              }

              // If file hasn't changed, do nothing
              if (currentStats.size <= position) {
                return
              }

              // Read new content
              const chunk = await readNewChunk(position, logLevel)

              // Send new lines
              if (chunk.lines.length > 0) {
                for (const line of chunk.lines) {
                  controller.enqueue(encoder.encode(`data: ${line}\n\n`))
                }

                // Update position
                position = chunk.newPosition
              }
            } catch (error) {
              console.error("Error polling log file:", error)
              try {
                controller.enqueue(encoder.encode(`data: Error reading log file: ${error}\n\n`))
              } catch {
                // Controller might be closed, clean up
                clearInterval(intervalId)
                activeConnections.delete(clientId)
              }
            }
          }, 1000) // Poll every second
          intervals.push(intervalId)

          // Send keep-alive messages to prevent connection timeout
          const keepAliveId = setInterval(() => {
            try {
              // Check if connection is still active
              if (!activeConnections.has(clientId)) {
                clearInterval(keepAliveId)
                return
              }

              controller.enqueue(encoder.encode(`: keep-alive\n\n`))
            } catch {
              // Controller might be closed, clean up
              clearInterval(keepAliveId)
              activeConnections.delete(clientId)
            }
          }, 25000) // 25 seconds
          intervals.push(keepAliveId)

          // Clean up when the connection closes
          return () => {
            // Clear all intervals
            const connection = activeConnections.get(clientId)
            if (connection) {
              connection.intervals.forEach(clearInterval)
            }

            // Remove from active connections
            activeConnections.delete(clientId)
            console.log(`Client disconnected: ${clientId}`)
          }
        } catch (error) {
          console.error("Error in stream start:", error)
          try {
            controller.enqueue(encoder.encode(`data: Error starting log stream: ${error}\n\n`))
          } catch {
            // Controller might be closed, clean up
            activeConnections.delete(clientId)
          }
        }
      },
      cancel() {
        // Clean up if the stream is cancelled
        const connection = activeConnections.get(clientId)
        if (connection) {
          connection.intervals.forEach(clearInterval)
        }
        activeConnections.delete(clientId)
        console.log(`Stream cancelled for client: ${clientId}`)
      },
    })

    return new Response(readable, { headers })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error streaming logs:", error)
    return new Response(`Error streaming logs: ${error.message}`, { status: 500 })
  }
}

// Helper function to read new content from the log file
async function readNewChunk(position: number, logLevel: string): Promise<{ lines: string[]; newPosition: number }> {
  return new Promise((resolve, reject) => {
    try {
      // Open the file for reading
      const fd = fs.openSync(LOG_FILE_PATH, "r")

      // Get file stats
      const stats = fs.fstatSync(fd)

      // If there's nothing new to read
      if (stats.size <= position) {
        fs.closeSync(fd)
        resolve({ lines: [], newPosition: position })
        return
      }

      // Calculate how much to read
      const bytesToRead = stats.size - position
      const buffer = Buffer.alloc(bytesToRead)

      // Read from the last position to the end
      fs.readSync(fd, buffer, 0, bytesToRead, position)
      fs.closeSync(fd)

      // Convert buffer to string and normalize line endings
      const content = buffer.toString().replace(/\r\n/g, "\n").replace(/\r/g, "\n")

      // Split into lines and filter based on log level
      const allLines = content.split("\n")
      let filteredLines: string[] = []

      if (logLevel === "ALL") {
        // Include all lines that have a log level indicator
        filteredLines = allLines.filter(
          (line) => line.includes("/INFO]") || line.includes("/WARN]") || line.includes("/ERROR]"),
        )
      } else {
        // Filter for specific log level
        filteredLines = allLines.filter((line) => line.includes(`/${logLevel}]`))
      }

      // Add log level as metadata to each line for client-side coloring
      const processedLines = filteredLines.map((line) => {
        let level = "INFO" // Default
        if (line.includes("/WARN]")) level = "WARN"
        if (line.includes("/ERROR]")) level = "ERROR"

        // Escape any newlines within the line
        const escapedLine = line.replace(/\n/g, "\\n")

        // Return JSON with level and content
        return JSON.stringify({ level, content: escapedLine })
      })

      resolve({
        lines: processedLines,
        newPosition: position + bytesToRead,
      })
    } catch (error) {
      reject(error)
    }
  })
}
