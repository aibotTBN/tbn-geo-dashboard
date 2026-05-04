import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthSessionProvider } from '@/components/providers/session-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LLM Radar — Wie sichtbar ist Ihr Unternehmen für KI?',
  description: 'Messen Sie Ihre Sichtbarkeit in ChatGPT, Gemini und Claude. LLM Radar analysiert Ihre Website, bewertet Ihre KI-Reputation und baut ein strukturiertes Knowledge Layer auf.',
  keywords: ['GEO', 'Generative Engine Optimization', 'KI-Sichtbarkeit', 'ChatGPT', 'LLM', 'B2B Marketing', 'Schema Markup', 'Knowledge Builder'],
  openGraph: {
    title: 'LLM Radar — Wie sichtbar ist Ihr Unternehmen für KI?',
    description: 'Messen Sie Ihre KI-Sichtbarkeit in ChatGPT, Gemini & Claude. Kostenlose Analyse starten.',
    type: 'website',
    url: 'https://llmradar.de',
    siteName: 'LLM Radar',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LLM Radar — KI-Sichtbarkeit messen und managen',
    description: 'Wie gut kennen KI-Assistenten Ihr Unternehmen? Finden Sie es heraus.',
  },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  )
}
