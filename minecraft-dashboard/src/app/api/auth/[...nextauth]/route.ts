import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import type { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  session: {
    maxAge: 6 * 60 * 20, // 3 hours
    strategy: "jwt" as const, // Properly typed as a const
  },
  callbacks: {
    async session({ session, token }) {
      // Add the user ID to the session
      if (session.user) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, account }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Ensures cookie is sent only over HTTPS in production
        sameSite: "lax", // Can also be "strict" or "none"
        path: "/",
      },
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
