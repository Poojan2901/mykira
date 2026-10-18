import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { smooth, fx } from '../progress'
import { local } from '../../content/chapters'
import { ringVertex, ringFragment } from '../shaders/ring'

const SIZE = 140

export default function RevealRing() {
  const group = useRef()

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ringVertex,
        fragmentShader: ringFragment,
        uniforms: { uProgress: { value: 0 }, uOpacity: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  )

  useFrame(() => {
    const p = smooth.p
    const k = local(p, 'kira')
    const t = Math.min(1, k / 0.28)
    const visible = p > 0.155 && t < 1

    group.current.visible = visible
    if (!visible) return

    group.current.position.copy(fx.sunPos)
    material.uniforms.uProgress.value = 1 - Math.pow(1 - t, 3) // fast out, slow settle
    material.uniforms.uOpacity.value = 1 - t
  })

  return (
    <group ref={group} visible={false}>
      <Billboard>
        <mesh material={material} scale={SIZE}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      </Billboard>
    </group>
  )
}