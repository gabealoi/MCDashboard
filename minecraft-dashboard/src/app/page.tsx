import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "./api/auth/[...nextauth]/route"
import HomePage from "./components/HomePage"

export default async function Home() {
  const session = await getServerSession(authOptions)

  // If no session, redirect to login
  if (!session) {
    redirect("/login")
  }

  // Check authorization
  const allowedEmails = process.env.AUTHORIZED_EMAILS?.split(",") || []
  const isAuthorized = allowedEmails.includes(session.user?.email || "")

  if (!isAuthorized) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h1>Unauthorized Access</h1>
        <p>You don&apos;t have permission to access this application.</p>
      </div>
    )
  }

  // Pass session data to client component
  return <HomePage user={session.user} />
}
