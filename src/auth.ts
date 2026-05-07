import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import connectDB from "./lib/db"
import User from "./models/user.model"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {
          type: "email",
          label: "Email",
          placeholder: "someone@email.com",
        },

        password: {
          type: "password",
          label: "Password",
          placeholder: "******",
        },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password")
        }

        await connectDB()

        // find user
        const user = await User.findOne({
          email: credentials.email,
        }).lean()

        if (!user) {
          throw new Error("Invalid credentials")
        }

        // compare password
        const isMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isMatch) {
          throw new Error("Invalid credentials")
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // only runs on login
      if (user) {
        token.id = user.id
        token.name = user.name
        token.email = user.email
        token.role = user.role
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.name = token.name
        session.user.email = token.email as string
        session.user.role = token.role as string
      }

      return session
    },
  },

  pages: {
    signIn: "/login",
  },

  session:{
    strategy:"jwt",
    maxAge:10*24*60*60
  },

  secret: process.env.AUTH_SECRET,
})