// Plan limit definitions and helpers for LLM Radar
// Used by API routes and UI to enforce feature gating

export type PlanType = 'STARTER' | 'PRO' | 'MANAGED' | null

export interface PlanLimits {
  maxProjects: number
  maxDiagnosesPerMonth: number
  maxCompetitors: number
  features: {
    llmAnswers: boolean
    knowledgeBuilder: boolean
    kbEditing: boolean
    exports: boolean
    monitoring: boolean
    mcpServer: boolean
    mcpAnalytics: boolean
    googleReadiness: boolean
    competitorAnalysis: boolean
  }
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  STARTER: {
    maxProjects: 3,
    maxDiagnosesPerMonth: 5,
    maxCompetitors: 3,
    features: {
      llmAnswers: true,
      knowledgeBuilder: false,
      kbEditing: false,
      exports: false,
      monitoring: false,
      mcpServer: false,
      mcpAnalytics: false,
      googleReadiness: true,
      competitorAnalysis: true,
    },
  },
  PRO: {
    maxProjects: Infinity,
    maxDiagnosesPerMonth: Infinity,
    maxCompetitors: 10,
    features: {
      llmAnswers: true,
      knowledgeBuilder: true,
      kbEditing: true,
      exports: true,
      monitoring: true,
      mcpServer: true,
      mcpAnalytics: true,
      googleReadiness: true,
      competitorAnalysis: true,
    },
  },
  MANAGED: {
    maxProjects: Infinity,
    maxDiagnosesPerMonth: Infinity,
    maxCompetitors: Infinity,
    features: {
      llmAnswers: true,
      knowledgeBuilder: true,
      kbEditing: true,
      exports: true,
      monitoring: true,
      mcpServer: true,
      mcpAnalytics: true,
      googleReadiness: true,
      competitorAnalysis: true,
    },
  },
}

// TBN staff and admins get unlimited access (same as MANAGED)
export function getLimitsForUser(plan: PlanType, role: string): PlanLimits {
  if (role === 'TBN_STAFF' || role === 'ADMIN') {
    return PLAN_LIMITS.MANAGED
  }
  if (!plan) {
    // No plan = no features (shouldn't happen for registered users)
    return {
      maxProjects: 0,
      maxDiagnosesPerMonth: 0,
      maxCompetitors: 0,
      features: {
        llmAnswers: false,
        knowledgeBuilder: false,
        kbEditing: false,
        exports: false,
        monitoring: false,
        mcpServer: false,
        mcpAnalytics: false,
        googleReadiness: false,
        competitorAnalysis: false,
      },
    }
  }
  return PLAN_LIMITS[plan] || PLAN_LIMITS.STARTER
}

// Human-readable plan names
export const PLAN_NAMES: Record<string, string> = {
  STARTER: 'Starter',
  PRO: 'Pro',
  MANAGED: 'Managed',
}

// Check if a feature is available for the user
export function hasFeature(
  plan: PlanType,
  role: string,
  feature: keyof PlanLimits['features']
): boolean {
  return getLimitsForUser(plan, role).features[feature]
}

// Check if user can create more projects
export function canCreateProject(
  plan: PlanType,
  role: string,
  currentProjectCount: number
): boolean {
  const limits = getLimitsForUser(plan, role)
  return currentProjectCount < limits.maxProjects
}

// Required plan for a feature (for upgrade nudge messages)
export function requiredPlanFor(feature: keyof PlanLimits['features']): string {
  if (PLAN_LIMITS.STARTER.features[feature]) return 'Starter'
  if (PLAN_LIMITS.PRO.features[feature]) return 'Pro'
  return 'Managed'
}
