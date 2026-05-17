/**
 * Pre-migration script: safely converts string role/plan to enums.
 * Runs BEFORE prisma db push in docker-entrypoint.sh.
 * 
 * Uses @prisma/client $executeRawUnsafe to run raw SQL.
 * Idempotent — safe to run multiple times.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('[Pre-migrate] Checking if role column needs enum migration...')
  
  try {
    // Check if the 'role' column is still text type
    const [columnInfo] = await prisma.$queryRawUnsafe(`
      SELECT data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'role'
    `)
    
    if (!columnInfo) {
      console.log('[Pre-migrate] User table or role column not found — fresh install, skipping.')
      return
    }
    
    if (columnInfo.udt_name === 'Role') {
      console.log('[Pre-migrate] Role column is already an enum — skipping.')
      return
    }
    
    console.log(`[Pre-migrate] Role column is "${columnInfo.data_type}" (${columnInfo.udt_name}) — converting to enum...`)
    
    // Create enum types if they don't exist
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
          CREATE TYPE "Role" AS ENUM ('USER', 'TBN_STAFF', 'ADMIN');
        END IF;
      END$$;
    `)
    
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Plan') THEN
          CREATE TYPE "Plan" AS ENUM ('STARTER', 'PRO', 'MANAGED');
        END IF;
      END$$;
    `)
    
    // Convert existing role values
    await prisma.$executeRawUnsafe(`UPDATE "User" SET role = 'USER' WHERE role = 'viewer'`)
    await prisma.$executeRawUnsafe(`UPDATE "User" SET role = 'TBN_STAFF' WHERE role = 'editor'`)
    await prisma.$executeRawUnsafe(`UPDATE "User" SET role = 'ADMIN' WHERE role = 'admin'`)
    
    // Convert column type
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
        ALTER COLUMN "role" TYPE "Role" USING role::"Role",
        ALTER COLUMN "role" SET DEFAULT 'USER'
    `)
    
    console.log('[Pre-migrate] ✅ Role column converted to enum successfully.')
    
    // Show current users
    const users = await prisma.$queryRawUnsafe(`SELECT id, email, role FROM "User"`)
    console.log(`[Pre-migrate] Current users (${users.length}):`)
    for (const u of users) {
      console.log(`  - ${u.email}: ${u.role}`)
    }
    
  } catch (error) {
    // If the table doesn't exist yet (fresh install), just skip
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.log('[Pre-migrate] Tables not yet created — fresh install, skipping.')
      return
    }
    console.error('[Pre-migrate] ⚠️ Migration error (non-fatal):', error.message)
    // Don't throw — let prisma db push handle it
  } finally {
    await prisma.$disconnect()
  }
}

main()
