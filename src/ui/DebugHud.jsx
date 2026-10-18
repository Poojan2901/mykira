import { useStory } from '../store/useStory'

export default function DebugHud() {
  const { progress, chapter, mode } = useStory()
    if (!new URLSearchParams(window.location.search).has('debug')) return null
  return (
    <div className="fixed top-3 left-3 z-50 font-mono text-xs bg-black/60 px-3 py-2 rounded pointer-events-none">
      <div>progress: {progress.toFixed(3)}</div>
      <div>chapter: {chapter}</div>
      <div>mode: {mode}</div>
    </div>
  )
}