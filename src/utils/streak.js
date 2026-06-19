const RESULT_KEY = 'conceptle_result'
const STREAK_KEY = 'conceptle_streak'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayStr() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10)
}

export function getTodayResult() {
  try {
    const r = JSON.parse(localStorage.getItem(RESULT_KEY))
    return r?.date === todayStr() ? r : null
  } catch {
    return null
  }
}

export function getStreak() {
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY)) || { current: 0, best: 0, lastPlayed: null }
  } catch {
    return { current: 0, best: 0, lastPlayed: null }
  }
}

export function saveResult({ puzzleNumber, cluesUsed, score, status, concept, theme }) {
  const today = todayStr()
  localStorage.setItem(RESULT_KEY, JSON.stringify({
    date: today, puzzleNumber, cluesUsed, score, status, concept, theme,
  }))

  const streak = getStreak()
  if (status === 'won') {
    const consecutive = streak.lastPlayed === yesterdayStr() || streak.lastPlayed === today
    streak.current = consecutive ? streak.current + 1 : 1
    streak.best = Math.max(streak.best, streak.current)
  } else {
    streak.current = 0
  }
  streak.lastPlayed = today
  localStorage.setItem(STREAK_KEY, JSON.stringify(streak))
  return streak
}
