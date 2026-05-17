'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Link2,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  Crown,
} from 'lucide-react'

interface UserInfo {
  id: string
  name: string | null
  email: string | null
  role: string
  plan: string | null
  planExpiresAt: string | null
  inviteCode: string | null
  emailVerified: string | null
  createdAt: string
  _count: { projects: number }
}

interface InviteInfo {
  id: string
  code: string
  plan: string
  maxUses: number
  usedCount: number
  expiresAt: string | null
  note: string | null
  active: boolean
  createdAt: string
}

const PLAN_COLORS: Record<string, string> = {
  STARTER: 'bg-blue-100 text-blue-700',
  PRO: 'bg-purple-100 text-purple-700',
  MANAGED: 'bg-amber-100 text-amber-700',
}

const ROLE_COLORS: Record<string, string> = {
  USER: 'bg-gray-100 text-gray-600',
  TBN_STAFF: 'bg-radar-100 text-radar-700',
  ADMIN: 'bg-red-100 text-red-700',
}

export default function AdminPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const [tab, setTab] = useState<'users' | 'invites'>('users')
  const [users, setUsers] = useState<UserInfo[]>([])
  const [invites, setInvites] = useState<InviteInfo[]>([])
  const [loading, setLoading] = useState(true)

  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [invitePlan, setInvitePlan] = useState('PRO')
  const [inviteMaxUses, setInviteMaxUses] = useState(1)
  const [inviteExpDays, setInviteExpDays] = useState(30)
  const [inviteNote, setInviteNote] = useState('')
  const [inviteCustomCode, setInviteCustomCode] = useState('')
  const [createdInviteUrl, setCreatedInviteUrl] = useState('')
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)

  // Restrict to TBN_STAFF and ADMIN
  if (role !== 'TBN_STAFF' && role !== 'ADMIN') {
    redirect('/dashboard')
  }

  useEffect(() => {
    fetchData()
  }, [tab])

  async function fetchData() {
    setLoading(true)
    try {
      if (tab === 'users') {
        const res = await fetch('/api/admin/users')
        const data = await res.json()
        setUsers(Array.isArray(data) ? data : [])
      } else {
        const res = await fetch('/api/admin/invites')
        const data = await res.json()
        setInvites(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function updateUser(userId: string, updates: Record<string, any>) {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...updates }),
    })
    fetchData()
  }

  async function deleteUser(userId: string) {
    if (!confirm('Benutzer wirklich löschen? Alle Projekte werden entfernt.')) return
    await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' })
    fetchData()
  }

  async function createInvite() {
    setCreating(true)
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: invitePlan,
          maxUses: inviteMaxUses,
          expiresInDays: inviteExpDays || null,
          note: inviteNote || null,
          customCode: inviteCustomCode || null,
        }),
      })
      const data = await res.json()
      if (data.inviteUrl) {
        setCreatedInviteUrl(data.inviteUrl)
        fetchData()
      }
    } finally {
      setCreating(false)
    }
  }

  async function toggleInvite(id: string, active: boolean) {
    await fetch('/api/admin/invites', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active }),
    })
    fetchData()
  }

  async function deleteInvite(id: string) {
    if (!confirm('Einladungslink wirklich löschen?')) return
    await fetch(`/api/admin/invites?id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Header title="Admin" />
      <div className="p-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={tab === 'users' ? 'default' : 'outline'}
            onClick={() => setTab('users')}
            className={tab === 'users' ? 'bg-radar-600 hover:bg-radar-700' : ''}
          >
            <Users size={16} className="mr-2" /> Benutzer
          </Button>
          <Button
            variant={tab === 'invites' ? 'default' : 'outline'}
            onClick={() => setTab('invites')}
            className={tab === 'invites' ? 'bg-radar-600 hover:bg-radar-700' : ''}
          >
            <Link2 size={16} className="mr-2" /> Einladungen
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-radar-600" />
          </div>
        ) : tab === 'users' ? (
          /* Users Tab */
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield size={20} /> Benutzer ({users.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">E-Mail</th>
                      <th className="py-2 px-3">Rolle</th>
                      <th className="py-2 px-3">Plan</th>
                      <th className="py-2 px-3">Projekte</th>
                      <th className="py-2 px-3">Registriert</th>
                      <th className="py-2 px-3">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3 font-medium">{user.name || '–'}</td>
                        <td className="py-2 px-3 text-gray-600">{user.email}</td>
                        <td className="py-2 px-3">
                          <Badge className={ROLE_COLORS[user.role] || ''}>{user.role}</Badge>
                        </td>
                        <td className="py-2 px-3">
                          {user.plan ? (
                            <Badge className={PLAN_COLORS[user.plan] || ''}>{user.plan}</Badge>
                          ) : (
                            <span className="text-gray-400">–</span>
                          )}
                        </td>
                        <td className="py-2 px-3">{user._count.projects}</td>
                        <td className="py-2 px-3 text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString('de-DE')}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex gap-1">
                            <select
                              className="text-xs border rounded px-1 py-0.5"
                              value={user.plan || ''}
                              onChange={(e) =>
                                updateUser(user.id, { plan: e.target.value || null })
                              }
                            >
                              <option value="">Kein Plan</option>
                              <option value="STARTER">Starter</option>
                              <option value="PRO">Pro</option>
                              <option value="MANAGED">Managed</option>
                            </select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-700"
                              onClick={() => deleteUser(user.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Invites Tab */
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Crown size={20} /> Einladungslinks
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => {
                    setShowInviteForm(!showInviteForm)
                    setCreatedInviteUrl('')
                  }}
                >
                  <Plus size={16} className="mr-1" /> Neuer Link
                </Button>
              </CardHeader>
              <CardContent>
                {/* Create Invite Form */}
                {showInviteForm && (
                  <div className="mb-6 p-4 border rounded-lg bg-gray-50 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600">Plan</label>
                        <select
                          className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                          value={invitePlan}
                          onChange={(e) => setInvitePlan(e.target.value)}
                        >
                          <option value="STARTER">Starter</option>
                          <option value="PRO">Pro</option>
                          <option value="MANAGED">Managed</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Max. Nutzungen</label>
                        <input
                          type="number"
                          min="1"
                          className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                          value={inviteMaxUses}
                          onChange={(e) => setInviteMaxUses(parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Gültig (Tage)</label>
                        <input
                          type="number"
                          min="0"
                          className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                          value={inviteExpDays}
                          onChange={(e) => setInviteExpDays(parseInt(e.target.value) || 0)}
                          placeholder="0 = unbegrenzt"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Custom Code (opt.)</label>
                        <input
                          type="text"
                          className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                          value={inviteCustomCode}
                          onChange={(e) => setInviteCustomCode(e.target.value)}
                          placeholder="z.B. KUNDE-XYZ"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Notiz</label>
                      <input
                        type="text"
                        className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                        value={inviteNote}
                        onChange={(e) => setInviteNote(e.target.value)}
                        placeholder="z.B. Für Firma ABC GmbH"
                      />
                    </div>

                    <Button
                      onClick={createInvite}
                      disabled={creating}
                      className="bg-radar-600 hover:bg-radar-700"
                      size="sm"
                    >
                      {creating ? 'Erstelle…' : 'Einladungslink erstellen'}
                    </Button>

                    {createdInviteUrl && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle size={16} className="text-green-600" />
                        <code className="text-xs flex-1 break-all">{createdInviteUrl}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(createdInviteUrl)}
                        >
                          {copied ? <CheckCircle size={14} className="text-green-600" /> : <Copy size={14} />}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Invites List */}
                <div className="space-y-2">
                  {invites.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">Keine Einladungslinks</p>
                  ) : (
                    invites.map((invite) => (
                      <div
                        key={invite.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          invite.active ? 'bg-white' : 'bg-gray-50 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono font-medium">{invite.code}</code>
                            <Badge className={PLAN_COLORS[invite.plan] || ''}>{invite.plan}</Badge>
                            {!invite.active && <Badge variant="secondary">Deaktiviert</Badge>}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {invite.usedCount}/{invite.maxUses} verwendet
                            {invite.note && ` · ${invite.note}`}
                            {invite.expiresAt && ` · bis ${new Date(invite.expiresAt).toLocaleDateString('de-DE')}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              const url = `${window.location.origin}/invite/${invite.code}`
                              copyToClipboard(url)
                            }}
                          >
                            <Copy size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleInvite(invite.id, !invite.active)}
                          >
                            {invite.active ? (
                              <XCircle size={14} className="text-orange-500" />
                            ) : (
                              <CheckCircle size={14} className="text-green-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500"
                            onClick={() => deleteInvite(invite.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  )
}
