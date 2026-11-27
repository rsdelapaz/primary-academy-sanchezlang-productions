import { readonly, ref } from 'vue'

// Shared UI state: informational overlays must not advance a live game behind them.
const open = ref(false)

export const creditsOpen = readonly(open)

export function setCreditsOpen(value: boolean): void {
  open.value = value
}
