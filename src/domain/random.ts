export type RandomSource = () => number

export function fisherYates<T>(items: readonly T[], random: RandomSource = Math.random): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const sample = random()
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
      throw new Error('Random source must return a number in [0, 1).')
    }
    const swapIndex = Math.floor(sample * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy
}
