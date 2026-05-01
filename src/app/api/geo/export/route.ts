import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { queryKnowledgeAPI } from '@/lib/n8n'
import { queryTable, ENTITY_TYPES } from '@/lib/baserow'

// GET: Generate llms.txt or mcp.json for a domain
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const domain = searchParams.get('domain')
  const format = searchParams.get('format') || 'llms.txt'

  if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

  try {
    if (format === 'mcp.json') {
      const mcpConfig = {
        schema_version: '1.0',
        server_name: `${domain} Knowledge Server`,
        server_description: `Structured knowledge about ${domain}`,
        url: `https://aibot.tbnpr.net/webhook/geo-knowledge`,
        tools: [
          { name: 'get_company_info', description: `Get company info for ${domain}`, parameters: { domain: { type: 'string', default: domain } } },
          { name: 'get_services', description: `Get services offered by ${domain}`, parameters: { domain: { type: 'string', default: domain } } },
          { name: 'get_faq', description: `Get FAQ from ${domain}`, parameters: { domain: { type: 'string', default: domain } } },
          { name: 'get_team', description: `Get team members from ${domain}`, parameters: { domain: { type: 'string', default: domain } } },
          { name: 'get_blog_posts', description: `Get blog posts from ${domain}`, parameters: { domain: { type: 'string', default: domain } } },
          { name: 'get_case_studies', description: `Get case studies from ${domain}`, parameters: { domain: { type: 'string', default: domain } } },
          { name: 'get_statistics', description: `Get statistics from ${domain}`, parameters: { domain: { type: 'string', default: domain } } },
          { name: 'get_events', description: `Get events from ${domain}`, parameters: { domain: { type: 'string', default: domain } } },
          { name: 'search_knowledge', description: `Search knowledge base of ${domain}`, parameters: { domain: { type: 'string', default: domain }, query: { type: 'string' } } },
        ],
      }
      return NextResponse.json(mcpConfig)
    }

    // Generate llms.txt
    const lines: string[] = [
      `# ${domain}`,
      `> Structured knowledge for LLM consumption`,
      ``,
      `## Knowledge API`,
      `Base URL: https://aibot.tbnpr.net/webhook/geo-knowledge`,
      ``,
    ]

    for (const type of ENTITY_TYPES) {
      const { rows } = await queryTable(type.tableId, { domain, size: 100 })
      if (rows.length === 0) continue
      lines.push(`## ${type.label} (${rows.length})`)
      for (const row of rows.slice(0, 10)) {
        const name = row.name || row.question || row.title || row.organization_name || ''
        if (name) lines.push(`- ${name}`)
      }
      if (rows.length > 10) lines.push(`- ... und ${rows.length - 10} weitere`)
      lines.push('')
    }

    return new NextResponse(lines.join('\n'), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
