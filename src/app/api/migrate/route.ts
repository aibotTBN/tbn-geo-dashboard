import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// TEMPORARY fix: correct alertSlack column type from TEXT to BOOLEAN
export async function GET() {
  const prisma = new PrismaClient()
  const results: string[] = []
  
  try {
    // Fix alertSlack: drop TEXT column, recreate as BOOLEAN
    const fixes = [
      `ALTER TABLE "Project" DROP COLUMN IF EXISTS "alertSlack"`,
      `ALTER TABLE "Project" ADD COLUMN "alertSlack" BOOLEAN NOT NULL DEFAULT true`,
    ]
    
    for (const sql of fixes) {
      try {
        await prisma.$executeRawUnsafe(sql)
        results.push(`OK: ${sql}`)
      } catch (e: any) {
        results.push(`ERR: ${e.message.substring(0, 120)}`)
      }
    }
    
    // Verify all columns and types
    const cols = await prisma.$queryRawUnsafe(
      `SELECT column_name, data_type, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_name = 'Project' 
       ORDER BY ordinal_position`
    )
    
    // Quick test: can we read projects?
    let projectCount = 0
    try {
      const projects = await prisma.project.findMany()
      projectCount = projects.length
    } catch (e: any) {
      results.push(`READ TEST FAILED: ${e.message.substring(0, 120)}`)
    }
    
    return NextResponse.json({ 
      status: 'fix complete',
      results,
      projectCount,
      columns: cols
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
