import type { Medicine } from './types'

// Ported from RxScan StringUtils.kt
export function levenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length
  const len2 = s2.length
  const dp: number[][] = Array.from({ length: len1 + 1 }, () => new Array(len2 + 1).fill(0))

  for (let i = 0; i <= len1; i++) dp[i][0] = i
  for (let j = 0; j <= len2; j++) dp[0][j] = j

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[len1][len2]
}

// Ported from RxScan MainViewModel.search(), plus word-level matching
// (the original compares tokens against the whole brand/composition string,
// which almost never matches for real prescriptions; word-level fixes that)
export function searchMedicines(text: string, allMedicines: Medicine[]): Medicine[] {
  const tokens = text
    .split(/\s+/)
    .map((t) => t.replace(/[^A-Za-z0-9]/g, '').toLowerCase())
    .filter((t) => t.length > 2)

  const unique = [...new Set(tokens)]
  if (unique.length === 0) return []

  const scored = allMedicines
    .map((medicine) => {
      const brandLower = medicine.brandName.toLowerCase()
      const compLower = medicine.composition.toLowerCase()
      const brandWords = brandLower.split(/\s+/)
      const compWords = compLower.split(/\s+/)
      let bestScore = Number.MAX_SAFE_INTEGER
      let matchedTokenCount = 0

      for (const token of unique) {
        let currentBest = Math.min(
          levenshteinDistance(token, brandLower),
          levenshteinDistance(token, compLower),
        )
        for (const w of brandWords) currentBest = Math.min(currentBest, levenshteinDistance(token, w))
        for (const w of compWords) currentBest = Math.min(currentBest, levenshteinDistance(token, w))

        if (currentBest <= 3) {
          bestScore = Math.min(bestScore, currentBest)
          matchedTokenCount++
        }
      }

      if (matchedTokenCount > 0) {
        return { medicine, score: bestScore - matchedTokenCount * 10 }
      }
      return null
    })
    .filter((x): x is { medicine: Medicine; score: number } => x !== null)
    .sort((a, b) => a.score - b.score)
    .map((x) => x.medicine)

  return scored.slice(0, 10)
}

// Parses the medicines.csv bundled from the Android app assets.
// Line format: "Generic,Brand,Price,""Composition""" (whole line quoted, composition quoted inside)
export function parseMedicinesCsv(csv: string): Medicine[] {
  const medicines: Medicine[] = []
  let id = 0

  for (const rawLine of csv.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const unquoted = line.replace(/^"/, '').replace(/"$/, '')
    const fields = parseCsvLine(unquoted)
    if (fields.length < 4) continue
    const [generic, brand, price, composition] = fields
    if (generic === 'Generic Name') continue // header
    const priceNum = Number(price.replace(/[^0-9.]/g, '')) || 0
    medicines.push({ id: id++, genericName: generic, brandName: brand, price: priceNum, composition })
  }
  return medicines
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (c === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += c
    }
  }
  fields.push(current.trim())
  return fields
}
