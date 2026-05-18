/**
 * Pre-migration script: safely converts the database schema
 * from the old format to the new auth format.
 * 
 * Runs BEFORE prisma db push in docker-entrypoint.sh.
 * Idempotent — safe to run multiple times.
 * 
 * KEY: This must handle the text→enum role conversion so that
 * prisma db push can succeed without --accept-data-loss.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function exec(sql) {
  await prisma.$executeRawUnsafe(sql)
}

async function query(sql) {
  return prisma.$queryRawUnsafe(sql)
}

async function columnExists(table, column) {
  const [row] = await query(`
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = '${table}' AND column_name = '${column}'
    ) as "exists"
  `)
  return row?.exists === true
}

async function addColumnIfMissing(table, column, type, defaultExpr) {
  if (await columnExists(table, column)) return false
  const def = defaultExpr ? ` DEFAULT ${defaultExpr}` : ''
  await exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type}${def}`)
  console.log(`  + ${table}.${column} (${type})`)
  return true
}

async function main() {
  console.log('[Pre-migrate] ══════════════════════════════════════')
  console.log('[Pre-migrate] Starting pre-migration checks...')

  try {
    // ── Check if User table exists ──────────────────────────
    const [tableCheck] = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'User'
      ) as "exists"
    `)

    if (!tableCheck?.exists) {
      console.log('[Pre-migrate] User table not found — fresh install, skipping.')
      console.log('[Pre-migrate] prisma db push will create everything.')
      return
    }

    // ── Step 1: Ensure required columns exist on User ───────
    console.log('[Pre-migrate] Step 1: Checking User columns...')
    await addColumnIfMissing('User', 'createdAt', 'TIMESTAMP(3) NOT NULL', 'CURRENT_TIMESTAMP')
    await addColumnIfMissing('User', 'updatedAt', 'TIMESTAMP(3) NOT NULL', 'CURRENT_TIMESTAMP')
    await addColumnIfMissing('User', 'passwordHash', 'TEXT', null)

    // ── Step 2: Ensure userId column on Project ─────────────
    const [projectExists] = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'Project'
      ) as "exists"
    `)
    if (projectExists?.exists) {
      await addColumnIfMissing('Project', 'userId', 'TEXT', null)
    }

    // ── Step 3: Convert role column from text to enum ───────
    console.log('[Pre-migrate] Step 3: Checking role column type...')
    const [roleInfo] = await query(`
      SELECT data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'role'
    `)

    if (!roleInfo) {
      console.log('[Pre-migrate] ⚠️ Role column not found — skipping.')
    } else if (roleInfo.udt_name === 'Role') {
      console.log('[Pre-migrate] Role column is already "Role" enum ✅')
    } else {
      console.log(`[Pre-migrate] Role is "${roleInfo.data_type}" (udt: ${roleInfo.udt_name}) — converting to enum...`)

      // 3a. Create enum types if they don't exist
      console.log('[Pre-migrate]   Creating enum types...')
      await exec(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
            CREATE TYPE "Role" AS ENUM ('USER', 'TBN_STAFF', 'ADMIN');
            RAISE NOTICE 'Created Role enum';
          END IF;
        END$$;
      `)
      await exec(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Plan') THEN
            CREATE TYPE "Plan" AS ENUM ('STARTER', 'PRO', 'MANAGED');
            RAISE NOTICE 'Created Plan enum';
          END IF;
        END$$;
      `)

      // 3b. Map old role values to new enum values
      console.log('[Pre-migrate]   Updating role values...')
      await exec(`UPDATE "User" SET role = 'USER' WHERE role = 'viewer'`)
      await exec(`UPDATE "User" SET role = 'TBN_STAFF' WHERE role = 'editor'`)
      await exec(`UPDATE "User" SET role = 'ADMIN' WHERE role = 'admin'`)
      // Catch-all: any unexpected value → USER
      await exec(`UPDATE "User" SET role = 'USER' WHERE role NOT IN ('USER', 'TBN_STAFF', 'ADMIN')`)

      // 3c. ⚠️ KEY FIX: Drop the old DEFAULT before type conversion!
      //     The old default 'viewer' (text) can't be cast to the "Role" enum,
      //     which causes ALTER TABLE ... TYPE to fail silently.
      console.log('[Pre-migrate]   Dropping old default...')
      try {
        await exec(`ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT`)
      } catch (e) {
        console.log(`[Pre-migrate]   (No default to drop: ${e.message})`)
      }

      // 3d. Convert column type from text to enum
      console.log('[Pre-migrate]   Converting column type...')
      await exec(`ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING role::"Role"`)
      console.log('[Pre-migrate]   Column type converted ✅')

      // 3e. Set new default
      await exec(`ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER'::"Role"`)
      console.log('[Pre-migrate]   New default set ✅')

      console.log('[Pre-migrate] ✅ Role enum conversion complete!')
    }

    // ── Step 4: Upgrade @tbnpr.de users to TBN_STAFF ────────
    console.log('[Pre-migrate] Step 4: Checking TBN staff roles...')
    try {
      // Only if role is already an enum (otherwise the values are text)
      const [roleCheck] = await query(`
        SELECT udt_name FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'role'
      `)
      if (roleCheck?.udt_name === 'Role') {
        const upgraded = await prisma.$executeRawUnsafe(`
          UPDATE "User" SET role = 'TBN_STAFF' 
          WHERE email LIKE '%@tbnpr.de' AND role = 'USER'
        `)
        console.log(`[Pre-migrate]   Upgraded @tbnpr.de users: ${upgraded} rows`)
      }
    } catch (e) {
      console.log(`[Pre-migrate]   Could not upgrade TBN staff: ${e.message}`)
    }

    // ── Step 5: Log current state ───────────────────────────
    console.log('[Pre-migrate] ──── Current DB state ────')
    const users = await query(`SELECT id, email, role FROM "User" ORDER BY email`)
    console.log(`[Pre-migrate] Users (${users.length}):`)
    for (const u of users) {
      console.log(`  ${u.email}: role=${u.role}`)
    }

    const accounts = await query(`SELECT "userId", provider FROM "Account"`)
    console.log(`[Pre-migrate] Accounts (${accounts.length}):`)
    for (const a of accounts) {
      console.log(`  ${a.userId}: ${a.provider}`)
    }

    const tables = await query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `)
    console.log(`[Pre-migrate] Tables: ${tables.map(t => t.table_name).join(', ')}`)

    console.log('[Pre-migrate] ══════════════════════════════════════')
    console.log('[Pre-migrate] ✅ Pre-migration complete!')

  } catch (error) {
    // Fresh install — tables don't exist yet
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.log('[Pre-migrate] Fresh install detected — tables will be created by prisma db push.')
      return
    }
    console.error('[Pre-migrate] ❌ ERROR:', error.message)
    console.error('[Pre-migrate] Code:', error.code)
    console.error('[Pre-migrate] Stack:', error.stack?.split('\n').slice(0, 5).join('\n'))
    // Don't throw — let prisma db push try next
  } finally {
    await prisma.$disconnect()
  }
}

main()
