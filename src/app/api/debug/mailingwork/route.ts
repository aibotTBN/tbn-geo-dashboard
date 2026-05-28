import { NextResponse } from 'next/server'
import { isMailingworkConfigured, pushLead } from '@/lib/mailingwork'

/**
 * GET /api/debug/mailingwork — Diagnostic endpoint to verify Mailingwork integration.
 * Returns env var status and optionally sends a test lead.
 * 
 * Usage: GET /api/debug/mailingwork?test=1  (sends a test lead)
 *        GET /api/debug/mailingwork          (checks config only)
 * 
 * TODO: Remove or protect this endpoint before public launch.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const runTest = searchParams.get('test') === '1'

  const status: Record<string, any> = {
    configured: isMailingworkConfigured(),
    username_set: !!process.env.MAILINGWORK_USERNAME,
    password_set: !!process.env.MAILINGWORK_PASSWORD,
    username_value: process.env.MAILINGWORK_USERNAME
      ? `${process.env.MAILINGWORK_USERNAME.slice(0, 2)}***`
      : 'NOT SET',
  }

  if (runTest && isMailingworkConfigured()) {
    try {
      const result = await pushLead({
        email: 'viktor-test@tbnpr.de',
        domain: 'test.tbnpr.de',
      })
      status.test_result = result
      status.test_success = result.action !== 'error'
    } catch (err: any) {
      status.test_result = { error: err.message }
      status.test_success = false
    }
  } else if (runTest) {
    status.test_result = 'Cannot test — credentials not configured'
  }

  return NextResponse.json(status)
}
