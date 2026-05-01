import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Only allow @tbnpr.de emails (adjust as needed)
      const email = user.email || ''
      const allowedDomains = ['tbnpr.de']
      const domain = email.split('@')[1]
      return allowedDomains.includes(domain)
    },
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id
        ;(session.user as any).role = (user as any).role || 'viewer'
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}
