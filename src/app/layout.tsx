import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { AuthSessionProvider } from '@/components/providers/session-provider'
import { CookieBanner } from '@/components/cookie-banner'

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
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-RSPTTB8D12"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-RSPTTB8D12');
          `}
        </Script>
        {/* Meta Pixel */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '25388119420886052');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=25388119420886052&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <AuthSessionProvider>
          {children}
          <CookieBanner />
        </AuthSessionProvider>
      </body>
    </html>
  )
}
