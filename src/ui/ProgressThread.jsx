import { useEffect, useRef } from 'react'
import { useStory } from '../store/useStory'

export default function ProgressThread() {
  const fill = useRef()

  useEffect(
    () =>
      useStory.subscribe((s) => {
        if (fill.current) fill.current.style.transform = `scaleY(${s.progress})`
      }),
    []
  )

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 h-[40vh] w-px bg-white/10">
      <div
        ref={fill}
        className="w-full h-full origin-top"
        style={{
          transform: 'scaleY(0)',
          background: 'linear-gradient(to bottom, #ffd27a, #ff9a3c)',
          boxShadow: '0 0 8px rgba(255,190,90,.7)',
        }}
      />
    </div>
  )
}