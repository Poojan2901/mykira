import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStory } from '../store/useStory'
import { LETTER, LETTER_START, CHARS_PER_SEC, LINE_PAUSE } from '../content/letter'

const clean = (s) => s.replace(/[.,!?;:…"“”'’()\-–—]/g, '').replace(/[ \t]+/g, ' ').trim()
const LINES = LETTER.map((l) => ({ ...l, text: clean(l.text) }))

// Timeline: when each line starts and how long it takes (seconds)
const TIMING = (() => {
  let t = 0.6
  return LINES.map((l) => {
    const dur = Math.max(0.6, l.text.length / CHARS_PER_SEC)
    const item = { start: t, dur }
    t += dur + LINE_PAUSE
    return item
  })
})()
const TOTAL = TIMING[TIMING.length - 1].start + TIMING[TIMING.length - 1].dur

const SCROLL_KEYS = new Set([' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'])

function lockScroll() {
  const prevent = (e) => e.preventDefault()
  const preventKeys = (e) => SCROLL_KEYS.has(e.key) && e.preventDefault()
  window.addEventListener('wheel', prevent, { passive: false })
  window.addEventListener('touchmove', prevent, { passive: false })
  window.addEventListener('keydown', preventKeys)
  document.documentElement.style.overflow = 'hidden'
  return () => {
    window.removeEventListener('wheel', prevent)
    window.removeEventListener('touchmove', prevent)
    window.removeEventListener('keydown', preventKeys)
    document.documentElement.style.overflow = ''
  }
}

export default function LightLetter() {
  const [phase, setPhase] = useState('idle') // idle | writing | done
  const [visible, setVisible] = useState(false)
  const lineRefs = useRef([])
  const tipRefs = useRef([])
  const rowRefs = useRef([])
  const wrap = useRef()
  const speed = useRef(1)

  // Start writing when she reaches the letter for the first time
  useEffect(
    () =>
      useStory.subscribe((s) => {
        const p = s.progress
        setVisible(p > 0.862 && p < 0.95)

        if (wrap.current) {
          const fadeOut = 1 - Math.min(1, Math.max(0, (p - 0.935) / 0.012))
          wrap.current.style.opacity = String(fadeOut)
        }

        if (p >= LETTER_START && phase === 'idle' && !s.letterDone) {
          const max = document.documentElement.scrollHeight - window.innerHeight
          window.scrollTo({ top: LETTER_START * max, behavior: 'instant' })
          setPhase('writing')
        }
      }),
    [phase]
  )

  // Already written on an earlier visit: show it complete
  useEffect(() => {
    if (useStory.getState().letterDone) setPhase('done')
  }, [])

  // Writing engine
  useEffect(() => {
    if (phase === 'done') {
      lineRefs.current.forEach((el) => el?.style.setProperty('--r', '1'))
      tipRefs.current.forEach((el) => el && (el.style.opacity = '0'))
      return
    }
    if (phase !== 'writing') return

    const unlock = lockScroll()
    let vt = 0
    let last = performance.now()
    let lastSpark = 0
    let raf

    const loop = (now) => {
      const dt = (now - last) / 1000
      last = now
      vt += dt * speed.current

      LINES.forEach((_, i) => {
        const { start, dur } = TIMING[i]
        const r = Math.min(1, Math.max(0, (vt - start) / dur))
        lineRefs.current[i]?.style.setProperty('--r', String(r))

        const tip = tipRefs.current[i]
        if (tip) {
          const writing = r > 0 && r < 1
          tip.style.left = `${r * 100}%`
          tip.style.opacity = writing ? '1' : '0'

          // Sparks fall off the writing tip
          if (writing && now - lastSpark > 50) {
            lastSpark = now
            const spark = document.createElement('span')
            spark.className = 'letter-spark'
            spark.style.left = `${r * 100}%`
            spark.style.setProperty('--dx', `${(Math.random() - 0.5) * 30}px`)
            spark.style.setProperty('--dy', `${10 + Math.random() * 30}px`)
            spark.addEventListener('animationend', () => spark.remove())
            rowRefs.current[i]?.appendChild(spark)
          }
        }
      })

      if (vt >= TOTAL) {
        useStory.getState().setLetterDone()
        setPhase('done')
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    // Tap anywhere to write faster
    const faster = () => (speed.current = 3)
    window.addEventListener('pointerdown', faster)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointerdown', faster)
      unlock()
    }
  }, [phase])

  const show = visible || phase === 'writing'

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          ref={wrap}
          className="absolute inset-0 flex flex-col items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 1.2 } }}
          exit={{ opacity: 0, transition: { duration: 0.8 } }}
        >
          <div className="letter cap-veil">
            {LINES.map((l, i) => (
              <div
                key={i}
                className={`letter-row letter-${l.style ?? 'line'}`}
                ref={(el) => (rowRefs.current[i] = el)}
              >
                <span className="letter-line" ref={(el) => (lineRefs.current[i] = el)}>
                  {l.text.split('\n').map((t, j) => (
                    <span key={j} className="block">{t}</span>
                  ))}
                </span>
                <span className="letter-tip" ref={(el) => (tipRefs.current[i] = el)} />
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}