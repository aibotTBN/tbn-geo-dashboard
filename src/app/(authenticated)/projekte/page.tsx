'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Globe, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Project {
  id: string
  domain: string
  name: string
  description?: string
  updatedAt: string
  diagnoses: Array<{ score: number; createdAt: string }>
}

export default function ProjektePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      const res = await fetch('/api/geo/projects')
      const data = await res.json()
      setProjects(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  async function createProject() {
    if (!newDomain) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/geo/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain, name: newName || newDomain }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Fehler beim Anlegen')
        return
      }
      setNewDomain('')
      setNewName('')
      setShowForm(false)
      fetchProjects()
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <Header title="Projekte" />
      <div className="p-6 space-y-6">
        {/* New project form */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Alle Projekte</CardTitle>
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus size={16} className="mr-1" /> Neues Projekt
            </Button>
          </CardHeader>
          {showForm && (
            <CardContent className="border-t">
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <input
                  type="text"
                  placeholder="Domain (z.B. example.de)"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-radar-500"
                />
                <input
                  type="text"
                  placeholder="Firmenname (optional)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-radar-500"
                />
                <Button onClick={createProject} disabled={creating || !newDomain}>
                  {creating ? <Loader2 size={16} className="animate-spin mr-1" /> : null}
                  Anlegen
                </Button>
              </div>
              {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            </CardContent>
          )}
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={24} className="animate-spin text-radar-600" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <Globe size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Noch keine Projekte</p>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map((project) => {
                  const diag = project.diagnoses?.[0]
                  return (
                    <Link
                      key={project.id}
                      href={`/projekte/${project.domain}`}
                      className="flex items-center justify-between p-4 rounded-lg border hover:border-radar-200 hover:bg-radar-50/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Globe size={20} className="text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{project.name}</p>
                          <p className="text-sm text-gray-400">{project.domain}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {diag ? (
                          <Badge variant={diag.score >= 60 ? 'success' : 'warning'}>
                            Score: {diag.score}/100
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Keine Diagnose</Badge>
                        )}
                        <ArrowRight size={16} className="text-gray-400" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
