import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStory } from '../store/useStory'
import { ORBIT_PHOTOS, STAR_PHOTOS } from '../content/photos'

const clean = (s) => s.replace(/[.,!?;:…"“”'’()\-–—]/g, '').replace(/\s+/g, ' ').trim()

export default function FocusCaption() {
  const focusId = useStory((s) => s.focusId)
  const starFocus = useStory((s) => s.starFocus)

  const photo =
    focusId !== null ? ORBIT_PHOTOS[focusId] : starFocus !== null ? STAR_PHOTOS[starFocus] : null
  const key = focusId !== null ? `o${focusId}` : `s${starFocus}`

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      const s = useStory.getState()
      s.setFocus(null)
      s.setStarFocus(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <AnimatePresence>
      {photo && (
        <motion.div
          key={key}
          className="absolute bottom-[7vh] inset-x-0 flex flex-col items-center gap-4 px-6"
          initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: 0.5, duration: 0.9 } }}
          exit={{ opacity: 0, y: -8, filter: 'blur(8px)', transition: { duration: 0.5 } }}
        >
          <div className="cap cap-veil cap-line tone-warm text-center">{clean(photo.caption)}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}