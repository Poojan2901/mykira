import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { smooth } from '../progress'
import { wasTap } from '../rig/rigState'
import useOptionalTexture from '../useOptionalTexture'
import { MEMORY_WINDOWS } from '../../content/memories'
import { shellVertex, shellFragment, photoVertex, photoFragment, haloFragment } from '../shaders/orb'

const RADIUS = 1.1
const HOLD_DIST = 6
const HIDDEN = new THREE.Vector3(0, 0, 1e5)

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const easeOut = (t) => 1 - Math.pow(1 - t, 3)
const easeIn = (t) => t * t * t
const lerp = THREE.MathUtils.lerp

function MemoryOrb({ m, index }) {
  const group = useRef()
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const tex = useOptionalTexture(m.photo)
  const [hovered, setHovered] = useState(false)
  const kick = useRef(0)
  const scale = useRef(1)

  const tint = useMemo(() => new THREE.Color(m.tint), [m.tint])

  const shellMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: shellVertex,
        fragmentShader: shellFragment,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
          uHasPhoto: { value: 0 },
          uSeed: { value: index * 1.37 },
          uTint: { value: tint },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [tint, index]
  )

  const photoMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: photoVertex,
        fragmentShader: photoFragment,
        uniforms: {
          uMap: { value: null },
          uAspect: { value: 1 },
          uOpacity: { value: 0 },
          uTint: { value: tint },
        },
        transparent: true,
        depthWrite: false,
      }),
    [tint]
  )

  const haloMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: photoVertex,
        fragmentShader: haloFragment,
        uniforms: { uIntensity: { value: 0 }, uTint: { value: tint } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [tint]
  )

  useEffect(() => {
    photoMat.uniforms.uMap.value = tex
    shellMat.uniforms.uHasPhoto.value = tex ? 1 : 0
    if (tex?.image) photoMat.uniforms.uAspect.value = tex.image.width / tex.image.height
  }, [tex, photoMat, shellMat])

  useEffect(() => {
    gl.domElement.style.cursor = hovered ? 'pointer' : 'default'
  }, [hovered, gl])

  useFrame((state, dt) => {
    const [a, b] = m.win
    const t = (smooth.p - a) / (b - a)
    const visible = t > 0 && t < 1

    if (!visible) {
      group.current.visible = false
      group.current.position.copy(HIDDEN) // keeps raycasts off hidden orbs
      if (hovered) setHovered(false)
      return
    }
    group.current.visible = true

    // ── Path: arrive from sun, hold beside her, glide past ──
    const enter = easeOut(clamp01(t / 0.35))
    const hold = clamp01((t - 0.35) / 0.4)
    const exit = easeIn(clamp01((t - 0.75) / 0.25))

    let z = lerp(-30, -HOLD_DIST, enter)
    z = lerp(z, -HOLD_DIST + 1.5, hold)
    z = lerp(z, 6, exit)

    const portrait = camera.aspect < 1
    const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * HOLD_DIST * camera.aspect
    const xHold = portrait ? 0 : m.side * Math.min(3.2, halfW * 0.5)
    const x = xHold * (1 + exit * 1.5) // drifts outward as it passes
    const y = (portrait ? 1.3 : 0.3) + Math.sin(state.clock.elapsedTime * 0.8 + index) * 0.15

    group.current.position.set(x, y, z)

    // ── Glow, hover, tap pulse ──
    const fade = clamp01(t / 0.12) * (1 - clamp01((t - 0.9) / 0.1))
    const intensity = fade * (m.dim ? 0.55 : 1) * (hovered ? 1.3 : 1)

    kick.current = THREE.MathUtils.damp(kick.current, 0, 4, dt)
    scale.current = THREE.MathUtils.damp(scale.current, (hovered ? 1.08 : 1) + kick.current, 8, dt)
    group.current.scale.setScalar(scale.current)

    shellMat.uniforms.uTime.value = state.clock.elapsedTime
    shellMat.uniforms.uIntensity.value = intensity
    photoMat.uniforms.uOpacity.value = fade * (m.dim ? 0.7 : 1)
    haloMat.uniforms.uIntensity.value = intensity * (1 + kick.current * 2)
  })

  return (
    <group ref={group} visible={false} position={HIDDEN}>
      <Billboard>
        <mesh material={haloMat} scale={RADIUS * 5} renderOrder={0}>
          <planeGeometry args={[1, 1]} />
        </mesh>
        {tex && (
          <mesh material={photoMat} scale={RADIUS * 1.6} renderOrder={1}>
            <planeGeometry args={[1, 1]} />
          </mesh>
        )}
      </Billboard>

      <mesh
        material={shellMat}
        renderOrder={2}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          if (!wasTap()) return
          e.stopPropagation()
          kick.current = 0.35
          navigator.vibrate?.(15)
        }}
      >
        <sphereGeometry args={[RADIUS, 64, 64]} />
      </mesh>
    </group>
  )
}

export default function MemoryOrbs() {
  return MEMORY_WINDOWS.map((m, i) => <MemoryOrb key={m.id} m={m} index={i} />)
}