import { AnimatePresence } from 'framer-motion'
import { useStory } from '../store/useStory'
import { BEATS, findBeat } from '../content/story'
import Caption from './Caption'
import ProgressThread from './ProgressThread'
import TouchJoystick from './TouchJoystick'
import SunFlash from './SunFlash'
import FocusCaption from './FocusCaption'
import LightLetter from './LightLetter'
import FinalQuestion from './FinalQuestion'

export default function Overlay() {
  const activeId = useStory((s) => findBeat(s.progress)?.id ?? null)
  const beat = activeId ? BEATS.find((b) => b.id === activeId) : null

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none">
      <SunFlash />

      <AnimatePresence>
        {beat && <Caption key={beat.id} beat={beat} />}
      </AnimatePresence>

      <FocusCaption />
      <LightLetter />
      <FinalQuestion />
      <ProgressThread />
      <TouchJoystick />
    </div>
  )
}