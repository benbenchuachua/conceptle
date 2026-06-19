import { useState, useRef } from 'react'
import concepts from './data/concepts.json'
import { getDailyPuzzle, fuzzyMatch, getShareText } from './utils/puzzle'
import { getTodayResult, getStreak, saveResult } from './utils/streak'
import './index.css'

// ── NYT Wordle exact palette ─────────────────────────────────────────────────
const C = {
  green:       '#6aaa64',
  grey:        '#787c7f',
  tileEmpty:   '#d3d6da',
  headerBorder:'#d3d6da',
  bg:          '#ffffff',
  text:        '#1a1a1b',
}

const { puzzle, puzzleNumber } = getDailyPuzzle(concepts)

// ── Result squares with sequential flip ──────────────────────────────────────

function ResultSquares({ cluesUsed, status, animate = false }) {
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      {Array(5).fill(null).map((_, i) => {
        const active = status === 'won' ? i < cluesUsed : status === 'lost'
        const color  = active ? (status === 'won' ? C.green : C.grey) : C.tileEmpty
        return (
          <div
            key={i}
            className={animate ? 'flip' : ''}
            style={{
              width: 22,
              height: 22,
              backgroundColor: color,
              animationDelay: animate ? `${i * 120}ms` : '0ms',
            }}
          />
        )
      })}
    </div>
  )
}

// ── Share button ──────────────────────────────────────────────────────────────

function ShareButton({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      style={{
        width: '100%',
        padding: '14px',
        background: C.green,
        color: '#fff',
        border: 'none',
        borderRadius: 4,
        fontFamily: 'inherit',
        fontSize: 16,
        fontWeight: 700,
        letterSpacing: '0.05rem',
        cursor: 'pointer',
      }}
    >
      {copied ? 'Copied!' : 'Share'}
    </button>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────

function Page({ streak, children }) {
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh', fontFamily: '"Clear Sans", "Helvetica Neue", Arial, sans-serif' }}>
      {/* Full-width header */}
      <header style={{
        height: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: `1px solid ${C.headerBorder}`,
        position: 'relative',
        padding: '0 16px',
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '1.8rem',
          fontWeight: 700,
          letterSpacing: '0.2rem',
          textTransform: 'uppercase',
          color: C.text,
        }}>
          Conceptle
        </h1>
        {streak?.current > 0 && (
          <div style={{ position: 'absolute', right: 16, textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: 18, lineHeight: 1, color: C.text }}>{streak.current}</div>
            <div style={{ fontSize: 11, color: C.grey, marginTop: 2 }}>day streak</div>
          </div>
        )}
      </header>

      {/* Centered content column */}
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '20px 16px 40px' }}>
        {children}
      </div>
    </div>
  )
}

// ── Already-played screen ─────────────────────────────────────────────────────

function AlreadyPlayed({ result, streak }) {
  const won = result.status === 'won'
  const shareText = getShareText(result.puzzleNumber, result.theme, result.cluesUsed, result.status)
  return (
    <Page streak={streak}>
      <div style={{ marginTop: 24 }}>
        <p style={{ fontSize: 13, color: C.grey, margin: '0 0 20px' }}>
          You already played today. Come back tomorrow.
        </p>

        {/* Summary */}
        <div style={{ borderTop: `1px solid ${C.tileEmpty}`, paddingTop: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1rem', textTransform: 'uppercase', color: C.grey, marginBottom: 6 }}>
            {result.theme}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 12 }}>
            {result.concept}
          </div>
          <ResultSquares cluesUsed={result.cluesUsed} status={result.status} />
          <div style={{ fontSize: 13, color: won ? C.green : C.grey, marginTop: 10, fontWeight: 600 }}>
            {won
              ? `Got it in ${result.cluesUsed} clue${result.cluesUsed === 1 ? '' : 's'} · ${result.score} point${result.score === 1 ? '' : 's'}`
              : "Didn't get it"}
          </div>
        </div>

        {/* Definition */}
        <p style={{ fontSize: 13, color: C.grey, lineHeight: 1.6, margin: '0 0 24px' }}>
          <strong style={{ color: C.text, letterSpacing: '0.05rem' }}>{result.concept.toUpperCase()}</strong>
          {' — '}
          {puzzle.definition}
        </p>

        <ShareButton text={shareText} />
        <StreakRow streak={streak} />
      </div>
    </Page>
  )
}

