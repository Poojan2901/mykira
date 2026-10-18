import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { fx } from '../progress'
import { skyVertex, skyFragment } from '../shaders/constellation'

export default function Starfield({ count = 1800 }) {
  const gl = useThree((s) => s.gl)
  const points = useRef()

  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    const v = new THREE.Vector3()
    for (let i = 0; i < count; i++) {
      v.randomDirection().multiplyScalar(200)
      pos.set([v.x, v.y, v.z], i * 3)
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
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        uniforms: {
          uTime: { value: 0 },
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
    points.current.visible = fx.night > 0.01
    if (!points.current.visible) return
    points.current.position.copy(fx.sunPos) // sky centred on her
    material.uniforms.uTime.value = state.clock.elapsedTime
    material.uniforms.uOpacity.value = fx.night
  })

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
}