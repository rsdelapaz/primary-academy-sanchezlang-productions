import type { TreasureId } from '../domain/treasure'

export const TREASURE_REWARDS: Record<TreasureId, { title: string; description: string }> = {
  'star-crystal': { title: 'Cristal estelar', description: 'Una estrella que ilumina nuevos caminos.' },
  'golden-compass': { title: 'Brújula dorada', description: 'Encuentra el rumbo de tu próxima aventura.' },
  'moon-crown': { title: 'Corona lunar', description: 'Una corona inspirada en los secretos de la Luna.' },
}
