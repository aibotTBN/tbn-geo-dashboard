'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Radar, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Ein Fehler ist aufgetreten')
      } else {
        setSent(true)
      }
    } catch {
      setError('Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-radar-50 via-white to-blue-50">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-radar-600 text-white mb-4">
            <Radar size={36} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Passwort zurücksetzen</h1>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
              <p className="text-gray-600">
                Falls ein Konto mit der E-Mail <strong>{email}</strong> existiert,
                erhalten Sie einen Link zum Zurücksetzen Ihres Passworts.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-4">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <p className="text-sm text-gray-600 mb-4">
                Geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
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

                <Button
                  type="submit"
                  className="w-full bg-radar-600 hover:bg-radar-700"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? 'Sende…' : 'Link senden'}
                </Button>
              </form>
            </>
          )}

          <div className="mt-4 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft size={14} /> Zurück zum Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
