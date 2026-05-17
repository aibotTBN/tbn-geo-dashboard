/**
 * Email sending via Resend.
 * Requires env vars: RESEND_API_KEY, EMAIL_FROM, NEXTAUTH_URL
 * 
 * Falls back gracefully: if RESEND_API_KEY is not set, logs to console instead.
 */

const RESEND_API_URL = 'https://api.resend.com/emails'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM || 'LLM Radar <noreply@llmradar.de>'

  if (!apiKey) {
    console.log(`[Email] RESEND_API_KEY not configured. Would send to ${to}: ${subject}`)
    return false
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    })

    if (!res.ok) {
      const error = await res.json()
      console.error(`[Email] Failed to send to ${to}:`, error)
      return false
    }

    console.log(`[Email] Sent to ${to}: ${subject}`)
    return true
  } catch (error) {
    console.error(`[Email] Error sending to ${to}:`, error)
    return false
  }
}

// ─── Email Templates ──────────────────────────────────────────────────

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://llmradar.de'
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  return sendEmail({
    to: email,
    subject: 'LLM Radar – Passwort zurücksetzen',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #0f172a; font-size: 24px; margin: 0;">🔍 LLM Radar</h1>
          <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0;">by TBN</p>
        </div>
        <h2 style="color: #1e293b; font-size: 20px;">Passwort zurücksetzen</h2>
        <p style="color: #475569; line-height: 1.6;">
          Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt. Klicken Sie auf den Button, um ein neues Passwort festzulegen:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" 
             style="background-color: #4f46e5; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Passwort zurücksetzen
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
          Dieser Link ist 1 Stunde gültig. Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="color: #cbd5e1; font-size: 11px; text-align: center;">
          LLM Radar by TBN Public Relations GmbH
        </p>
      </div>
    `,
  })
}

export async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://llmradar.de'
  const verifyUrl = `${baseUrl}/api/auth/verify?token=${token}&email=${encodeURIComponent(email)}`

  return sendEmail({
    to: email,
    subject: 'LLM Radar – E-Mail bestätigen',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #0f172a; font-size: 24px; margin: 0;">🔍 LLM Radar</h1>
          <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0;">by TBN</p>
        </div>
        <h2 style="color: #1e293b; font-size: 20px;">E-Mail bestätigen</h2>
        <p style="color: #475569; line-height: 1.6;">
          Willkommen bei LLM Radar! Bitte bestätigen Sie Ihre E-Mail-Adresse:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}" 
             style="background-color: #4f46e5; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            E-Mail bestätigen
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
          Dieser Link ist 24 Stunden gültig.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="color: #cbd5e1; font-size: 11px; text-align: center;">
          LLM Radar by TBN Public Relations GmbH
        </p>
      </div>
    `,
  })
}

export async function sendWelcomeEmail(email: string, name: string | null, plan: string): Promise<boolean> {
  const planNames: Record<string, string> = { STARTER: 'Starter', PRO: 'Pro', MANAGED: 'Managed' }
  const planName = planNames[plan] || plan

  return sendEmail({
    to: email,
    subject: `Willkommen bei LLM Radar – ${planName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #0f172a; font-size: 24px; margin: 0;">🔍 LLM Radar</h1>
          <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0;">by TBN</p>
        </div>
        <h2 style="color: #1e293b; font-size: 20px;">Willkommen${name ? `, ${name}` : ''}! 🎉</h2>
        <p style="color: #475569; line-height: 1.6;">
          Ihr <strong>${planName}</strong>-Konto ist eingerichtet. Sie können jetzt mit LLM Radar Ihre KI-Sichtbarkeit analysieren und verbessern.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.NEXTAUTH_URL || 'https://llmradar.de'}/dashboard" 
             style="background-color: #4f46e5; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Zum Dashboard
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="color: #cbd5e1; font-size: 11px; text-align: center;">
          LLM Radar by TBN Public Relations GmbH
        </p>
      </div>
    `,
  })
}
