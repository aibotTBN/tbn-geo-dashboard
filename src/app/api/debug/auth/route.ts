import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Diagnostic endpoint to check auth configuration.
 * Temporarily enabled — remove after debugging.
 * 
 * Visit: https://llmradar.de/api/debug/auth
 */
export async function GET() {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    node_env: process.env.NODE_ENV,
  }

  // 1. Check required env vars (just presence, not values)
  const envVars = [
    'DATABASE_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'RESEND_API_KEY',
    'EMAIL_FROM',
  ]
  diagnostics.env_vars = {}
  for (const key of envVars) {
    const val = process.env[key]
    if (!val) {
      diagnostics.env_vars[key] = '❌ MISSING'
    } else if (key === 'NEXTAUTH_URL') {
      diagnostics.env_vars[key] = `✅ ${val}` // Safe to show URL
    } else {
      diagnostics.env_vars[key] = `✅ set (${val.length} chars)`
    }
  }

  // 2. Test database connection
  try {
    const result = await prisma.$queryRawUnsafe('SELECT 1 as ok')
    diagnostics.database = '✅ Connected'
  } catch (error: any) {
    diagnostics.database = `❌ ${error.message}`
  }

  // 3. Check User table
  try {
    const users = await prisma.$queryRawUnsafe(
      'SELECT id, email, role, "createdAt" FROM "User" ORDER BY "createdAt" DESC LIMIT 10'
    )
    diagnostics.users = (users as any[]).map((u: any) => ({
      id: u.id?.substring(0, 8) + '...',
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    }))
  } catch (error: any) {
    diagnostics.users = `❌ ${error.message}`
  }

  // 4. Check Account table
  try {
    const accounts = await prisma.$queryRawUnsafe(
      'SELECT id, "userId", provider, "providerAccountId" FROM "Account" ORDER BY "userId" LIMIT 10'
    )
    diagnostics.accounts = (accounts as any[]).map((a: any) => ({
      id: a.id?.substring(0, 8) + '...',
      userId: a.userId?.substring(0, 8) + '...',
      provider: a.provider,
      providerAccountId: a.providerAccountId?.substring(0, 8) + '...',
    }))
  } catch (error: any) {
    diagnostics.accounts = `❌ ${error.message}`
  }

  // 5. Check schema state
  try {
    const roleColumn = await prisma.$queryRawUnsafe(
      `SELECT data_type, udt_name FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'role'`
    )
    diagnostics.schema_role = roleColumn
    
    const tables = await prisma.$queryRawUnsafe(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    )
    diagnostics.tables = (tables as any[]).map((t: any) => t.table_name)
  } catch (error: any) {
    diagnostics.schema = `❌ ${error.message}`
  }

  // 6. Test PrismaAdapter operations (simulate what NextAuth does)
  try {
    // Test getUserByEmail (this is what the adapter calls during OAuth)
    const testUser = await prisma.user.findUnique({
      where: { email: 'jens@tbnpr.de' }, // Try a likely TBN email
    })
    diagnostics.prisma_adapter_test = testUser
      ? `✅ User found: ${testUser.email} (role: ${testUser.role})`
      : '⚠️ No user with jens@tbnpr.de found'
  } catch (error: any) {
    diagnostics.prisma_adapter_test = `❌ Prisma query failed: ${error.message}`
  }

  return NextResponse.json(diagnostics, {
    headers: { 'Content-Type': 'application/json' },
  })
}
