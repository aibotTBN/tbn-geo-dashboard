'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Radar, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-radar-50 via-white to-blue-50">
        <div className="animate-pulse text-gray-400">Laden…</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}

const PLANS = [
  {
    id: 'STARTER',
    name: 'Starter',
    price: '€99',
    period: '/Monat',
    features: [
      'Bis zu 3 Projekte',
      '5 Diagnosen/Monat',
      'LLM-Antworten im Klartext',
      'Google Readiness Check',
      'Wettbewerber-Analyse (3)',
    ],
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: '€499',
    period: '/Monat',
    popular: true,
    features: [
      'Unbegrenzte Projekte',
      'Unbegrenzte Diagnosen',
      'Knowledge Builder + Editing',
      'Export (Schema.org, llms.txt, MCP)',
      'Monitoring + Alerts',
      'MCP-Server + Analytics',
      'Wettbewerber-Analyse (10)',
    ],
  },
]

function RegisterForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const preselectedPlan = searchParams.get('plan')?.toUpperCase() || ''
  const checkoutCancelled = searchParams.get('checkout') === 'cancelled'

  const [step, setStep] = useState<'plan' | 'details' | 'success' | 'redirecting'>('plan')
  const [selectedPlan, setSelectedPlan] = useState(preselectedPlan || '')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(checkoutCancelled ? 'Zahlung abgebrochen. Bitte erneut versuchen.' : '')

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPlan) {
      setError('Bitte wählen Sie einen Plan')
      return
    }
    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Step 1: Create account
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, plan: selectedPlan }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registrierung fehlgeschlagen')
        setLoading(false)
        return
      }

      // Step 2: If Stripe checkout is required, redirect to Stripe
      if (data.requiresStripeCheckout && data.userId) {
        setStep('redirecting')

        const checkoutRes = await fetch('/api/stripe/checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan: data.selectedPlan || selectedPlan,
            userId: data.userId,
          }),
        })

        const checkoutData = await checkoutRes.json()

        if (checkoutRes.ok && checkoutData.url) {
          // Redirect to Stripe Checkout
          window.location.href = checkoutData.url
          return
        } else {
          // Stripe checkout creation failed — show success with email verification
          console.error('[Register] Stripe checkout failed:', checkoutData.error)
          setStep('success')
          setLoading(false)
          return
        }
      }

      // No Stripe required (invite code or Stripe not configured)
      setStep('success')
    } catch {
      setError('Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'redirecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-radar-50 via-white to-blue-50">
        <div className="w-full max-w-md p-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
            <Loader2 size={48} className="animate-spin text-radar-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Weiterleitung zur Zahlung…</h2>
            <p className="text-gray-600">
              Sie werden zu unserem Zahlungsanbieter Stripe weitergeleitet.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-radar-50 via-white to-blue-50">
        <div className="w-full max-w-md p-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Fast geschafft!</h2>
            <p className="text-gray-600 mb-6">
              Wir haben Ihnen eine E-Mail an <strong>{email}</strong> gesendet.
              Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihr Konto zu aktivieren.
            </p>
            <Link href="/login">
              <Button className="bg-radar-600 hover:bg-radar-700">
                Zum Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-radar-50 via-white to-blue-50 py-12">
      <div className="w-full max-w-2xl px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-radar-600 text-white mb-4">
            <Radar size={36} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Konto erstellen</h1>
          <p className="text-gray-500 mt-2">
            {step === 'plan' ? 'Wählen Sie Ihren Plan' : 'Ihre Kontodaten'}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-6 max-w-md mx-auto">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>
              {error}
              {error.includes('existiert bereits') && (
                <>
                  {' '}
                  <Link href="/login" className="font-medium underline hover:text-red-800">
                    Jetzt anmelden →
                  </Link>
                </>
              )}
            </span>
          </div>
        )}

        {step === 'plan' ? (
          <>
            {/* Plan selection */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {PLANS.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative text-left p-6 rounded-xl border-2 transition-all ${
                    selectedPlan === plan.id
                      ? 'border-radar-600 bg-radar-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-4 px-3 py-1 text-xs font-semibold bg-radar-600 text-white rounded-full">
                      Empfohlen
                    </span>
                  )}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-gray-500">{plan.period}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">zzgl. 19% MwSt. · monatlich kündbar</p>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            <div className="text-center space-y-3">
              <Button
                onClick={() => {
                  if (!selectedPlan) {
                    setError('Bitte wählen Sie einen Plan')
                    return
                  }
                  setError('')
                  setStep('details')
                }}
                className="bg-radar-600 hover:bg-radar-700"
                size="lg"
              >
                Weiter
              </Button>
              <p className="text-sm text-gray-500">
                <strong>Managed-Plan</strong> ab €799/Monat?{' '}
                <a href="mailto:geo@tbnpr.de" className="text-radar-600 hover:underline">
                  Kontakt aufnehmen
                </a>
              </p>
              <p className="text-sm text-gray-500">
                Bereits ein Konto?{' '}
                <Link href="/login" className="text-radar-600 hover:underline font-medium">
                  Anmelden
                </Link>
              </p>
            </div>
          </>
        ) : (
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setStep('plan')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              <ArrowLeft size={16} /> Zurück zur Plan-Auswahl
            </button>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              {/* Selected plan badge */}
              <div className="flex items-center justify-between mb-6 p-3 bg-radar-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Gewählter Plan</p>
                  <p className="font-bold text-radar-700">
                    {PLANS.find((p) => p.id === selectedPlan)?.name} —{' '}
                    {PLANS.find((p) => p.id === selectedPlan)?.price}/Monat
                  </p>
                </div>
                <button onClick={() => setStep('plan')} className="text-sm text-radar-600 hover:underline">
                  Ändern
                </button>
              </div>

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
                  <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-Mail
                  </label>
                  <input
                    id="reg-email"
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
                  <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Passwort
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
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
                  <p className="text-xs text-gray-400 mt-1">Mindestens 8 Zeichen</p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-radar-600 hover:bg-radar-700"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? 'Konto wird erstellt…' : 'Weiter zur Zahlung'}
                </Button>

                <p className="text-xs text-gray-400 text-center">
                  Mit der Registrierung akzeptieren Sie unsere{' '}
                  <a href="/agb" target="_blank" rel="noopener" className="underline">
                    AGB
                  </a>{' '}
                  und{' '}
                  <a href="/datenschutz" target="_blank" rel="noopener" className="underline">
                    Datenschutzerklärung
                  </a>
                  . Die Zahlung erfolgt sicher über Stripe.
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
