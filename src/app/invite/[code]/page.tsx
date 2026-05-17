'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Radar, CheckCircle, AlertCircle, Eye, EyeOff, Loader2, Gift } from 'lucide-react'
import Link from 'next/link'

interface InviteInfo {
  valid: boolean
  plan: string
  planName: string
  error?: string
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function checkInvite() {
      try {
        const res = await fetch(`/api/auth/register?inviteCode=${code}`)
        const data = await res.json()
        setInviteInfo(data)
      } catch {
        setInviteInfo({ valid: false, plan: '', planName: '', error: 'Fehler beim Prüfen des Codes' })
      } finally {
        setLoading(false)
      }
    }
    checkInvite()
  }, [code])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, inviteCode: code }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registrierung fehlgeschlagen')
        return
      }

      setSuccess(true)
    } catch {
      setError('Ein Fehler ist aufgetreten')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-radar-50 via-white to-blue-50">
        <Loader2 size={32} className="animate-spin text-radar-600" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-radar-50 via-white to-blue-50">
        <div className="w-full max-w-md p-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Willkommen!</h2>
            <p className="text-gray-600 mb-6">
              Ihr <strong>{inviteInfo?.planName}</strong>-Konto wurde erstellt. Sie können sich jetzt anmelden.
            </p>
            <Link href="/login">
              <Button className="bg-radar-600 hover:bg-radar-700">Zum Login</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!inviteInfo?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-radar-50 via-white to-blue-50">
        <div className="w-full max-w-md p-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Einladung ungültig</h2>
            <p className="text-gray-600 mb-6">
              {inviteInfo?.error || 'Dieser Einladungslink ist ungültig oder abgelaufen.'}
            </p>
            <div className="space-y-2">
              <Link href="/register">
                <Button className="bg-radar-600 hover:bg-radar-700 w-full">Regulär registrieren</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="w-full">Zum Login</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-radar-50 via-white to-blue-50">
      <div className="w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-radar-600 text-white mb-4">
            <Radar size={36} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Einladung</h1>
          <p className="text-gray-500 mt-2">Sie wurden eingeladen</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-6">
          {/* Invite info banner */}
          <div className="flex items-center gap-3 p-4 bg-radar-50 rounded-lg border border-radar-200">
            <Gift size={24} className="text-radar-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-radar-700">
                {inviteInfo.planName}-Plan kostenlos
              </p>
              <p className="text-sm text-radar-600">
                Einladungscode: {code}
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-radar-500 focus:border-radar-500 outline-none"
                placeholder="Max Mustermann"
                required
              />
            </div>
            <div>
              <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-1">
                E-Mail
              </label>
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-radar-500 focus:border-radar-500 outline-none"
                placeholder="ihre@firma.de"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="invite-password" className="block text-sm font-medium text-gray-700 mb-1">
                Passwort
              </label>
              <div className="relative">
                <input
                  id="invite-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-radar-500 focus:border-radar-500 outline-none"
                  placeholder="Mind. 8 Zeichen"
                  required
                  minLength={8}
                  autoComplete="new-password"
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
              disabled={submitting}
            >
              {submitting ? 'Wird erstellt…' : 'Konto erstellen'}
            </Button>
          </form>

          <p className="text-xs text-gray-400 text-center">
            Bereits ein Konto?{' '}
            <Link href="/login" className="text-radar-600 hover:underline">
              Anmelden
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