// ── Streak row ────────────────────────────────────────────────────────────────

function StreakRow({ streak }) {
  if (!streak.current && !streak.best) return null
  return (
    <div style={{ display: 'flex', gap: 24, marginTop: 16, fontSize: 12, color: C.grey }}>
      <span>Streak <strong style={{ color: C.text }}>{streak.current}</strong></span>
      <span>Best <strong style={{ color: C.text }}>{streak.best}</strong></span>
    </div>
  )
}

// ── Main entry ────────────────────────────────────────────────────────────────

export default function App() {
  const savedResult = getTodayResult()
  const [streak, setStreak] = useState(() => getStreak())

  if (savedResult) return <AlreadyPlayed result={savedResult} streak={streak} />
  return <Game puzzle={puzzle} puzzleNumber={puzzleNumber} onComplete={setStreak} streak={streak} />
}

// ── Game ──────────────────────────────────────────────────────────────────────

function Game({ puzzle, puzzleNumber, onComplete, streak }) {
  const [cluesRevealed, setCluesRevealed] = useState(1)
  const [guess, setGuess] = useState('')
  const [wrongGuesses, setWrongGuesses] = useState([])
  const [status, setStatus] = useState('playing')
  const [score, setScore] = useState(0)
  const [shaking, setShaking] = useState(false)
  const inputRef = useRef(null)

  function endGame(won, clues) {
    const s = won ? 6 - clues : 0
    setScore(s)
    setStatus(won ? 'won' : 'lost')
    const newStreak = saveResult({
      puzzleNumber, cluesUsed: clues, score: s,
      status: won ? 'won' : 'lost',
      concept: puzzle.concept, theme: puzzle.theme,
    })
    onComplete(newStreak)
  }

  function submitGuess() {
    const trimmed = guess.trim()
    if (!trimmed || status !== 'playing') return
    if (fuzzyMatch(trimmed, puzzle.concept, puzzle.aliases)) {
      endGame(true, cluesRevealed)
    } else {
      setWrongGuesses(prev => [...prev, trimmed])
      setGuess('')
      setShaking(true)
      setTimeout(() => setShaking(false), 520)
      if (cluesRevealed === 5) endGame(false, 5)
    }
  }

  function nextClue() {
    if (cluesRevealed >= 5 || status !== 'playing') return
    setCluesRevealed(c => c + 1)
    setGuess('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const shareText = getShareText(puzzleNumber, puzzle.theme, cluesRevealed, status)
  const cluesLeft = 5 - cluesRevealed

  return (
    <Page streak={streak}>
      {/* Theme + puzzle number */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: C.grey }}>#{puzzleNumber}</span>
        <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.tileEmpty, display: 'inline-block' }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1rem', textTransform: 'uppercase', color: C.grey }}>
          {puzzle.theme}
        </span>
      </div>

      {/* Clue list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
        {Array(5).fill(null).map((_, i) => {
          const revealed = i < cluesRevealed
          const isNewest = i === cluesRevealed - 1
          return (
            <div
              key={i}
              className={isNewest && revealed ? 'clue-in' : ''}
              style={{
                display: 'flex',
                gap: 12,
                padding: '12px 14px',
                border: `1px solid ${revealed ? C.tileEmpty : C.tileEmpty}`,
                borderStyle: revealed ? 'solid' : 'dashed',
                borderRadius: 2,
                opacity: revealed ? 1 : 0.5,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: C.tileEmpty, minWidth: 12, paddingTop: 1 }}>
                {i + 1}
              </span>
              {revealed ? (
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: C.text }}>{puzzle.clues[i]}</p>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ height: 10, width: 80, background: C.tileEmpty, borderRadius: 2 }} />
                  <div style={{ height: 10, width: 52, background: C.tileEmpty, borderRadius: 2 }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Playing state */}
      {status === 'playing' && (
        <div>
          {/* Wrong guesses log */}
          {wrongGuesses.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              {wrongGuesses.slice(-3).map((g, i) => (
                <div key={i} style={{ fontSize: 12, color: C.tileEmpty, textDecoration: 'line-through', marginBottom: 2 }}>{g}</div>
              ))}
            </div>
          )}

          {/* Input */}
          <div
            className={shaking ? 'shake' : ''}
            style={{ display: 'flex', gap: 8 }}
          >
            <input
              ref={inputRef}
              type="text"
              value={guess}
              onChange={e => setGuess(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitGuess()}
              placeholder="Type your guess…"
              autoFocus
              style={{
                flex: 1,
                border: `2px solid ${C.tileEmpty}`,
                borderRadius: 4,
                padding: '12px 14px',
                fontSize: 16,
                fontFamily: 'inherit',
                color: C.text,
                outline: 'none',
              }}
              onFocus={e => { e.target.style.borderColor = '#878a8c' }}
              onBlur={e => { e.target.style.borderColor = C.tileEmpty }}
            />
            <button
              onClick={submitGuess}
              disabled={!guess.trim()}
              style={{
                padding: '12px 20px',
                background: guess.trim() ? C.text : C.tileEmpty,
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontFamily: 'inherit',
                fontSize: 15,
                fontWeight: 700,
                cursor: guess.trim() ? 'pointer' : 'default',
                letterSpacing: '0.05rem',
                transition: 'background 0.1s',
              }}
            >
              Guess
            </button>
          </div>

          {/* Next clue / give up */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            {cluesLeft > 0 ? (
              <button
                onClick={nextClue}
                style={{ background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', fontSize: 14, color: C.grey, cursor: 'pointer' }}
              >
                Next clue →
              </button>
            ) : (
              <button
                onClick={() => endGame(false, cluesRevealed)}
                style={{ background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', fontSize: 14, color: C.tileEmpty, cursor: 'pointer' }}
              >
                Give up
              </button>
            )}
            <span style={{ fontSize: 11, color: C.tileEmpty }}>
              {cluesLeft === 0 ? 'Last clue' : `${cluesLeft} clue${cluesLeft === 1 ? '' : 's'} left`}
            </span>
          </div>
        </div>
      )}

      {/* Result state */}
      {status !== 'playing' && (
        <div style={{ marginTop: 8 }}>
          {/* Score line */}
          <div style={{ borderTop: `1px solid ${C.tileEmpty}`, paddingTop: 20, marginBottom: 20 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1rem',
              textTransform: 'uppercase', color: status === 'won' ? C.green : C.grey,
              marginBottom: 6,
            }}>
              {status === 'won'
                ? `Got it in ${cluesRevealed} clue${cluesRevealed === 1 ? '' : 's'}`
                : 'Not today'}
            </div>
            <div style={{ fontWeight: 700, fontSize: 36, color: C.text, lineHeight: 1, marginBottom: 14 }}>
              {score}
              <span style={{ fontWeight: 400, fontSize: 16, color: C.grey, marginLeft: 6 }}>
                point{score === 1 ? '' : 's'}
              </span>
            </div>
            <ResultSquares cluesUsed={cluesRevealed} status={status} animate />
            <div style={{ fontSize: 13, color: C.grey, marginTop: 12 }}>
              The answer was{' '}
              <strong style={{ color: C.text }}>{puzzle.concept}</strong>
            </div>
          </div>

          {/* Definition — 1 sentence, inline */}
          <p style={{ fontSize: 13, color: C.grey, lineHeight: 1.6, margin: '0 0 24px' }}>
            <strong style={{ color: C.text, letterSpacing: '0.05rem' }}>{puzzle.concept.toUpperCase()}</strong>
            {' — '}
            {puzzle.definition}
          </p>

          <ShareButton text={shareText} />
          <StreakRow streak={streak} />
        </div>
      )}
    </Page>
  )
}
