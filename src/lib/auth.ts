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
      // Allow linking even if email already exists from another provider
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // Google OAuth: only allow @tbnpr.de
      if (account?.provider === 'google') {
        const email = user.email || ''
        const domain = email.split('@')[1]
        if (domain !== 'tbnpr.de') {
          console.log(`[Auth] Google sign-in rejected: ${email} (not @tbnpr.de)`)
          return false
        }

        // Auto-set TBN_STAFF role for @tbnpr.de Google logins
        try {
          if (user.id) {
            const existingUser = await prisma.user.findUnique({ where: { id: user.id } })
            if (existingUser && existingUser.role === 'USER') {
              await prisma.user.update({
                where: { id: user.id },
                data: { role: 'TBN_STAFF', plan: 'PRO' },
              })
              console.log(`[Auth] Auto-upgraded ${email} to TBN_STAFF/PRO`)
            }
          }
        } catch (error) {
          // Don't block sign-in if role update fails
          console.error('[Auth] Error updating role during sign-in:', error)
        }
      }
      return true
    },

    async jwt({ token, user, account, trigger, session }) {
      // Initial sign-in: add user data to token
      if (user) {
        token.id = user.id
        token.role = (user as any).role || 'USER'
        token.plan = (user as any).plan || null
      }

      // For OAuth providers: the user object from the adapter might not have
      // custom fields. Fetch from DB to be sure.
      if (account?.provider === 'google' && token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
          })
          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role
            token.plan = dbUser.plan
          }
        } catch (error) {
          console.error('[Auth] Error fetching user in jwt callback:', error)
        }
      }

      // When session is updated (e.g., plan change)
      if (trigger === 'update' && session) {
        if (session.role) token.role = session.role
        if (session.plan !== undefined) token.plan = session.plan
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id || token.sub
        ;(session.user as any).role = token.role || 'USER'
        ;(session.user as any).plan = token.plan || null
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      // Handle relative URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Allow callbacks to same origin
      if (new URL(url).origin === baseUrl) return url
      return baseUrl + '/dashboard'
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
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: 'TBN_STAFF', plan: 'PRO' },
          })
          console.log(`[Auth] New TBN user created: ${email} → TBN_STAFF/PRO`)
        } catch (error) {
          console.error('[Auth] Error setting TBN_STAFF role for new user:', error)
        }
      }
    },
  },

  debug: false,

  logger: {
    error(code, metadata) {
      console.error('[NextAuth Error]', code, JSON.stringify(metadata, null, 2))
    },
    warn(code) {
      console.warn('[NextAuth Warn]', code)
    },
    debug(code, metadata) {
      console.log('[NextAuth Debug]', code, JSON.stringify(metadata, null, 2))
    },
  },
}
