"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, Bell, Clock, Mail, MessageSquare, Save, CheckCircle } from "lucide-react"

interface MonitoringSettings {
  monitoringEnabled: boolean
  monitoringInterval: string
  lastDiagnoseAt: string | null
  alertThreshold: number
  alertEmail: string | null
  alertSlack: boolean
}

interface MonitoringConfigProps {
  domain: string
}

export function MonitoringConfig({ domain }: MonitoringConfigProps) {
  const [settings, setSettings] = useState<MonitoringSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/geo/projects/${domain}/monitoring`)
      .then(r => r.json())
      .then(data => {
        setSettings(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [domain])

  const save = async () => {
    if (!settings) return
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/geo/projects/${domain}/monitoring`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading || !settings) return null

  const intervals = [
    { value: "weekly", label: "Wöchentlich", desc: "Jeden Montag" },
    { value: "biweekly", label: "Alle 2 Wochen", desc: "Jeden 2. Montag" },
    { value: "monthly", label: "Monatlich", desc: "Am 1. des Monats" },
  ]

  const lastCheck = settings.lastDiagnoseAt
    ? new Date(settings.lastDiagnoseAt).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Noch nie"

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-500" />
            <CardTitle className="text-lg">Monitoring</CardTitle>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            settings.monitoringEnabled
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-gray-50 text-gray-500 border border-gray-200"
          }`}>
            <div className={`h-1.5 w-1.5 rounded-full ${settings.monitoringEnabled ? "bg-green-500" : "bg-gray-400"}`} />
            {settings.monitoringEnabled ? "Aktiv" : "Inaktiv"}
          </div>
        </div>
        <CardDescription>
          Letzte Prüfung: {lastCheck}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable toggle */}
        <div
          className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setSettings({ ...settings, monitoringEnabled: !settings.monitoringEnabled })}
        >
          <div>
            <p className="text-sm font-medium">Automatisches Monitoring</p>
            <p className="text-xs text-gray-500">Regelmäßige Score-Prüfung aktivieren</p>
          </div>
          <div className={`relative w-10 h-5 rounded-full transition-colors ${
            settings.monitoringEnabled ? "bg-indigo-500" : "bg-gray-300"
          }`}>
            <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              settings.monitoringEnabled ? "translate-x-5" : "translate-x-0.5"
            }`} />
          </div>
        </div>

        {settings.monitoringEnabled && (
          <>
            {/* Interval selector */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Clock className="h-4 w-4" />
                Prüf-Intervall
              </div>
              <div className="grid grid-cols-3 gap-2">
                {intervals.map(iv => (
                  <button
                    key={iv.value}
                    className={`p-2 rounded-lg border text-center transition-colors ${
                      settings.monitoringInterval === iv.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 hover:bg-gray-50 text-gray-600"
                    }`}
                    onClick={() => setSettings({ ...settings, monitoringInterval: iv.value })}
                  >
                    <p className="text-sm font-medium">{iv.label}</p>
                    <p className="text-xs text-gray-400">{iv.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Alert threshold */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Bell className="h-4 w-4" />
                Alert bei Score-Änderung von ≥ {settings.alertThreshold} Punkten
              </div>
              <input
                type="range"
                min="3"
                max="30"
                value={settings.alertThreshold}
                onChange={e => setSettings({ ...settings, alertThreshold: parseInt(e.target.value) })}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>3 (sensibel)</span>
                <span>30 (nur große Änderungen)</span>
              </div>
            </div>

            {/* Alert channels */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Benachrichtigungen</p>
              <div className="space-y-2">
                <div
                  className="flex items-center justify-between p-2 rounded-lg border cursor-pointer hover:bg-gray-50"
                  onClick={() => setSettings({ ...settings, alertSlack: !settings.alertSlack })}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Slack (#geo)</span>
                  </div>
                  <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                    settings.alertSlack ? "bg-indigo-500 border-indigo-500" : "border-gray-300"
                  }`}>
                    {settings.alertSlack && <CheckCircle className="h-3 w-3 text-white" />}
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg border">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <input
                    type="email"
                    placeholder="E-Mail (optional)"
                    value={settings.alertEmail || ""}
                    onChange={e => setSettings({ ...settings, alertEmail: e.target.value || null })}
                    className="flex-1 text-sm bg-transparent outline-none"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Save button */}
        <Button
          onClick={save}
          disabled={saving}
          className="w-full"
          variant={saved ? "outline" : "default"}
        >
          {saved ? (
            <><CheckCircle className="h-4 w-4 mr-2" /> Gespeichert</>
          ) : saving ? (
            "Speichern..."
          ) : (
            <><Save className="h-4 w-4 mr-2" /> Einstellungen speichern</>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
