import { useEffect, useRef } from 'react'
import { useStory } from '../store/useStory'

// Warm white flash as she passes through the sun's surface
export default function SunFlash() {
  const el = useRef()

  useEffect(
    () =>
      useStory.subscribe((s) => {
        const x = (s.progress - 0.553) / 0.012
        if (el.current) el.current.style.opacity = String(Math.exp(-x * x) * 0.92)
      }),
    []
  )

  return (
    <div
      ref={el}
      className="absolute inset-0"
      style={{
        opacity: 0,
        background:
          'radial-gradient(circle at 50% 50%, #fffaf0 0%, #ffd58a 35%, rgba(255,150,60,.85) 70%, rgba(120,40,10,.6) 100%)',
      }}
    />
  )
}