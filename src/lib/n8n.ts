/**
 * n8n Webhook client for triggering GEO workflows.
 */

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://aibot.tbnpr.net/webhook'

export async function triggerDiagnose(
  domain: string,
  companyName?: string,
  industry?: string,
  coreTopics?: string
) {
  // Triggers WF1: GEO Diagnose (pbH1cm8z3ysa1MAd)
  const resp = await fetch(`${N8N_WEBHOOK_URL}/geo-diagnose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domain,
      company_name: companyName || domain,
      industry: industry || 'B2B',
      core_topics: coreTopics || '',
    }),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`n8n diagnose failed: ${resp.status} ${text}`)
  }
  return resp.json()
}

export async function triggerKnowledgeBuilder(
  domain: string,
  options?: {
    brandName?: string
    industry?: string
    coreTopics?: string
    maxPages?: number
    offset?: number
  }
) {
  // Triggers WF2: Knowledge Builder (coxW7hmhcoeTmYuP)
  // Webhook responds immediately (onReceived), workflow runs in background
  const resp = await fetch(`${N8N_WEBHOOK_URL}/geo-knowledge-builder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domain,
      brand_name: options?.brandName || domain,
      industry: options?.industry || 'B2B',
      core_topics: options?.coreTopics || '',
      max_pages: options?.maxPages || 25,
      offset: options?.offset || 0,
    }),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`n8n knowledge builder failed: ${resp.status} ${text}`)
  }
  // n8n returns { message: "Workflow was started" } with onReceived mode
  return { started: true }
}

export async function queryKnowledgeAPI(tool: string, domain: string) {
  // Calls WF3: Knowledge API (YHKRoWpcFHqAgfLO)
  const resp = await fetch(
    `${N8N_WEBHOOK_URL}/geo-knowledge?tool=${encodeURIComponent(tool)}&domain=${encodeURIComponent(domain)}`,
    { next: { revalidate: 60 } }
  )
  if (!resp.ok) throw new Error(`Knowledge API failed: ${resp.status}`)
  return resp.json()
}
