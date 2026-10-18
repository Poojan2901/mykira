import { motion } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1]

// Strip punctuation, keep letters, numbers, spaces and line breaks
const clean = (s) => s.replace(/[.,!?;:…"“”'’()\-–—]/g, '').replace(/[ \t]+/g, ' ').trim()

const container = (stagger) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger } },
  exit: {
    opacity: 0,
    y: -14,
    filter: 'blur(10px)',
    transition: { duration: 0.7, ease: EASE },
  },
})

const piece = {
  hidden: { opacity: 0, y: 16, filter: 'blur(12px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 1.0, ease: EASE },
  },
}

// Wrapper layout per position. Sides fall back to bottom on small screens.
const POS = {
  center: 'items-center justify-center',
  bottom: 'items-end justify-center pb-[9vh]',
  upper:  'items-start justify-center pt-[11vh]',
  left:   'items-end justify-center pb-[9vh] md:items-center md:justify-start md:pb-0 md:pl-[7vw]',
  right:  'items-end justify-center pb-[9vh] md:items-center md:justify-end md:pb-0 md:pr-[7vw]',
}

const ALIGN = {
  center: 'text-center',
  bottom: 'text-center',
  upper:  'text-center',
  left:   'text-center md:text-left md:max-w-[34vw]',
  right:  'text-center md:text-right md:max-w-[34vw]',
}

export default function Caption({ beat }) {
  const { sub, style = 'line', tone = 'neutral', pos = 'center' } = beat
  const text = clean(beat.text)
  const isName = style === 'name'

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const stagger = isName ? 0.14 : style === 'whisper' ? 0.12 : 0.07

  return (
    <div className={`absolute inset-0 flex px-6 ${POS[pos]}`}>
      <motion.div
        className={`cap cap-veil cap-${style} tone-${tone} ${ALIGN[pos]}`}
        variants={container(stagger)}
        initial="hidden"
        animate="show"
        exit="exit"
      >
        {lines.map((line, li) => (
          <div key={li} className="block">
            {(isName ? line.split('') : line.split(' ')).map((chunk, i) => (
              <motion.span key={i} variants={piece} className="inline-block whitespace-pre">
                {isName ? chunk : chunk + ' '}
              </motion.span>
            ))}
          </div>
        ))}

        {sub && (
          <motion.div variants={piece} className="cap-sub mt-3">
            {clean(sub)}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}