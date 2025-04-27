import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "../api/auth/[...nextauth]/route"
import LoginForm from "../components/LoginForm"

export default async function LoginPage() {
  // Check if user is already logged in
  const session = await getServerSession(authOptions)

  if (session) {
    redirect("/")
  }

  return <LoginForm />
}
