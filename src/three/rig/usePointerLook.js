import { useEffect } from 'react'
import { input } from './rigState'
import { useStory } from '../../store/useStory'

export default function usePointerLook(gl) {
  useEffect(() => {
    const el = gl.domElement

    const down = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      input.dragging = true
      input.pointerId = e.pointerId
      input.lastX = e.clientX
      input.lastY = e.clientY
      input.dragDist = 0
      if (useStory.getState().mode === 'explore') el.style.cursor = 'grabbing'
    }

    const move = (e) => {
      if (!input.dragging || e.pointerId !== input.pointerId) return
      const dx = e.clientX - input.lastX
      const dy = e.clientY - input.lastY
      input.lastX = e.clientX
      input.lastY = e.clientY
      input.lookDX += dx
      input.lookDY += dy
      input.dragDist += Math.abs(dx) + Math.abs(dy)
    }

    const up = (e) => {
      if (e.pointerId !== input.pointerId) return
      input.dragging = false
      input.pointerId = null
      el.style.cursor = useStory.getState().mode === 'explore' ? 'grab' : 'default'
    }

    // Cursor follows mode
    const unsub = useStory.subscribe((s, prev) => {
      if (s.mode !== prev.mode) el.style.cursor = s.mode === 'explore' ? 'grab' : 'default'
    })

    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)

    return () => {
      unsub()
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [gl])
}