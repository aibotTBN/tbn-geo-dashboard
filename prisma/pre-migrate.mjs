/**
 * Pre-migration script: brings the database schema in sync with Prisma.
 * 
 * Does EVERYTHING via raw SQL so we don't rely on `prisma db push`.
 * Idempotent — safe to run multiple times.
 * 
 * Runs BEFORE prisma db push in docker-entrypoint.sh.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── Helpers ──────────────────────────────────────────────────────────

async function exec(sql) {
  return prisma.$executeRawUnsafe(sql)
}

async function query(sql) {
  return prisma.$queryRawUnsafe(sql)
}

async function tableExists(name) {
  const [row] = await query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = '${name}'
    ) as "exists"
  `)
  return row?.exists === true
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

async function addColumn(table, column, type, defaultExpr) {
  if (await columnExists(table, column)) return false
  const def = defaultExpr ? ` DEFAULT ${defaultExpr}` : ''
  await exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type}${def}`)
  console.log(`  + ${table}.${column} (${type})`)
  return true
}

async function createIndexIfNotExists(name, table, columns) {
  try {
    await exec(`CREATE INDEX IF NOT EXISTS "${name}" ON "${table}" (${columns})`)
  } catch (e) {
    // Index might already exist with different definition — fine
  }
}

async function createUniqueIndexIfNotExists(name, table, column) {
  try {
    await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "${name}" ON "${table}" ("${column}")`)
  } catch (e) {
    // Already exists — fine
  }
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log('[Pre-migrate] ══════════════════════════════════════')
  console.log('[Pre-migrate] Starting comprehensive pre-migration...')

  try {
    // ── 0. Check if this is a fresh install ──────────────────
    if (!(await tableExists('User'))) {
      console.log('[Pre-migrate] User table not found — fresh install.')
      console.log('[Pre-migrate] prisma db push will create everything.')
      return
    }

    // ── 1. Create enum types ─────────────────────────────────
    console.log('[Pre-migrate] Step 1: Enum types...')
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
    console.log('  ✓ Enums OK')

    // ── 2. Convert role column from text to enum ─────────────
    console.log('[Pre-migrate] Step 2: Role column...')
    const [roleInfo] = await query(`
      SELECT data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'role'
    `)

    if (!roleInfo) {
      console.log('  ⚠️ Role column not found')
    } else if (roleInfo.udt_name === 'Role') {
      console.log('  ✓ Already "Role" enum')
    } else {
      console.log(`  Converting from ${roleInfo.data_type}/${roleInfo.udt_name}...`)

      // Map old values
      await exec(`UPDATE "User" SET role = 'USER' WHERE role = 'viewer'`)
      await exec(`UPDATE "User" SET role = 'TBN_STAFF' WHERE role = 'editor'`)
      await exec(`UPDATE "User" SET role = 'ADMIN' WHERE role = 'admin'`)
      await exec(`UPDATE "User" SET role = 'USER' WHERE role NOT IN ('USER', 'TBN_STAFF', 'ADMIN')`)

      // KEY FIX: Drop old default before type conversion
      try { await exec(`ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT`) } catch (e) { /* no default */ }

      // Convert type
      await exec(`ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING role::"Role"`)
      await exec(`ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER'::"Role"`)
      console.log('  ✓ Converted to enum')
    }

    // ── 3. Add ALL missing User columns ──────────────────────
    console.log('[Pre-migrate] Step 3: User columns...')
    await addColumn('User', 'createdAt',        'TIMESTAMP(3) NOT NULL', 'CURRENT_TIMESTAMP')
    await addColumn('User', 'updatedAt',        'TIMESTAMP(3) NOT NULL', 'CURRENT_TIMESTAMP')
    await addColumn('User', 'passwordHash',     'TEXT',                  null)
    await addColumn('User', 'plan',             '"Plan"',                null)
    await addColumn('User', 'stripeCustomerId', 'TEXT',                  null)
    await addColumn('User', 'stripeSubId',      'TEXT',                  null)
    await addColumn('User', 'planExpiresAt',    'TIMESTAMP(3)',          null)
    await addColumn('User', 'inviteCode',       'TEXT',                  null)
    // Unique constraint on stripeCustomerId
    await createUniqueIndexIfNotExists('User_stripeCustomerId_key', 'User', 'stripeCustomerId')
    console.log('  ✓ User columns OK')

    // ── 4. Add missing Project columns ───────────────────────
    console.log('[Pre-migrate] Step 4: Project columns...')
    if (await tableExists('Project')) {
      await addColumn('Project', 'userId', 'TEXT', null)
      await createIndexIfNotExists('Project_userId_idx', 'Project', '"userId"')
    }
    console.log('  ✓ Project OK')

    // ── 5. Create missing tables ─────────────────────────────
    console.log('[Pre-migrate] Step 5: Missing tables...')

    // PasswordResetToken
    if (!(await tableExists('PasswordResetToken'))) {
      await exec(`
        CREATE TABLE "PasswordResetToken" (
          "id"        TEXT NOT NULL PRIMARY KEY,
          "email"     TEXT NOT NULL,
          "token"     TEXT NOT NULL,
          "expires"   TIMESTAMP(3) NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `)
      await createUniqueIndexIfNotExists('PasswordResetToken_token_key', 'PasswordResetToken', 'token')
      await createIndexIfNotExists('PasswordResetToken_email_idx', 'PasswordResetToken', '"email"')
      console.log('  + Created PasswordResetToken')
    }

    // InviteLink
    if (!(await tableExists('InviteLink'))) {
      await exec(`
        CREATE TABLE "InviteLink" (
          "id"        TEXT NOT NULL PRIMARY KEY,
          "code"      TEXT NOT NULL,
          "plan"      "Plan" NOT NULL,
          "maxUses"   INTEGER NOT NULL DEFAULT 1,
          "usedCount" INTEGER NOT NULL DEFAULT 0,
          "expiresAt" TIMESTAMP(3),
          "note"      TEXT,
          "createdBy" TEXT NOT NULL,
          "active"    BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `)
      await createUniqueIndexIfNotExists('InviteLink_code_key', 'InviteLink', 'code')
      console.log('  + Created InviteLink')
    }

    // WaitlistEntry
    if (!(await tableExists('WaitlistEntry'))) {
      await exec(`
        CREATE TABLE "WaitlistEntry" (
          "id"        TEXT NOT NULL PRIMARY KEY,
          "email"     TEXT NOT NULL,
          "source"    TEXT NOT NULL DEFAULT 'landing_page',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `)
      await createUniqueIndexIfNotExists('WaitlistEntry_email_key', 'WaitlistEntry', 'email')
      console.log('  + Created WaitlistEntry')
    }

    // McpRequest
    if (!(await tableExists('McpRequest'))) {
      await exec(`
        CREATE TABLE "McpRequest" (
          "id"        TEXT NOT NULL PRIMARY KEY,
          "domain"    TEXT NOT NULL,
          "tool"      TEXT NOT NULL,
          "engine"    TEXT NOT NULL DEFAULT 'Unknown',
          "userAgent" TEXT NOT NULL DEFAULT '',
          "sourceIp"  TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `)
      await createIndexIfNotExists('McpRequest_domain_createdAt_idx', 'McpRequest', '"domain", "createdAt"')
      await createIndexIfNotExists('McpRequest_domain_engine_idx', 'McpRequest', '"domain", "engine"')
      console.log('  + Created McpRequest')
    }

    console.log('  ✓ All tables OK')

    // ── 6. Upgrade @tbnpr.de users to TBN_STAFF + specific admins ──
    console.log('[Pre-migrate] Step 6: TBN staff & admin roles...')
    try {
      // All @tbnpr.de users → at least TBN_STAFF
      const upgraded = await exec(`
        UPDATE "User" SET role = 'TBN_STAFF' 
        WHERE email LIKE '%@tbnpr.de' AND role = 'USER'
      `)
      if (upgraded > 0) console.log(`  Upgraded ${upgraded} @tbnpr.de users to TBN_STAFF`)

      // Specific admins
      const admins = await exec(`
        UPDATE "User" SET role = 'ADMIN'
        WHERE email IN ('fuderholz@tbnpr.de', 'kantarci@tbnpr.de')
          AND role != 'ADMIN'
      `)
      if (admins > 0) console.log(`  Promoted ${admins} users to ADMIN`)
    } catch (e) {
      console.log(`  (Could not upgrade: ${e.message})`)
    }

    // ── 7. Verification ──────────────────────────────────────
    console.log('[Pre-migrate] Step 7: Verification...')
    try {
      // Test a typed Prisma query — this is what NextAuth's PrismaAdapter does
      const testUser = await prisma.user.findFirst()
      if (testUser) {
        console.log(`  ✓ Prisma typed query works! (found user: ${testUser.email})`)
      } else {
        console.log('  ✓ Prisma typed query works! (no users found)')
      }
    } catch (verifyError) {
      console.error('  ❌ Prisma typed query FAILED:', verifyError.message)
      console.error('  This means the schema is still out of sync.')
      console.error('  prisma db push must fix the remaining differences.')
    }

    // ── 8. Log state ─────────────────────────────────────────
    const users = await query(`SELECT email, role, plan FROM "User" ORDER BY email`)
    console.log(`[Pre-migrate] Users: ${JSON.stringify(users)}`)

    const tables = await query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `)
    console.log(`[Pre-migrate] Tables: ${tables.map(t => t.table_name).join(', ')}`)

    console.log('[Pre-migrate] ══════════════════════════════════════')
    console.log('[Pre-migrate] ✅ Pre-migration complete!')

  } catch (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.log('[Pre-migrate] Fresh install — prisma db push will create everything.')
      return
    }
    console.error('[Pre-migrate] ❌ ERROR:', error.message)
    console.error('[Pre-migrate] Code:', error.code)
    console.error('[Pre-migrate] Stack:', error.stack?.split('\n').slice(0, 5).join('\n'))
  } finally {
    await prisma.$disconnect()
  }
}

main()
