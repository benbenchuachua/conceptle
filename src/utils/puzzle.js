// Deterministic daily puzzle — same concept for all users each day
export function getDailyPuzzle(concepts) {
  const epoch = new Date('2026-01-01')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayIndex = Math.floor((today - epoch) / 86400000)
  return {
    puzzle: concepts[((dayIndex % concepts.length) + concepts.length) % concepts.length],
    puzzleNumber: dayIndex + 1,
  }
}

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => [i])
  for (let j = 1; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
  return dp[m][n]
}

const ARTICLES = new Set(['the', 'a', 'an'])

function stripArticles(s) {
  return s.split(' ').filter(w => !ARTICLES.has(w)).join(' ').trim()
}

export function fuzzyMatch(guess, concept, aliases = []) {
  if (!guess.trim()) return false
  const g = normalize(guess)
  const c = normalize(concept)

  // Exact match
  if (g === c) return true

  // Strip leading/trailing articles and compare ("placebo effect" == "the placebo effect")
  if (stripArticles(g) === stripArticles(c)) return true

  // Levenshtein on full strings
  const tolerance = c.length > 10 ? 2 : 1
  if (levenshtein(g, c) <= tolerance) return true

  // Levenshtein on article-stripped strings
  if (levenshtein(stripArticles(g), stripArticles(c)) <= tolerance) return true

  // All significant words of concept present in guess
  const cWords = stripArticles(c).split(' ').filter(w => w.length > 2)
  const gWords = new Set(g.split(' '))
  if (cWords.length > 0 && cWords.every(w => gWords.has(w))) return true

  // Aliases
  for (const alias of aliases) {
    const a = normalize(alias)
    if (g === a || stripArticles(g) === stripArticles(a) || levenshtein(g, a) <= 1) return true
  }

  return false
}

export function getShareText(puzzleNumber, theme, cluesUsed, status) {
  const squares = Array(5).fill('⬜')
  if (status === 'won') {
    for (let i = 0; i < cluesUsed; i++) squares[i] = '🟩'
  } else {
    squares.fill('🟥')
  }
  const line = status === 'won'
    ? `Got it in ${cluesUsed} clue${cluesUsed === 1 ? '' : 's'}! ${squares.join('')}`
    : `Didn't get it today. ${squares.join('')}`
  return `Conceptle #${puzzleNumber} · ${theme}\n${line}`
}
