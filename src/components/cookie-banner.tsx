'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Cookie, X } from 'lucide-react'

/**
 * GDPR-compliant cookie consent banner.
 * 
 * LLM Radar uses:
 * - Essential cookies: NextAuth session (strictly necessary, no consent needed)
 * - Stripe: payment processing cookies (strictly necessary for checkout)
 * 
 * No analytics/marketing cookies are currently used.
 * If Google Analytics or tracking is added later, this banner needs an "accept/reject" split.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Check if user already acknowledged cookies
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      // Delay showing to avoid layout shift on first paint
      const timer = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  function handleAccept() {
    localStorage.setItem('cookie-consent', 'accepted')
    setVisible(false)
  }

  function handleDismiss() {
    localStorage.setItem('cookie-consent', 'dismissed')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-in slide-in-from-bottom duration-500">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-2xl border border-gray-200 p-4 md:p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Cookie size={20} className="text-radar-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 leading-relaxed">
              Diese Website verwendet ausschließlich <strong>technisch notwendige Cookies</strong> für 
              Authentifizierung und Zahlungsabwicklung. Es werden keine Tracking- oder Marketing-Cookies eingesetzt.
            </p>
            <p className="text-xs text-gray-400 mt-1.5">
              Mehr dazu in unserer{' '}
              <a
                href="https://tbnpr.de/datenschutzerklaerung"
                target="_blank"
                rel="noopener"
                className="underline hover:text-gray-600"
              >
                Datenschutzerklärung
              </a>
              .
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={handleAccept}
              size="sm"
              className="bg-radar-600 hover:bg-radar-700 text-xs"
            >
              Verstanden
            </Button>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 p-1"
              aria-label="Schließen"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
