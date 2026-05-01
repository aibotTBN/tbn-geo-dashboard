import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// One-time setup endpoint to create database tables
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const statements = [
    `CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "name" TEXT,
      "email" TEXT UNIQUE,
      "emailVerified" TIMESTAMP(3),
      "image" TEXT,
      "role" TEXT NOT NULL DEFAULT 'viewer'
    )`,
    `CREATE TABLE IF NOT EXISTS "Account" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "userId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "provider" TEXT NOT NULL,
      "providerAccountId" TEXT NOT NULL,
      "refresh_token" TEXT,
      "access_token" TEXT,
      "expires_at" INTEGER,
      "token_type" TEXT,
      "scope" TEXT,
      "id_token" TEXT,
      "session_state" TEXT,
      CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId")`,
    `CREATE TABLE IF NOT EXISTS "Session" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "sessionToken" TEXT NOT NULL UNIQUE,
      "userId" TEXT NOT NULL,
      "expires" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "VerificationToken" (
      "identifier" TEXT NOT NULL,
      "token" TEXT NOT NULL UNIQUE,
      "expires" TIMESTAMP(3) NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token")`,
    `CREATE TABLE IF NOT EXISTS "Project" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "domain" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "Diagnosis" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "projectId" TEXT NOT NULL,
      "score" INTEGER NOT NULL,
      "scoreCitation" INTEGER NOT NULL,
      "scoreTech" INTEGER NOT NULL,
      "scoreSchema" INTEGER NOT NULL,
      "scoreContent" INTEGER NOT NULL,
      "scoreFresh" INTEGER NOT NULL,
      "reportJson" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Diagnosis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
  ]

  const results: string[] = []
  try {
    for (const sql of statements) {
      await prisma.$executeRawUnsafe(sql)
      results.push('OK')
    }
    return NextResponse.json({ success: true, message: 'All tables created', results })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message, 
      completed: results.length,
      total: statements.length 
    }, { status: 500 })
  }
}
