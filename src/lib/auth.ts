import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: 'jwt', // Required for CredentialsProvider
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    // Email + Password for customers
    CredentialsProvider({
      id: 'credentials',
      name: 'E-Mail & Passwort',
      credentials: {
        email: { label: 'E-Mail', type: 'email' },
        password: { label: 'Passwort', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('E-Mail und Passwort erforderlich')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })

        if (!user || !user.passwordHash) {
          throw new Error('Ungültige Anmeldedaten')
        }

        if (!user.emailVerified) {
          throw new Error('Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse')
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!isValid) {
          throw new Error('Ungültige Anmeldedaten')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          plan: user.plan,
        }
      },
    }),

    // Google OAuth — only for TBN staff (@tbnpr.de)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // Google OAuth: only allow @tbnpr.de
      if (account?.provider === 'google') {
        const email = user.email || ''
        const domain = email.split('@')[1]
        if (domain !== 'tbnpr.de') {
          return false
        }
        // Auto-set TBN_STAFF role for @tbnpr.de Google logins
        if (user.id) {
          const existingUser = await prisma.user.findUnique({ where: { id: user.id } })
          if (existingUser && existingUser.role === 'USER') {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: 'TBN_STAFF', plan: 'PRO' },
            })
          }
        }
      }
      return true
    },

    async jwt({ token, user, trigger, session }) {
      // Initial sign-in: add user data to token
      if (user) {
        token.id = user.id
        token.role = (user as any).role || 'USER'
        token.plan = (user as any).plan || null
      }

      // When session is updated (e.g., plan change)
      if (trigger === 'update' && session) {
        if (session.role) token.role = session.role
        if (session.plan !== undefined) token.plan = session.plan
      }

      // For Google sign-in: fetch role/plan from DB (adapter creates user first)
      if (token.id && !token.role) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } })
        if (dbUser) {
          token.role = dbUser.role
          token.plan = dbUser.plan
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).role = token.role || 'USER'
        ;(session.user as any).plan = token.plan || null
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  events: {
    async createUser({ user }) {
      // Auto-set TBN_STAFF for @tbnpr.de emails (Google OAuth creates user via adapter)
      const email = user.email || ''
      if (email.endsWith('@tbnpr.de')) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'TBN_STAFF', plan: 'PRO' },
        })
      }
    },
  },
}
