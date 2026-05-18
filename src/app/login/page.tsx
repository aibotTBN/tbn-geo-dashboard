'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Radar, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-radar-50 via-white to-blue-50">
        <div className="animate-pulse text-gray-400">Laden…</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const errorParam = searchParams.get('error')
  const verifiedParam = searchParams.get('verified')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const errorMessages: Record<string, string> = {
    CredentialsSignin: 'Ungültige Anmeldedaten',
    OAuthAccountNotLinked: 'Diese E-Mail ist bereits mit einem anderen Login verknüpft',
    OAuthCallback: 'Fehler bei der Google-Authentifizierung',
    OAuthCreateAccount: 'Konto konnte nicht erstellt werden',
    OAuthSignin: 'Google-Anmeldung fehlgeschlagen',
    Callback: 'Authentifizierungsfehler',
    Default: 'Ein Fehler ist aufgetreten',
    'invalid-verification': 'Ungültiger Bestätigungslink',
    'verification-expired': 'Der Bestätigungslink ist abgelaufen. Bitte registrieren Sie sich erneut.',
    'verification-failed': 'E-Mail-Bestätigung fehlgeschlagen. Bitte versuchen Sie es erneut.',
  }

  const [error, setError] = useState(
    errorParam
      ? errorMessages[errorParam] || `Fehler: ${errorParam}`
      : ''
  )

  async function handleCredentialsLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl,
    })

    if (result?.error) {
      setError(result.error === 'CredentialsSignin' ? 'Ungültige Anmeldedaten' : result.error)
      setLoading(false)
    } else if (result?.url) {
      window.location.href = result.url
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-radar-50 via-white to-blue-50">
      <div className="w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-radar-600 text-white mb-4">
            <Radar size={36} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">LLM Radar</h1>
          <p className="text-gray-500 mt-2">KI-Sichtbarkeit managen</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-6">
          {/* Verification success message */}
          {verifiedParam === 'true' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
              <CheckCircle2 size={16} />
              E-Mail erfolgreich bestätigt! Sie können sich jetzt anmelden.
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Email + Password */}
          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-Mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-radar-500 focus:border-radar-500 outline-none"
                placeholder="ihre@email.de"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Passwort
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-radar-500 focus:border-radar-500 outline-none"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-radar-600 hover:bg-radar-700"
              size="lg"
              disabled={loading}
            >
              {loading ? 'Anmelden…' : 'Anmelden'}
            </Button>
          </form>

          {/* Links */}
          <div className="flex items-center justify-between text-sm">
            <Link href="/register" className="text-radar-600 hover:text-radar-700 font-medium">
              Konto erstellen
            </Link>
            <Link href="/forgot-password" className="text-gray-500 hover:text-gray-700">
              Passwort vergessen?
            </Link>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-gray-400">TBN-Mitarbeiter</span>
            </div>
          </div>

          {/* Google Login (TBN only) */}
          <Button
            onClick={() => signIn('google', { callbackUrl })}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Mit Google anmelden
          </Button>
          <p className="text-xs text-gray-400 text-center">
            Nur für Mitarbeiter mit @tbnpr.de E-Mail
          </p>
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">
          © {new Date().getFullYear()} TBN Public Relations GmbH
        </p>
      </div>
    </div>
  )
}
