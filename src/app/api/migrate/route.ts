import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Temporary migration endpoint for Phase 4
// Add competitors column to Project table
// DELETE THIS FILE AFTER MIGRATION
export async function GET() {
  const results: string[] = []

  try {
    // Add competitors column (TEXT, nullable)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "competitors" TEXT
    `)
    results.push('✅ Added competitors column')
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      results.push('⏭️ competitors column already exists')
    } else {
      results.push(`❌ competitors: ${e.message}`)
    }
  }

  // Verify
  try {
    const count = await prisma.project.count()
    results.push(`✅ Verified: ${count} projects accessible`)
  } catch (e: any) {
    results.push(`❌ Verify failed: ${e.message}`)
  }

  return NextResponse.json({ results, timestamp: new Date().toISOString() })
}
