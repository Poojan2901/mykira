import { Canvas } from '@react-three/fiber'
import Experience from './three/Experience'
import ScrollDirector from './scroll/ScrollDirector'
import Overlay from './ui/Overlay'
import DebugHud from './ui/DebugHud'
import { SCROLL_VH } from './content/chapters'
import { useStory } from './store/useStory'
import { wasTap } from './three/rig/rigState'

export default function App() {
  return (
    <>
      <div className="canvas-wrap">
        <Canvas
          dpr={[1, 2]}
          camera={{ fov: 70, near: 0.1, far: 2000, position: [0, 0, 0] }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          onPointerMissed={() => {
            if (!wasTap()) return
            const s = useStory.getState()
            if (s.focusId !== null) s.setFocus(null)
            if (s.starFocus !== null) s.setStarFocus(null)
          }}
        >
          <Experience />
        </Canvas>
      </div>

      <div id="scroll-track" style={{ height: `${SCROLL_VH}vh` }} />

      <Overlay />
      <ScrollDirector />
      <DebugHud />
    </>
  )
}