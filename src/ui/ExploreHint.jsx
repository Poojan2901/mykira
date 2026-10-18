import { AnimatePresence, motion } from 'framer-motion'
import { useStory } from '../store/useStory'
import { STAR_PHOTOS } from '../content/photos'

const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

export default function ExploreHint() {
  const chapter = useStory((s) =>
    s.mode === 'explore' && s.focusId === null && s.starFocus === null && s.progress < 0.805
      ? s.chapter
      : null
  )
  const found = useStory((s) => s.seen.length)

  const text = {
    becomeSun: isTouch
      ? 'swipe to look around · tap a memory'
      : 'drag to look around · WASD to drift · click a memory',
    constellation: `${isTouch ? 'tap' : 'click'} a star to open it · ${found} of ${STAR_PHOTOS.length} found`,
  }

  return (
    <AnimatePresence mode="wait">
      {chapter && (
        <motion.div
          key={chapter}
          className="absolute bottom-8 inset-x-0 text-center hint"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 1.2, duration: 1.2 } }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
        >
          {text[chapter]}
        </motion.div>
      )}
    </AnimatePresence>
  )
}