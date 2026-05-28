/**
 * Mailingwork API Integration
 * 
 * Pushes leads (Interessenten) and customers (Kunden) to Mailingwork Liste 25.
 * Uses the JSON API endpoint with form-encoded POST requests.
 * 
 * Field IDs:
 *   1  = E-Mail
 *   3  = Vorname
 *   4  = Nachname
 *   9  = Unternehmen
 *   154 = Quelle
 *   171 = Status (enum: interessent, kunde)
 *   173 = Domain
 */

const MW_API_BASE = 'https://webservice.mailingwork.de/webservice/webservice/json/'
const MW_LIST_ID = 25

// Field IDs
const FIELD = {
  EMAIL: '1',
  VORNAME: '3',
  NACHNAME: '4',
  UNTERNEHMEN: '9',
  QUELLE: '154',
  STATUS: '171',
  DOMAIN: '173',
} as const

interface MailingworkResponse {
  error: number
  message: string
  result: any
}

/**
 * Check if Mailingwork credentials are configured.
 */
export function isMailingworkConfigured(): boolean {
  return !!(process.env.MAILINGWORK_USERNAME && process.env.MAILINGWORK_PASSWORD)
}

async function mwCall(fn: string, params: Record<string, string>): Promise<MailingworkResponse> {
  const username = process.env.MAILINGWORK_USERNAME
  const password = process.env.MAILINGWORK_PASSWORD

  if (!username || !password) {
    console.error('[Mailingwork] ❌ MAILINGWORK_USERNAME or MAILINGWORK_PASSWORD not set in env — skipping API call')
    return { error: -1, message: 'Not configured', result: null }
  }

  // Build form-encoded body (same format as PHP-style form params)
  const allParams: Record<string, string> = {
    username,
    password,
    ...params,
  }

  // Use manual encoding to ensure brackets are NOT double-encoded
  const bodyParts: string[] = []
  for (const [key, value] of Object.entries(allParams)) {
    bodyParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  }
  const bodyStr = bodyParts.join('&')

  console.log(`[Mailingwork] Calling ${fn} with ${Object.keys(params).length} params`)

  const resp = await fetch(`${MW_API_BASE}${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: bodyStr,
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    console.error(`[Mailingwork] HTTP ${resp.status} for ${fn}: ${text.slice(0, 200)}`)
    return { error: -1, message: `HTTP ${resp.status}`, result: null }
  }

  const json = await resp.json() as MailingworkResponse
  if (json.error !== 0) {
    console.warn(`[Mailingwork] ${fn} returned error ${json.error}: ${json.message}`)
  }
  return json
}

/**
 * Push a lead (Interessent) to Mailingwork Liste 25.
 * Called after a free GEO-Check is submitted.
 */
export async function pushLead(data: {
  email: string
  domain: string
  name?: string
}) {
  try {
    const fields: Record<string, string> = {
      [FIELD.EMAIL]: data.email,
      [FIELD.DOMAIN]: data.domain,
      [FIELD.STATUS]: 'interessent',
      [FIELD.QUELLE]: 'GEO-Check',
    }

    if (data.name) {
      // Split name into first/last if possible
      const parts = data.name.trim().split(/\s+/)
      if (parts.length >= 2) {
        fields[FIELD.VORNAME] = parts[0]
        fields[FIELD.NACHNAME] = parts.slice(1).join(' ')
      } else {
        fields[FIELD.VORNAME] = parts[0]
      }
    }

    // Check if recipient already exists
    const existing = await mwCall('GetRecipientIdByEmail', {
      email: data.email,
      listId: String(MW_LIST_ID),
    })

    if (existing.error === 0 && existing.result) {
      // Already exists — update domain if provided, but don't overwrite status
      // (they might already be a Kunde)
      const recipientId = String(existing.result)
      const currentData = await mwCall('GetRecipientById', {
        recipientId,
        fieldIds: FIELD.STATUS,
      })

      const currentStatus = currentData.result?.[FIELD.STATUS]
      if (currentStatus === 'kunde') {
        // Don't downgrade a Kunde back to Interessent
        console.log(`[Mailingwork] ${data.email} is already a Kunde — skipping status update`)
        // Still update domain if it's a new check
        await mwCall('UpdateRecipient', {
          recipientId,
          [`fields[${FIELD.DOMAIN}]`]: data.domain,
        })
        return { action: 'skipped_kunde', recipientId }
      }

      // Update existing Interessent with latest data
      const updateParams: Record<string, string> = { recipientId }
      for (const [k, v] of Object.entries(fields)) {
        if (k !== FIELD.EMAIL) { // Can't update email
          updateParams[`fields[${k}]`] = v
        }
      }
      const updateResult = await mwCall('UpdateRecipient', updateParams)
      console.log(`[Mailingwork] Updated lead ${data.email} (ID: ${recipientId}): ${updateResult.message}`)
      return { action: 'updated', recipientId }
    }

    // New recipient — create
    const createParams: Record<string, string> = {
      listId: String(MW_LIST_ID),
    }
    for (const [k, v] of Object.entries(fields)) {
      createParams[`fields[${k}]`] = v
    }
    const createResult = await mwCall('CreateRecipient', createParams)

    if (createResult.error === 0) {
      console.log(`[Mailingwork] Created lead ${data.email} (ID: ${createResult.result})`)
      return { action: 'created', recipientId: createResult.result }
    } else {
      console.error(`[Mailingwork] Failed to create lead ${data.email}: ${createResult.message}`)
      return { action: 'error', error: createResult.message }
    }
  } catch (err) {
    console.error('[Mailingwork] pushLead error:', err)
    return { action: 'error', error: String(err) }
  }
}

/**
 * Push a customer (Kunde) to Mailingwork Liste 25.
 * Called after successful Stripe checkout.
 * If the user was already an Interessent, updates their status to Kunde.
 */
export async function pushCustomer(data: {
  email: string
  name?: string
  domain?: string
}) {
  try {
    const fields: Record<string, string> = {
      [FIELD.EMAIL]: data.email,
      [FIELD.STATUS]: 'kunde',
      [FIELD.QUELLE]: 'Stripe',
    }

    if (data.name) {
      const parts = data.name.trim().split(/\s+/)
      if (parts.length >= 2) {
        fields[FIELD.VORNAME] = parts[0]
        fields[FIELD.NACHNAME] = parts.slice(1).join(' ')
      } else {
        fields[FIELD.VORNAME] = parts[0]
      }
    }

    if (data.domain) {
      fields[FIELD.DOMAIN] = data.domain
    }

    // Check if recipient already exists (likely an Interessent from GEO-Check)
    const existing = await mwCall('GetRecipientIdByEmail', {
      email: data.email,
      listId: String(MW_LIST_ID),
    })

    if (existing.error === 0 && existing.result) {
      // Exists — upgrade status to Kunde
      const recipientId = String(existing.result)
      const updateParams: Record<string, string> = { recipientId }
      for (const [k, v] of Object.entries(fields)) {
        if (k !== FIELD.EMAIL) {
          updateParams[`fields[${k}]`] = v
        }
      }
      const updateResult = await mwCall('UpdateRecipient', updateParams)
      console.log(`[Mailingwork] Upgraded ${data.email} to Kunde (ID: ${recipientId}): ${updateResult.message}`)
      return { action: 'upgraded', recipientId }
    }

    // New recipient — create directly as Kunde
    const createParams: Record<string, string> = {
      listId: String(MW_LIST_ID),
    }
    for (const [k, v] of Object.entries(fields)) {
      createParams[`fields[${k}]`] = v
    }
    const createResult = await mwCall('CreateRecipient', createParams)

    if (createResult.error === 0) {
      console.log(`[Mailingwork] Created customer ${data.email} (ID: ${createResult.result})`)
      return { action: 'created', recipientId: createResult.result }
    } else {
      console.error(`[Mailingwork] Failed to create customer ${data.email}: ${createResult.message}`)
      return { action: 'error', error: createResult.message }
    }
  } catch (err) {
    console.error('[Mailingwork] pushCustomer error:', err)
    return { action: 'error', error: String(err) }
  }
}
