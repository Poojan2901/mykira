import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { fx } from '../progress'
import { useStory } from '../../store/useStory'
import { burstVertex, burstFragment } from '../shaders/sunrise'

const PALETTE = ['#ffd27a', '#ffb347', '#fff2d0', '#ff9f9f', '#ffc8a0']

export default function Celebration({ count = 1600 }) {
  const gl = useThree((s) => s.gl)
  const points = useRef()

  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    const v = new THREE.Vector3()
    const c = new THREE.Color()

    for (let i = 0; i < count; i++) {
      v.randomDirection()
      v.y = Math.abs(v.y) * 0.8 + 0.2 // mostly upward
      v.normalize().multiplyScalar(3 + Math.random() * 5)
      vel.set([v.x, v.y, v.z], i * 3)
      c.set(PALETTE[(Math.random() * PALETTE.length) | 0])
      col.set([c.r, c.g, c.b], i * 3)
      seed[i] = Math.random()
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aVel', new THREE.BufferAttribute(vel, 3))
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    return g
  }, [count])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: burstVertex,
        fragmentShader: burstFragment,
        uniforms: {
          uT: { value: 0 },
          uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [gl]
  )

  useFrame(() => {
    const { answer, answerAt } = useStory.getState()
    const active = answer === 'yes'
    points.current.visible = active
    if (!active) return

    // Burst in front of her, a little above the horizon
    points.current.position.copy(fx.sunPos).add({ x: 0, y: 1.5, z: -10 })
    material.uniforms.uT.value = (performance.now() - answerAt) / 1000
  })

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} visible={false} />
}