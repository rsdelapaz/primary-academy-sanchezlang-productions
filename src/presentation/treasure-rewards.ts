import type { TreasureId } from '../domain/treasure'

export const TREASURE_REWARDS: Record<TreasureId, { title: string; description: string }> = {
  'star-crystal': { title: 'Cristal estelar', description: 'Un brillo para tu colección.' },
  'golden-compass': { title: 'Brújula dorada', description: 'Guía para nuevas aventuras.' },
  'moon-crown': { title: 'Corona lunar', description: 'El tesoro más brillante.' },
}
