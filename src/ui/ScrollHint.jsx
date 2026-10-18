import { AnimatePresence, motion } from 'framer-motion'
import { useStory } from '../store/useStory'

export default function ScrollHint() {
  const show = useStory((s) => s.progress < 0.003)

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute bottom-10 inset-x-0 flex flex-col items-center gap-3 hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 2.5, duration: 2 } }}
          exit={{ opacity: 0, transition: { duration: 0.8 } }}
        >
          <span>scroll slowly</span>
          <motion.div
            className="w-px h-10 bg-white/50 origin-top"
            animate={{ scaleY: [0, 1, 0], y: [0, 0, 20] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}