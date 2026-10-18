import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { smooth } from '../progress'
import { band, local } from '../../content/chapters'
import { bokehVertex, bokehFragment } from '../shaders/orb'

const PALETTE = ['#ffd08a', '#ffb38a', '#ff9f9f', '#fff0c8', '#ffc96b']

export default function Bokeh({ count = 260 }) {
  const gl = useThree((s) => s.gl)

  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    const c = new THREE.Color()

    for (let i = 0; i < count; i++) {
      // Keep a clear lane in the middle so the sun and orbs stay visible
      const side = Math.random() < 0.5 ? -1 : 1
      pos[i * 3] = side * (1.2 + Math.random() * 10)
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12
      pos[i * 3 + 2] = -50 + Math.random() * 60
      c.set(PALETTE[(Math.random() * PALETTE.length) | 0])
      col.set([c.r, c.g, c.b], i * 3)
      seed[i] = Math.random()
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    return g
  }, [count])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: bokehVertex,
        fragmentShader: bokehFragment,
        uniforms: {
          uTime: { value: 0 },
          uTravel: { value: 0 },
          uOpacity: { value: 0 },
          uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [gl]
  )

  useFrame((state) => {
    const p = smooth.p
    const u = material.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uTravel.value = local(p, 'joy') * 25 // scrolling = travelling through memories
    u.uOpacity.value = band(p, 0.25, 0.28) * (1 - band(p, 0.39, 0.42))
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}