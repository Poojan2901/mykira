import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { smooth, fx } from '../progress'
import { band } from '../../content/chapters'
import { dustVertex, dustFragment } from '../shaders/dust'

const WARM_DUST = new THREE.Color(1, 0.85, 0.6)
const COLD_DUST = new THREE.Color(0.6, 0.72, 1)

export default function VoidDust({ count = 2500 }) {
  const gl = useThree((s) => s.gl)

  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      // Random points in a thick spherical shell around the viewer
      const r = 15 + Math.random() * 235
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
      seed[i] = Math.random()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    return g
  }, [count])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: dustVertex,
        fragmentShader: dustFragment,
        uniforms: {
          uTime: { value: 0 },
          uReveal: { value: 0 },
          uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
          uColor: { value: WARM_DUST.clone() },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [gl]
  )

  useFrame((state) => {
    const u = material.uniforms
    u.uTime.value = state.clock.elapsedTime
    // Dust only becomes visible once her light reaches it
    u.uReveal.value = 0.8 * band(smooth.p, 0.08, 0.24)
    u.uColor.value.copy(WARM_DUST).lerp(COLD_DUST, fx.cold)
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}