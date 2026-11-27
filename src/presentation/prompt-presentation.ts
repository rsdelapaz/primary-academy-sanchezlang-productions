/** Decorative emphasis only; keep the text (including quotation marks) intact.
 * Never parse HTML or infer an answer from the question. */
export function promptSegments(prompt: string): Array<{ text: string; emphasized: boolean }> {
  const quoted = /^(?:“[^”\n]+”|"[^"\n]+")$/u
  return prompt.split(/(“[^”\n]+”|"[^"\n]+")/gu)
    .filter(Boolean)
    .map((text) => ({ text, emphasized: quoted.test(text) }))
}
