import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { smooth, fx } from '../progress'
import { local } from '../../content/chapters'
import { loadFont, sampleTexts } from '../textPoints'
import { nameVertex, nameFragment } from '../shaders/name'

const NAMES = ['Kira', 'Krishi']
const FONT = '500 220px "Cormorant Garamond"'
const TEXT_W = 6.5      // world width of the longer name
const NAME_DIST = 8     // distance in front of camera
const NAME_Y = -2.3     // below the sun, in the darker part of screen
const SUN_RADIUS = 3

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const ease = (t) => t * t * (3 - 2 * t)
const _sunLocal = new THREE.Vector3()

export default function NameParticles() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const group = useRef()
  const [geometry, setGeometry] = useState(null)

  const isTouch = useMemo(() => window.matchMedia('(pointer: coarse)').matches, [])
  const count = isTouch ? 2200 : 4500

  // Build geometry once the font is ready
  useEffect(() => {
    let alive = true
    ;(async () => {
      await loadFont(FONT)
      if (!alive) return

      const [a, b] = sampleTexts(NAMES, count, { width: TEXT_W })
      const start = new Float32Array(count * 3)
      const seed = new Float32Array(count)
      const dir = new THREE.Vector3()

      for (let i = 0; i < count; i++) {
        dir.randomDirection().multiplyScalar(SUN_RADIUS * 1.02)
        start.set([dir.x, dir.y, dir.z], i * 3)
        seed[i] = Math.random()
      }

      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(a, 3))
      g.setAttribute('aB', new THREE.BufferAttribute(b, 3))
      g.setAttribute('aStart', new THREE.BufferAttribute(start, 3))
      g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
      setGeometry(g)
    })()
    return () => {
      alive = false
    }
  }, [count])

  useEffect(() => () => geometry?.dispose(), [geometry])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: nameVertex,
        fragmentShader: nameFragment,
        uniforms: {
          uForm: { value: 0 },
          uMorph: { value: 0 },
          uAbsorb: { value: 0 },
          uTime: { value: 0 },
          uOpacity: { value: 1 },
          uSize: { value: isTouch ? 4 : 3 },
          uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
          uSun: { value: new THREE.Vector3() },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [gl, isTouch]
  )

  useFrame((state) => {
    const p = smooth.p
    const k = local(p, 'kira')
    const visible = p > 0.15 && p < 0.275

    // ── Sun brightness choreography (this chapter owns sunBoost) ──
    if (p > 0.14 && p < 0.29) {
      const reveal = k < 0.12 ? Math.sin((Math.PI * k) / 0.12) : 0
      const dim = ease(clamp01((k - 0.1) / 0.25)) * (1 - ease(clamp01((k - 0.8) / 0.15)))
      const absorbFlash = Math.sin(Math.PI * clamp01((k - 0.9) / 0.1))
      fx.sunBoost = 1 + 0.45 * reveal - 0.3 * dim + 0.35 * absorbFlash
    } else {
      fx.sunBoost = 1
    }

    if (!group.current) return
    group.current.visible = visible && !!geometry
    if (!group.current.visible) return

    // Fit name to screen width (important on phones)
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * NAME_DIST
    const halfW = halfH * camera.aspect
    const s = Math.min(1, (halfW * 0.85) / (TEXT_W / 2))
    group.current.scale.setScalar(s)

    // Sun centre in the group's local space
    _sunLocal.copy(fx.sunPos).sub(group.current.position).divideScalar(s)

    const u = material.uniforms
    u.uSun.value.copy(_sunLocal)
    u.uTime.value = state.clock.elapsedTime
    u.uForm.value = clamp01((k - 0.08) / 0.32)
    u.uMorph.value = clamp01((k - 0.52) / 0.18)
    u.uAbsorb.value = clamp01((k - 0.8) / 0.18)
  })

  return (
    <group ref={group} position={[0, NAME_Y, -NAME_DIST]} visible={false}>
      {geometry && <points geometry={geometry} material={material} frustumCulled={false} />}
    </group>
  )
}