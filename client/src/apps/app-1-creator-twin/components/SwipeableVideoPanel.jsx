import { useState, useRef } from 'react'
import VideoPanel from './VideoPanel'
import { PERSONAS } from '../data/personas'

/**
 * Wraps VideoPanel with TikTok-style swipe navigation + arrow buttons.
 * Swipe up → next persona, swipe down → prev persona.
 * Arrow buttons (▲ ▼) appear on hover.
 */
export default function SwipeableVideoPanel({ personaId, onPersonaChange }) {
  const [slideDir, setSlideDir] = useState(null)   // 'up' | 'down' | null
  const [animating, setAnimating] = useState(false)
  const touchStartY = useRef(null)

  const currentIdx = PERSONAS.findIndex((p) => p.id === personaId)

  function navigate(dir) {
    if (animating) return
    setSlideDir(dir)
    setAnimating(true)

    setTimeout(() => {
      const total = PERSONAS.length
      const nextIdx = dir === 'up'
        ? (currentIdx + 1) % total
        : (currentIdx - 1 + total) % total
      onPersonaChange(PERSONAS[nextIdx].id)
      setSlideDir(null)
      setAnimating(false)
    }, 300)
  }

  function handleTouchStart(e) {
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e) {
    if (touchStartY.current === null) return
    const delta = e.changedTouches[0].clientY - touchStartY.current
    touchStartY.current = null
    if (delta < -50) navigate('up')
    else if (delta > 50) navigate('down')
  }

  // Slide-out class for current card
  const slideClass = animating
    ? slideDir === 'up'
      ? '-translate-y-full opacity-0'
      : 'translate-y-full opacity-0'
    : 'translate-y-0 opacity-100'

  return (
    <div
      className="relative h-full group overflow-hidden rounded-2xl"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Animated card wrapper */}
      <div
        className={`h-full transition-all duration-300 ${slideClass}`}
      >
        <VideoPanel personaId={personaId} />
      </div>

      {/* Up arrow — prev persona */}
      <button
        onClick={() => navigate('down')}
        disabled={animating}
        className="absolute top-2 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm disabled:cursor-not-allowed"
        title="Previous creator"
      >
        ▲
      </button>

      {/* Down arrow — next persona */}
      <button
        onClick={() => navigate('up')}
        disabled={animating}
        className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm disabled:cursor-not-allowed"
        title="Next creator"
      >
        ▼
      </button>

      {/* Persona indicator dots */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5">
        {PERSONAS.map((p, i) => (
          <button
            key={p.id}
            onClick={() => {
              if (p.id !== personaId && !animating) {
                const dir = i > currentIdx ? 'up' : 'down'
                setSlideDir(dir)
                setAnimating(true)
                setTimeout(() => {
                  onPersonaChange(p.id)
                  setSlideDir(null)
                  setAnimating(false)
                }, 300)
              }
            }}
            className={`w-1.5 rounded-full transition-all ${
              p.id === personaId ? 'h-4 bg-white' : 'h-1.5 bg-white/40 hover:bg-white/70'
            }`}
            title={p.name}
          />
        ))}
      </div>
    </div>
  )
}
