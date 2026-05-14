import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// TEMPORARY migration endpoint — delete after columns are created
export async function GET() {
  const prisma = new PrismaClient()
  const results: string[] = []
  
  try {
    // Add monitoring columns to Project table
    const statements = [
      `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "monitoringEnabled" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "monitoringInterval" TEXT NOT NULL DEFAULT 'weekly'`,
      `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "lastDiagnoseAt" TIMESTAMP(3)`,
      `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "alertThreshold" INTEGER NOT NULL DEFAULT 10`,
      `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "alertEmail" TEXT`,
      `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "alertSlack" TEXT`,
    ]
    
    for (const sql of statements) {
      try {
        await prisma.$executeRawUnsafe(sql)
        results.push(`OK: ${sql.substring(0, 60)}...`)
      } catch (e: any) {
        results.push(`SKIP: ${e.message.substring(0, 80)}`)
      }
    }
    
    // Also create index
    try {
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Diagnosis_projectId_createdAt_idx" ON "Diagnosis"("projectId", "createdAt")`)
      results.push('OK: Created index')
    } catch (e: any) {
      results.push(`SKIP index: ${e.message.substring(0, 80)}`)
    }
    
    // Verify columns
    const cols = await prisma.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name = 'Project' ORDER BY ordinal_position`)
    
    return NextResponse.json({ 
      status: 'migration complete',
      results,
      columns: cols
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
