/**
 * Pre-migration script: safely converts string role/plan to enums
 * and ensures required columns exist before prisma db push.
 * Runs BEFORE prisma db push in docker-entrypoint.sh.
 * 
 * Uses @prisma/client $executeRawUnsafe to run raw SQL.
 * Idempotent — safe to run multiple times.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('[Pre-migrate] Starting pre-migration checks...')
  
  try {
    // 1. Check if User table exists
    const [tableExists] = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'User'
      ) as exists
    `)
    
    if (!tableExists?.exists) {
      console.log('[Pre-migrate] User table not found — fresh install, skipping.')
      return
    }

    // 2. Ensure createdAt column exists (with default for existing rows)
    const [hasCreatedAt] = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'createdAt'
      ) as exists
    `)
    
    if (!hasCreatedAt?.exists) {
      console.log('[Pre-migrate] Adding createdAt column...')
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      `)
    }

    // 3. Ensure updatedAt column exists (with default for existing rows)
    const [hasUpdatedAt] = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'updatedAt'
      ) as exists
    `)
    
    if (!hasUpdatedAt?.exists) {
      console.log('[Pre-migrate] Adding updatedAt column...')
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      `)
    }

    // 4. Ensure passwordHash column exists
    const [hasPasswordHash] = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'passwordHash'
      ) as exists
    `)
    
    if (!hasPasswordHash?.exists) {
      console.log('[Pre-migrate] Adding passwordHash column...')
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT`)
    }

    // 5. Check if role column needs enum conversion
    const [columnInfo] = await prisma.$queryRawUnsafe(`
      SELECT data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'role'
    `)
    
    if (!columnInfo) {
      console.log('[Pre-migrate] Role column not found — skipping enum conversion.')
      return
    }
    
    if (columnInfo.udt_name === 'Role') {
      console.log('[Pre-migrate] Role column is already an enum — skipping conversion.')
    } else {
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
    }

    // 6. Ensure userId column on Project table
    const [hasUserId] = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'Project' AND column_name = 'userId'
      ) as exists
    `)
    
    if (!hasUserId?.exists) {
      console.log('[Pre-migrate] Adding userId column to Project...')
      await prisma.$executeRawUnsafe(`ALTER TABLE "Project" ADD COLUMN "userId" TEXT`)
    }

    // Show current state
    const users = await prisma.$queryRawUnsafe(`SELECT id, email, role FROM "User"`)
    console.log(`[Pre-migrate] Current users (${users.length}):`)
    for (const u of users) {
      console.log(`  - ${u.email}: ${u.role}`)
    }

    const accounts = await prisma.$queryRawUnsafe(`SELECT id, "userId", provider FROM "Account"`)
    console.log(`[Pre-migrate] Current accounts (${accounts.length}):`)
    for (const a of accounts) {
      console.log(`  - ${a.userId}: ${a.provider}`)
    }

    console.log('[Pre-migrate] ✅ All pre-migration checks complete.')
    
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
