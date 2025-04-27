import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new Response("Unauthorized", { status: 401 })
    }

    const allowedEmails = process.env.AUTHORIZED_EMAILS?.split(",") || []
    if (!allowedEmails.includes(session.user?.email || "")) {
      return new Response("Forbidden", { status: 403 })
    }

    // Name your Minecraft server container correctly!
    const containerName = "paper-mc" // <-- Replace this with your actual container name

    // Run the restart command
    await execAsync(`docker restart ${containerName}`)

    return new Response("Server restart triggered", { status: 200 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error restarting server:", error)
    return new Response(`Failed to restart server: ${error.message}`, { status: 500 })
  }
}
