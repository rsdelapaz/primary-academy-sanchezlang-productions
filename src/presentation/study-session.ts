import { shallowRef } from 'vue'
import {
  createStudySession,
  finishStudySession,
  rateStudyCard,
  restartStudySession,
  revealStudyCard,
  type StudySession,
} from '../domain/study-session'
import { isFlashcardExercise, type ContentPackage, type FlashcardExercise } from '../domain/content'
import type { ActivityConfiguration } from '../domain/activity-configuration'

export const studySession = shallowRef<StudySession | null>(null)

export function startStudy(
  subjectId: string,
  topicId: string,
  content: ContentPackage,
  configuration: ActivityConfiguration,
): StudySession {
  const next = createStudySession({
    sessionId: crypto.randomUUID(),
    subjectId,
    topicId,
    contentVersion: content.contentVersion,
    configuration,
    flashcards: content.exercises.filter(isFlashcardExercise),
  })
  studySession.value = next
  return next
}

export function revealActiveStudyCard(): StudySession {
  const session = requireStudySession()
  studySession.value = revealStudyCard(session)
  return studySession.value
}

export function rateActiveStudyCard(remembered: boolean): StudySession {
  const session = requireStudySession()
  studySession.value = rateStudyCard(session, remembered)
  return studySession.value
}

export function finishActiveStudy(): StudySession {
  const session = requireStudySession()
  studySession.value = finishStudySession(session)
  return studySession.value
}

export function restartActiveStudy(flashcards: readonly FlashcardExercise[]): StudySession {
  const session = requireStudySession()
  const next = restartStudySession(session, flashcards, crypto.randomUUID())
  studySession.value = next
  return next
}

function requireStudySession(): StudySession {
  if (!studySession.value) throw new Error('No hay una sesión de estudio activa.')
  return studySession.value
}
