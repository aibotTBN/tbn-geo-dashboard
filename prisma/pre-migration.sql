-- ============================================================
-- PRE-MIGRATION: Run BEFORE deploying the new schema
-- Converts string role values to match the new Role enum
-- ============================================================
-- 
-- Run this on the PostgreSQL database before deploying:
-- psql $DATABASE_URL -f prisma/pre-migration.sql
--
-- Or via Coolify's database console.
-- ============================================================

-- Step 1: Create the Role enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
        CREATE TYPE "Role" AS ENUM ('USER', 'TBN_STAFF', 'ADMIN');
    END IF;
END$$;

-- Step 2: Create the Plan enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Plan') THEN
        CREATE TYPE "Plan" AS ENUM ('STARTER', 'PRO', 'MANAGED');
    END IF;
END$$;

-- Step 3: Convert existing role string values to enum-compatible values
UPDATE "User" SET role = 'USER' WHERE role = 'viewer';
UPDATE "User" SET role = 'ADMIN' WHERE role = 'admin';
UPDATE "User" SET role = 'TBN_STAFF' WHERE role = 'editor';

-- Step 4: Convert column type from text to enum
-- (Prisma db push will handle this, but doing it explicitly is safer)
ALTER TABLE "User" 
  ALTER COLUMN "role" TYPE "Role" USING role::"Role",
  ALTER COLUMN "role" SET DEFAULT 'USER';

-- Verify
SELECT id, email, role FROM "User";
