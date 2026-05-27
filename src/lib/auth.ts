import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

/**
 * Custom adapter wrapper around PrismaAdapter.
 *
 * Fixes two issues with @auth/prisma-adapter v2 on NextAuth v4:
 *
 * 1. linkAccount: The v2 adapter (Auth.js v5) may pass extra OAuth fields
 *    to Prisma that aren't in the Account schema → Prisma rejects them.
 *    We map only known fields explicitly.
 *
 * 2. getUserByAccount: The v2 adapter returns a full Prisma User which may
 *    include fields that NextAuth v4 doesn't expect. We normalize the
 *    return to ensure compatibility.
 */
function createAdapter() {
  const base = PrismaAdapter(prisma) as any

  return {
    ...base,

    async getUserByAccount(providerAccount: {
      provider: string
      providerAccountId: string
    }) {
      console.log(
        '[Auth Adapter] getUserByAccount:',
        providerAccount.provider,
        providerAccount.providerAccountId
      )

      const account = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: providerAccount.provider,
            providerAccountId: providerAccount.providerAccountId,
          },
        },
        include: { user: true },
      })

      if (!account?.user) {
        console.log('[Auth Adapter] getUserByAccount: no linked user found')
        return null
      }

      console.log(
        '[Auth Adapter] getUserByAccount: found user',
        account.user.id,
        account.user.email
      )

      return account.user
    },

    async linkAccount(rawAccount: any) {
      console.log(
        '[Auth Adapter] linkAccount:',
        rawAccount.provider,
        'userId=',
        rawAccount.userId
      )

      try {
        const created = await prisma.account.create({
          data: {
            userId: rawAccount.userId,
            type: rawAccount.type || 'oauth',
            provider: rawAccount.provider,
            providerAccountId: rawAccount.providerAccountId,
            refresh_token: rawAccount.refresh_token ?? null,
            access_token: rawAccount.access_token ?? null,
            expires_at:
              rawAccount.expires_at != null
                ? typeof rawAccount.expires_at === 'number'
                  ? rawAccount.expires_at
                  : parseInt(rawAccount.expires_at, 10)
                : null,
            token_type: rawAccount.token_type ?? null,
            scope: rawAccount.scope ?? null,
            id_token: rawAccount.id_token ?? null,
            session_state: rawAccount.session_state?.toString() ?? null,
          },
        })
        console.log('[Auth Adapter] linkAccount: success')
        return created
      } catch (error: any) {
        if (error?.code === 'P2002') {
          console.log('[Auth Adapter] linkAccount: already exists (P2002), returning existing')
          return prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: rawAccount.provider,
                providerAccountId: rawAccount.providerAccountId,
              },
            },
          })
        }
        console.error('[Auth Adapter] linkAccount error:', error)
        throw error
      }
    },

    async updateAccount(data: any) {
      console.log('[Auth Adapter] updateAccount:', data.provider, data.providerAccountId)
      // Only update fields that exist in our schema
      try {
        return await prisma.account.update({
          where: {
            provider_providerAccountId: {
              provider: data.provider,
              providerAccountId: data.providerAccountId,
            },
          },
          data: {
            refresh_token: data.refresh_token ?? undefined,
            access_token: data.access_token ?? undefined,
            expires_at:
              data.expires_at != null
                ? typeof data.expires_at === 'number'
                  ? data.expires_at
                  : parseInt(data.expires_at, 10)
                : undefined,
            token_type: data.token_type ?? undefined,
            scope: data.scope ?? undefined,
            id_token: data.id_token ?? undefined,
            session_state: data.session_state?.toString() ?? undefined,
          },
        })
      } catch (error: any) {
        console.error('[Auth Adapter] updateAccount error:', error)
        throw error
      }
    },
  }
}

export const authOptions: NextAuthOptions = {
  adapter: createAdapter() as any,
  session: {
    strategy: 'jwt',
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
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      console.log('[Auth] signIn callback:', {
        userId: user?.id,
        email: user?.email,
        provider: account?.provider,
        type: account?.type,
      })

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
          console.error('[Auth] Error updating role during sign-in:', error)
        }
      }
      return true
    },

    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role || 'USER'
        token.plan = (user as any).plan || null
      }

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
      if (url.startsWith('/')) return `${baseUrl}${url}`
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

  // Temporarily enabled for debugging OAuthAccountNotLinked
  debug: true,

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
