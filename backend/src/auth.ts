import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDB } from "@rydex/backend/lib/db";
import { User } from "@rydex/backend/models/user.model";
import type { PartnerStatus, UserRole } from "@rydex/shared/types";

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

const providers = [
  Credentials({
    name: "Email & password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email || "").trim().toLowerCase();
      const password = String(credentials?.password || "");
      if (!email || !password) return null;
      await connectDB();
      const user = await User.findOne({ email }).select("+passwordHash").lean();
      if (!user?.passwordHash) return null;
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return null;
      if (!user.emailVerified) {
        throw new Error("EMAIL_NOT_VERIFIED");
      }
      return {
        id: String(user._id),
        name: user.name,
        email: user.email,
        image: user.image || null,
        role: user.role as UserRole,
        partnerStatus: user.partnerStatus as PartnerStatus,
        phone: user.phone || null,
        emailVerified: user.emailVerified?.toISOString() || null,
      };
    },
  }),
];

if (googleEnabled) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }) as never,
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        await connectDB();
        await User.findOneAndUpdate(
          { email: user.email.toLowerCase() },
          {
            $setOnInsert: {
              name: user.name || user.email.split("@")[0],
              email: user.email.toLowerCase(),
              role: "user",
              partnerStatus: "none",
              emailVerified: new Date(),
            },
            $set: {
              image: user.image || undefined,
              emailVerified: new Date(),
            },
          },
          { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
        );
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.partnerStatus = user.partnerStatus;
      }
      if (account?.provider === "google" && token.email) {
        await connectDB();
        const dbUser = await User.findOne({ email: token.email.toLowerCase() }).lean();
        if (dbUser) {
          token.sub = String(dbUser._id);
          token.id = String(dbUser._id);
          token.role = dbUser.role as UserRole;
          token.partnerStatus = dbUser.partnerStatus as PartnerStatus;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.sub) return session;
      await connectDB();
      const dbUser = await User.findById(token.sub).lean();
      if (!dbUser) return session;
      session.user.id = String(dbUser._id);
      session.user.name = dbUser.name;
      session.user.email = dbUser.email;
      session.user.image = dbUser.image || null;
      session.user.phone = dbUser.phone || null;
      session.user.role = dbUser.role as UserRole;
      session.user.partnerStatus = dbUser.partnerStatus as PartnerStatus;
      session.user.emailVerified = dbUser.emailVerified?.toISOString() || null;
      return session;
    },
  },
});
