import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { fx } from '../progress'
import { coreVertex, coreFragment } from '../shaders/orbit'

export default function SunCore() {
  const mesh = useRef()

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: coreVertex,
        fragmentShader: coreFragment,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      }),
    []
  )

  useFrame((state) => {
    const opacity = fx.inside * (1 - fx.night)
    mesh.current.visible = opacity > 0.01
    if (!mesh.current.visible) return
    mesh.current.position.copy(fx.sunPos)
    material.uniforms.uTime.value = state.clock.elapsedTime
    material.uniforms.uOpacity.value = opacity
  })

  return (
    <mesh ref={mesh} material={material} renderOrder={-1} visible={false}>
      <sphereGeometry args={[60, 64, 64]} />
    </mesh>
  )
}