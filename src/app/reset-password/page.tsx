'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Radar, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-radar-50 via-white to-blue-50">
        <div className="animate-pulse text-gray-400">Laden…</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-radar-50 via-white to-blue-50">
        <div className="w-full max-w-md p-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
            <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Ungültiger Link</h2>
            <p className="text-gray-600 mb-4">
              Dieser Link ist ungültig. Bitte fordern Sie einen neuen an.
            </p>
            <Link href="/forgot-password">
              <Button className="bg-radar-600 hover:bg-radar-700">Neuen Link anfordern</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      return
    }
    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Ein Fehler ist aufgetreten')
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-radar-50 via-white to-blue-50">
        <div className="w-full max-w-md p-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Passwort geändert!</h2>
            <p className="text-gray-600 mb-4">
              Ihr Passwort wurde erfolgreich geändert. Sie können sich jetzt anmelden.
            </p>
            <Link href="/login">
              <Button className="bg-radar-600 hover:bg-radar-700">Zum Login</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-radar-50 via-white to-blue-50">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-radar-600 text-white mb-4">
            <Radar size={36} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Neues Passwort</h1>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-4">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                Neues Passwort
              </label>
              <div className="relative">
                <input
                  id="new-password"
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

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                Passwort bestätigen
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-radar-500 focus:border-radar-500 outline-none"
                placeholder="Passwort wiederholen"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-radar-600 hover:bg-radar-700"
              size="lg"
              disabled={loading}
            >
              {loading ? 'Speichere…' : 'Passwort speichern'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
