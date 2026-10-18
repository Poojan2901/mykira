import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStory } from '../store/useStory'
import { input } from '../three/rig/rigState'

const RADIUS = 45 // px the knob can travel

export default function TouchJoystick() {
  const explore = useStory((s) => s.mode === 'explore')
  const [isTouch, setIsTouch] = useState(false)
  const base = useRef()
  const knob = useRef()
  const active = useRef(null)

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  const update = (e) => {
    const r = base.current.getBoundingClientRect()
    let x = e.clientX - (r.left + r.width / 2)
    let y = e.clientY - (r.top + r.height / 2)
    const len = Math.hypot(x, y)
    if (len > RADIUS) {
      x = (x / len) * RADIUS
      y = (y / len) * RADIUS
    }
    knob.current.style.transform = `translate(${x}px, ${y}px)`
    input.joy.x = x / RADIUS
    input.joy.y = y / RADIUS
  }

  const reset = () => {
    active.current = null
    input.joy.x = 0
    input.joy.y = 0
    if (knob.current) knob.current.style.transform = 'translate(0px, 0px)'
  }

  useEffect(() => {
    if (!explore) reset()
  }, [explore])

  if (!isTouch) return null

  return (
    <AnimatePresence>
      {explore && (
        <motion.div
          ref={base}
          className="joystick"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1, transition: { delay: 1.5, duration: 0.8 } }}
          exit={{ opacity: 0, scale: 0.8 }}
          onPointerDown={(e) => {
            active.current = e.pointerId
            e.currentTarget.setPointerCapture(e.pointerId)
            update(e)
          }}
          onPointerMove={(e) => active.current === e.pointerId && update(e)}
          onPointerUp={reset}
          onPointerCancel={reset}
        >
          <div ref={knob} className="joystick-knob" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}