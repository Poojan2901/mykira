import { AnimatePresence, motion } from 'framer-motion'
import { useStory } from '../store/useStory'

const EASE = [0.22, 1, 0.36, 1]

const RESPONSES = {
  yes: { main: 'Then I will spend every day\nbeing worth your light', sub: 'I love you Kira' },
  time: { main: 'Take all the time you need\nI will be right here', sub: 'Always' },
}

function Lines({ text, className }) {
  return (
    <div className={className}>
      {text.split('\n').map((t, i) => (
        <span key={i} className="block">{t}</span>
      ))}
    </div>
  )
}

export default function FinalQuestion() {
  const show = useStory((s) => s.progress >= 0.972)
  const answer = useStory((s) => s.answer)
  const setAnswer = useStory((s) => s.setAnswer)

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-x-0 top-[12vh] flex flex-col items-center gap-8 px-6"
          initial={{ opacity: 0, y: 16, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 1.6, ease: EASE } }}
          exit={{ opacity: 0, transition: { duration: 0.8 } }}
        >
          <AnimatePresence mode="wait">
            {!answer ? (
              <motion.div
                key="ask"
                className="flex flex-col items-center gap-10"
                exit={{ opacity: 0, filter: 'blur(8px)', transition: { duration: 0.6 } }}
              >
                <Lines
                  text={'Will you let me stay\nin your orbit'}
                  className="cap cap-veil cap-title tone-warm text-center"
                />
                <div className="flex flex-wrap justify-center gap-4 pointer-events-auto">
                  <button className="answer-btn answer-yes" onClick={() => setAnswer('yes')}>
                    Yes
                  </button>
                  <button className="answer-btn" onClick={() => setAnswer('time')}>
                    I need some time
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="reply"
                className="flex flex-col items-center gap-5"
                initial={{ opacity: 0, y: 12, filter: 'blur(10px)' }}
                animate={{
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                  transition: { delay: 0.6, duration: 1.4, ease: EASE },
                }}
              >
                <Lines
                  text={RESPONSES[answer].main}
                  className="cap cap-veil cap-line tone-warm text-center"
                />
                <motion.div
                  className="cap cap-whisper tone-warm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 2.4, duration: 1.4 } }}
                >
                  {RESPONSES[answer].sub}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}