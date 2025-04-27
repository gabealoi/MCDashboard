import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"
import fs from "fs"
import type { Session } from "next-auth"

// Path to the log file - update this to match your server's log file location
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || "latest.log"

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

    // Log file info for debugging
    const stats = fs.statSync(LOG_FILE_PATH)
    console.log(`Log file found: ${LOG_FILE_PATH}, size: ${stats.size} bytes, modified: ${stats.mtime}`)

    // Set up Server-Sent Events headers
    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    }

    // Create a transform stream to filter for [INFO] lines
    const encoder = new TextEncoder()

    // Create a readable stream that will be sent to the client
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Read the file content
          const initialContent = fs.readFileSync(LOG_FILE_PATH, "utf-8")

          // Normalize line endings and split into lines
          const normalizedContent = initialContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
          const allLines = normalizedContent.split("\n")

          console.log(`Total lines in file: ${allLines.length}`)

          // Filter for INFO lines
          const infoLines = allLines.filter((line) => line.includes("[Server thread/INFO]"))
          console.log(`INFO lines found: ${infoLines.length}`)

          // Send each line as a separate SSE event
          if (infoLines.length > 0) {
            for (const line of infoLines) {
              if (line.trim() !== "") {
                // Escape any newlines within the line itself
                const escapedLine = line.replace(/\n/g, "\\n")
                controller.enqueue(encoder.encode(`data: ${escapedLine}\n\n`))
              }
            }
            console.log(`Sent ${infoLines.length} initial log lines as separate events`)
          } else {
            controller.enqueue(encoder.encode(`data: No log lines found\n\n`))
            console.log("No log lines found")
          }

          // Set up file watcher to stream updates
          const watcher = fs.watch(LOG_FILE_PATH, (eventType) => {
            if (eventType === "change") {
              try {
                // Read the last few lines of the file
                const buffer = Buffer.alloc(4096) // Read last 4KB
                const fd = fs.openSync(LOG_FILE_PATH, "r")
                const fileStats = fs.fstatSync(fd)
                const position = Math.max(0, fileStats.size - buffer.length)

                fs.readSync(fd, buffer, 0, buffer.length, position)
                fs.closeSync(fd)

                const content = buffer.toString().replace(/\r\n/g, "\n").replace(/\r/g, "\n")
                const lines = content.split("\n")

                // Filter for INFO lines
                const infoLines = lines.filter((line) => line.includes("[Server thread/INFO]"))

                if (infoLines.length > 0) {
                  console.log(`Sending ${infoLines.length} new log lines`)

                  // Send each new line as a separate event
                  for (const line of infoLines) {
                    if (line.trim() !== "") {
                      const escapedLine = line.replace(/\n/g, "\\n")
                      controller.enqueue(encoder.encode(`data: ${escapedLine}\n\n`))
                    }
                  }
                }
              } catch (error) {
                console.error("Error reading log file:", error)
                controller.enqueue(encoder.encode(`data: Error reading log file: ${error}\n\n`))
              }
            }
          })

          // Clean up the watcher when the connection closes
          return () => {
            watcher.close()
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
