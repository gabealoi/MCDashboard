import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // If the user is not logged in, redirect to the login page
  if (!token) {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Continue with the request
  return NextResponse.next()
}

// Add the paths that should be protected by authentication
export const config = {
  matcher: [
    "/((?!api/auth|login|_next|favicon.ico).*)",
  ],
}
// export const config = {
//   matcher: ["/dashboard/:path*", "/api/server/:path*"],
// }
