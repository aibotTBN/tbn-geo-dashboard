'use client'

import { Header } from '@/components/layout/header'
import { ProjectWizard } from '@/components/geo/project-wizard'

export default function NeuProjektPage() {
  return (
    <>
      <Header title="Neues Projekt anlegen" />
      <div className="p-6">
        <ProjectWizard />
      </div>
    </>
  )
}
