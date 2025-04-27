import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "../api/auth/[...nextauth]/route"
import DashboardContent from "../components/DashboardContent"
import type { Session } from "next-auth"

export default async function DashboardPage() {
  const session = (await getServerSession(authOptions)) as Session | null

  if (!session || !session.user) {
    redirect("/login")
  }

  // Check authorization
  const allowedEmails = process.env.AUTHORIZED_EMAILS?.split(",") || []
  const isAuthorized = allowedEmails.includes(session.user.email || "")

  if (!isAuthorized) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h1>Unauthorized Access</h1>
        <p>You don&apos;t have permission to access this dashboard.</p>
      </div>
    )
  }

  // Pass the user object to the client component
  return <DashboardContent user={session.user} />
}
