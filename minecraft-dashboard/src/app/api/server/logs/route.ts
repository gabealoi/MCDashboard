import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"
import fs from "fs"
import type { Session } from "next-auth"

// Path to the log file - update this to match your server's log file location
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || "latest.log"

// Keep track of file positions for different clients
const clientPositions = new Map<string, number>()

export async function GET() {
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

    // Generate a unique client ID based on the user's email
    const clientId = session.user.email || "anonymous"

    // Set up Server-Sent Events headers
    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    }

    // Create a transform stream
    const encoder = new TextEncoder()

    // Create a readable stream that will be sent to the client
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Get file stats
          const stats = fs.statSync(LOG_FILE_PATH)

          // Get the current position for this client, or start at the end if it's a new connection
          let position = clientPositions.get(clientId) || Math.max(0, stats.size - 50000) // Start with last ~50KB for new clients

          // Send initial data
          const initialChunk = await readNewChunk(position)
          if (initialChunk.lines.length > 0) {
            for (const line of initialChunk.lines) {
              controller.enqueue(encoder.encode(`data: ${line}\n\n`))
            }
          } else {
            controller.enqueue(encoder.encode(`data: Waiting for new log entries...\n\n`))
          }

          // Update position
          position = initialChunk.newPosition
          clientPositions.set(clientId, position)

          // Set up polling for file changes
          const intervalId = setInterval(async () => {
            try {
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
              const chunk = await readNewChunk(position)

              // Send new lines
              if (chunk.lines.length > 0) {
                for (const line of chunk.lines) {
                  controller.enqueue(encoder.encode(`data: ${line}\n\n`))
                }

                // Update position
                position = chunk.newPosition
                clientPositions.set(clientId, position)
              }
            } catch (error) {
              console.error("Error polling log file:", error)
              controller.enqueue(encoder.encode(`data: Error reading log file: ${error}\n\n`))
            }
          }, 1000) // Poll every second

          // Clean up when the connection closes
          return () => {
            clearInterval(intervalId)
          }
        } catch (error) {
          console.error("Error in stream start:", error)
          controller.enqueue(encoder.encode(`data: Error starting log stream: ${error}\n\n`))
        }
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
async function readNewChunk(position: number): Promise<{ lines: string[]; newPosition: number }> {
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

      // Split into lines and filter for INFO logs
      const allLines = content.split("\n")
      const infoLines = allLines.filter((line) => line.includes("/INFO]")).map((line) => line.replace(/\n/g, "\\n")) // Escape any newlines within the line

      resolve({
        lines: infoLines,
        newPosition: position + bytesToRead,
      })
    } catch (error) {
      reject(error)
    }
  })
}
