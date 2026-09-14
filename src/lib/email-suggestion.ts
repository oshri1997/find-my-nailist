const COMMON_DOMAINS = [
  'gmail.com',
  'walla.com',
  'walla.co.il',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'yahoo.com',
  'nailistiot.fun',
]

function levenshtein(first: string, second: string): number {
  const row = Array.from({ length: second.length + 1 }, (_, index) => index)
  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    let previous = row[0]
    row[0] = firstIndex
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      const current = row[secondIndex]
      row[secondIndex] = Math.min(
        row[secondIndex] + 1,
        row[secondIndex - 1] + 1,
        previous + (first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1)
      )
      previous = current
    }
  }
  return row[second.length]
}

export function suggestEmailCorrection(email: string): string | null {
  const normalized = email.trim().toLowerCase()
  const at = normalized.lastIndexOf('@')
  if (at < 1) return null
  const local = normalized.slice(0, at)
  const domain = normalized.slice(at + 1)
  if (!domain || COMMON_DOMAINS.includes(domain)) return null

  const closest = COMMON_DOMAINS
    .map((candidate) => ({ candidate, distance: levenshtein(domain, candidate) }))
    .sort((first, second) => first.distance - second.distance)[0]

  return closest && closest.distance <= 2 ? `${local}@${closest.candidate}` : null
}
