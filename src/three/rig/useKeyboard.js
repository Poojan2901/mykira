import { useEffect } from 'react'
import { input } from './rigState'
import { useStory } from '../../store/useStory'

const MAP = {
  KeyW: 'f', ArrowUp: 'f',
  KeyS: 'b', ArrowDown: 'b',
  KeyA: 'l', ArrowLeft: 'l',
  KeyD: 'r', ArrowRight: 'r',
}

export default function useKeyboard() {
  useEffect(() => {
    const down = (e) => {
      const k = MAP[e.code]
      if (!k) return
      // Only steal keys in explore mode. In story mode arrows still scroll the page.
      if (useStory.getState().mode !== 'explore') return
      e.preventDefault()
      input.keys.add(k)
    }

    const up = (e) => {
      const k = MAP[e.code]
      if (k) input.keys.delete(k)
    }

    const clear = () => input.keys.clear()

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)

    // Leaving explore mode releases any held keys
    const unsub = useStory.subscribe((s, prev) => {
      if (s.mode !== prev.mode && s.mode !== 'explore') clear()
    })

    return () => {
      unsub()
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [])
}