/**
 * MCP Analytics Proxy — logs all MCP requests, then forwards to n8n.
 *
 * Route: /api/geo/mcp/[domain]/[tool]
 *
 * External AI agents call this endpoint instead of n8n directly.
 * The .well-known/mcp.json discovery file points here.
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://aibot.tbnpr.net/webhook'

/* ─── Known AI User-Agent patterns ─── */

const AI_ENGINE_PATTERNS: [RegExp, string][] = [
  [/openai|chatgpt|gpt/i, 'OpenAI/ChatGPT'],
  [/claude|anthropic/i, 'Claude/Anthropic'],
  [/gemini|google/i, 'Gemini/Google'],
  [/perplexity/i, 'Perplexity'],
  [/copilot|bing/i, 'Microsoft Copilot'],
  [/cohere/i, 'Cohere'],
  [/mistral/i, 'Mistral'],
]

function detectEngine(userAgent: string): string {
  for (const [pattern, name] of AI_ENGINE_PATTERNS) {
    if (pattern.test(userAgent)) return name
  }
  return 'Unknown'
}

/* ─── Route Handler ─── */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string; tool: string }> }
) {
  const { domain, tool } = await params
  const userAgent = request.headers.get('user-agent') || ''
  const sourceIp = request.headers.get('x-forwarded-for')
    || request.headers.get('x-real-ip')
    || 'unknown'

  // 1. Log the request (fire-and-forget, don't block the response)
  prisma.mcpRequest.create({
    data: {
      domain: decodeURIComponent(domain),
      tool: decodeURIComponent(tool),
      userAgent,
      engine: detectEngine(userAgent),
      sourceIp: sourceIp.split(',')[0].trim(),
    },
  }).catch((err) => {
    console.error('[MCP Analytics] Failed to log request:', err)
  })

  // 2. Forward to n8n Knowledge API
  try {
    const n8nUrl = `${N8N_WEBHOOK_URL}/geo-knowledge?tool=${encodeURIComponent(tool)}&domain=${encodeURIComponent(domain)}`
    const n8nResp = await fetch(n8nUrl, {
      headers: {
        'User-Agent': userAgent,
        'Accept': request.headers.get('accept') || 'application/json',
      },
    })

    if (!n8nResp.ok) {
      const text = await n8nResp.text()
      return NextResponse.json(
        { error: 'Knowledge API error', detail: text },
        { status: n8nResp.status }
      )
    }

    const data = await n8nResp.json()
    return NextResponse.json(data, {
      headers: {
        'X-MCP-Tracked': 'true',
        'Cache-Control': 'public, max-age=60',
      },
    })
  } catch (err) {
    console.error('[MCP Proxy] n8n forward failed:', err)
    return NextResponse.json(
      { error: 'MCP server temporarily unavailable' },
      { status: 502 }
    )
  }
}

/* Also support POST for tool invocations */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string; tool: string }> }
) {
  const { domain, tool } = await params
  const userAgent = request.headers.get('user-agent') || ''
  const sourceIp = request.headers.get('x-forwarded-for')
    || request.headers.get('x-real-ip')
    || 'unknown'

  let bodyText = ''
  try {
    bodyText = await request.text()
  } catch {}

  // Log
  prisma.mcpRequest.create({
    data: {
      domain: decodeURIComponent(domain),
      tool: decodeURIComponent(tool),
      userAgent,
      engine: detectEngine(userAgent),
      sourceIp: sourceIp.split(',')[0].trim(),
    },
  }).catch((err) => {
    console.error('[MCP Analytics] Failed to log request:', err)
  })

  // Forward
  try {
    const n8nUrl = `${N8N_WEBHOOK_URL}/geo-knowledge?tool=${encodeURIComponent(tool)}&domain=${encodeURIComponent(domain)}`
    const n8nResp = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
      },
      body: bodyText,
    })

    if (!n8nResp.ok) {
      const text = await n8nResp.text()
      return NextResponse.json({ error: 'Knowledge API error', detail: text }, { status: n8nResp.status })
    }

    const data = await n8nResp.json()
    return NextResponse.json(data, {
      headers: { 'X-MCP-Tracked': 'true' },
    })
  } catch (err) {
    console.error('[MCP Proxy] n8n forward failed:', err)
    return NextResponse.json({ error: 'MCP server temporarily unavailable' }, { status: 502 })
  }
}
