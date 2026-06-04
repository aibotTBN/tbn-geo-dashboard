import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kostenlose GEO-Analyse — LLM Radar',
  description: 'Was sagt KI über Ihr Unternehmen? Kostenlose Analyse Ihrer Sichtbarkeit in ChatGPT, Claude, Gemini & Perplexity. Ergebnis in 60 Sekunden.',
  openGraph: {
    title: 'Kostenlose GEO-Analyse — LLM Radar',
    description: 'Was sagt KI über Ihr Unternehmen? Finden Sie es kostenlos heraus.',
    type: 'website',
    url: 'https://llmradar.de/kostenlos',
    siteName: 'LLM Radar',
  },
  robots: { index: true, follow: true },
}

export default function KostenlosLayout({ children }: { children: React.ReactNode }) {
  return children
}
