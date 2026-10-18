import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useStory } from '../store/useStory'

gsap.registerPlugin(ScrollTrigger)

export default function ScrollDirector() {
  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: '#scroll-track',
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => useStory.getState().setProgress(self.progress),
    })
    return () => st.kill()
  }, [])

  return null
}