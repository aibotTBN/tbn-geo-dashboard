import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Datenschutz — LLM Radar',
  description: 'Datenschutzerklärung für LLM Radar',
}

/**
 * Redirect to TBN's privacy policy until a standalone LLM Radar
 * privacy policy page is created.
 */
export default function DatenschutzPage() {
  redirect('https://tbnpr.de/datenschutzerklaerung')
}
