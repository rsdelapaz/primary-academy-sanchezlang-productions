import { shallowRef } from 'vue'
import type { TreasureId } from '../domain/treasure'
import { playSoundEffect, playSoundEffects, type SoundCue } from './sound-effects'

const STREAK_MILESTONES = [3, 5, 10, 20]
let eventId = 0

export type GameFeelEvent =
  | {
    id: number
    kind: 'answer'
    correct: boolean
    points: number
    streak: number
    streakMilestone: boolean
    keyEarned: boolean
  }
  | {
    id: number
    kind: 'finish'
    score: number
    correctCount: number
    totalQuestions: number
  }

export interface TreasureRewardScene {
  id: number
  treasureId: TreasureId
}

export const gameFeelEvent = shallowRef<GameFeelEvent | null>(null)
export const treasureRewardScene = shallowRef<TreasureRewardScene | null>(null)

export function announceGameAnswer(input: {
  correct: boolean
  points: number
  streak: number
  keyEarned: boolean
}): void {
  const streakMilestone = input.correct && STREAK_MILESTONES.includes(input.streak)
  gameFeelEvent.value = {
    id: ++eventId,
    kind: 'answer',
    ...input,
    streakMilestone,
  }

  if (!input.correct) {
    playSoundEffect('incorrect')
    return
  }
  const cues: SoundCue[] = ['correct']
  if (input.keyEarned) cues.push('key')
  if (streakMilestone) cues.push('streak')
  playSoundEffects(cues)
}

export function announceGameFinished(result: {
  score: number
  correctCount: number
  totalQuestions: number
}): void {
  gameFeelEvent.value = { id: ++eventId, kind: 'finish', ...result }
  playSoundEffect('finish')
}

export function announceTreasureOpened(treasureId: TreasureId): void {
  treasureRewardScene.value = { id: ++eventId, treasureId }
  playSoundEffect('chest')
}

export function dismissTreasureReward(sceneId: number): void {
  if (treasureRewardScene.value?.id === sceneId) treasureRewardScene.value = null
}
