import type { StudySession } from '../domain/study-session'

export interface StudyRouteRequest {
  requiresStudySession: boolean
  subjectId?: string
  topicId?: string
}

export type StudyRouteDecision = { kind: 'allow' } | { kind: 'redirect'; name: 'home' }

export function guardStudyRoute(
  request: StudyRouteRequest,
  session: StudySession | null,
): StudyRouteDecision {
  if (!request.requiresStudySession) return { kind: 'allow' }
  if (!session || request.subjectId !== session.subjectId || request.topicId !== session.topicId) {
    return { kind: 'redirect', name: 'home' }
  }
  return { kind: 'allow' }
}
