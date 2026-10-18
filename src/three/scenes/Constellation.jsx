import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { smooth, fx } from '../progress'
import { band } from '../../content/chapters'
import { wasTap } from '../rig/rigState'
import { useStory } from '../../store/useStory'
import useOptionalTexture from '../useOptionalTexture'
import { STAR_PHOTOS } from '../../content/photos'
import { HEART_TILT } from '../CameraDirector'
import { planeVertex, starFragment, segFragment } from '../shaders/constellation'
import { cardVertex, cardFragment } from '../shaders/orbit'

const N = STAR_PHOTOS.length
const DIST = 30        // heart distance from her
const HEART_W = 22     // heart width in world units
const STAR_SIZE = 1.4
const HIT_SIZE = 3     // larger invisible tap area (fingers)
const LINE_W = 0.35
const CARD_H = 1.6
const PAD = 0.15
const FOCUS_DIST = 3.2
const FOCUS_SCALE = 1.4
const DRAW_TIME = 2.5  // seconds for the final heart sweep

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const easeOut = (t) => 1 - Math.pow(1 - t, 3)
const ease = (t) => t * t * (3 - 2 * t)

const _dir = new THREE.Vector3()
const _v = new THREE.Vector3()

// ── Heart curve sampled at equal arc length ──
function heartPoints(n, width) {
  const dense = []
  for (let i = 0; i <= 2000; i++) {
    const t = (i / 2000) * Math.PI * 2
    const x = 16 * Math.pow(Math.sin(t), 3)
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
    dense.push(new THREE.Vector2(x, y))
  }
  const cum = [0]
  for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + dense[i].distanceTo(dense[i - 1]))
  const total = cum[cum.length - 1]

  const pts = []
  let j = 0
  for (let k = 0; k < n; k++) {
    const target = (k / n) * total
    while (cum[j + 1] < target) j++
    pts.push(dense[j].clone())
  }

  const minY = Math.min(...dense.map((p) => p.y))
  const maxY = Math.max(...dense.map((p) => p.y))
  const s = width / 32
  return pts.map((p) => new THREE.Vector2(p.x * s, (p.y - (minY + maxY) / 2) * s))
}

// Shared per-frame state, written by the root, read by children
const shared = { draw: 0, pulse: 1, fade: 0 }

// ── Star ──
function Star({ index, pos }) {
  const [hovered, setHovered] = useState(false)
  const gl = useThree((s) => s.gl)
  const group = useRef()
  const seenW = useRef(0)

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: planeVertex,
        fragmentShader: starFragment,
        uniforms: {
          uTime: { value: 0 },
          uSeed: { value: Math.random() },
          uSeen: { value: 0 },
          uHover: { value: 0 },
          uOpacity: { value: 0 },
          uPulse: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  )

  const hitMat = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    []
  )

  useEffect(() => {
    gl.domElement.style.cursor = hovered ? 'pointer' : useStory.getState().mode === 'explore' ? 'grab' : 'default'
  }, [hovered, gl])

  useFrame((state, dt) => {
    const p = smooth.p
    const { seen, starFocus } = useStory.getState()

    // Stars fall into place one by one
    const birth = easeOut(clamp01((p - 0.68 - index * 0.0008) / 0.012))
    group.current.position.set(pos.x, pos.y + (1 - birth) * 6, 0)

    seenW.current = THREE.MathUtils.damp(seenW.current, seen.includes(index) ? 1 : 0, 3, dt)

    const u = material.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uSeen.value = seenW.current
    u.uHover.value = THREE.MathUtils.damp(u.uHover.value, hovered ? 1 : 0, 8, dt)
    u.uPulse.value = shared.pulse
    u.uOpacity.value = birth * shared.fade * (starFocus !== null && starFocus !== index ? 0.4 : 1)
  })

  return (
    <group ref={group}>
      <mesh material={material} scale={STAR_SIZE * (hovered ? 1.3 : 1)}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh
        material={hitMat}
        scale={HIT_SIZE}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          if (!wasTap() || material.uniforms.uOpacity.value < 0.3) return
          e.stopPropagation()
          const { starFocus, setStarFocus, markSeen } = useStory.getState()
          setStarFocus(starFocus === index ? null : index)
          markSeen(index)
          navigator.vibrate?.(15)
        }}
      >
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  )
}

// ── Line between star i and star i+1 ──
function Segment({ index, a, b }) {
  const lit = useRef(0)

  const { mid, len, angle } = useMemo(() => {
    const d = new THREE.Vector2().subVectors(b, a)
    return {
      mid: new THREE.Vector2().addVectors(a, b).multiplyScalar(0.5),
      len: Math.max(0.01, d.length() - STAR_SIZE * 0.5), // small gap at each star
      angle: Math.atan2(d.y, d.x),
    }
  }, [a, b])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: planeVertex,
        fragmentShader: segFragment,
        uniforms: { uFill: { value: 0 }, uOpacity: { value: 1 }, uPulse: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  )

  useFrame((_, dt) => {
    const { seen } = useStory.getState()
    const both = seen.includes(index) && seen.includes((index + 1) % N)
    lit.current = THREE.MathUtils.damp(lit.current, both ? 1 : 0, 2.5, dt)

    const sweep = clamp01(shared.draw * N - index) // final sweep, one line after another
    const u = material.uniforms
    u.uFill.value = Math.max(lit.current, sweep)
    u.uOpacity.value = shared.fade
    u.uPulse.value = shared.pulse
  })

  return (
    <mesh material={material} position={[mid.x, mid.y, -0.01]} rotation={[0, 0, angle]} scale={[len, LINE_W, 1]}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}

// ── Photo that unfolds out of a star ──
function StarCard({ index, root, localPos }) {
  const mesh = useRef()
  const camera = useThree((s) => s.camera)
  const tex = useOptionalTexture(STAR_PHOTOS[index].src)
  const w = useRef(0)
  const anchor = useRef(new THREE.Vector3())
  const start = useRef(new THREE.Vector3())
  const wasFocused = useRef(false)

  const imgAspect = tex?.image ? tex.image.width / tex.image.height : 1
  const cardAspect = Math.min(1.4, Math.max(0.7, imgAspect))

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: cardVertex,
        fragmentShader: cardFragment,
        uniforms: {
          uMap: { value: null },
          uHasMap: { value: 0 },
          uImgAspect: { value: 1 },
          uCardAspect: { value: 1 },
          uPad: { value: PAD },
          uOpacity: { value: 0 },
          uGlow: { value: 1.4 },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  )

  useEffect(() => {
    const u = material.uniforms
    u.uMap.value = tex
    u.uHasMap.value = tex ? 1 : 0
    u.uImgAspect.value = imgAspect
    u.uCardAspect.value = cardAspect
  }, [tex, imgAspect, cardAspect, material])

  useFrame((_, dt) => {
    const isFocus = useStory.getState().starFocus === index

    if (isFocus && !wasFocused.current) {
      camera.getWorldDirection(_dir)
      anchor.current.copy(camera.position).addScaledVector(_dir, FOCUS_DIST)
    }
    wasFocused.current = isFocus
    w.current = THREE.MathUtils.damp(w.current, isFocus ? 1 : 0, 4, dt)

    mesh.current.visible = w.current > 0.002
    if (!mesh.current.visible) return

    // Start at the star in world space, glide toward her
    _v.set(localPos.x, localPos.y, 0)
    start.current.copy(root.current.localToWorld(_v))
    mesh.current.position.lerpVectors(start.current, anchor.current, ease(w.current))
    mesh.current.lookAt(camera.position)

    // Unfold: width opens first, then height
    const sx = ease(clamp01(w.current * 2))
    const sy = ease(clamp01(w.current * 1.6 - 0.3))
    const s = CARD_H * FOCUS_SCALE
    mesh.current.scale.set(
      s * (cardAspect + 2 * PAD) * Math.max(sx, 0.001),
      s * (1 + 2 * PAD) * Math.max(sy, 0.02),
      1
    )
    material.uniforms.uOpacity.value = clamp01(w.current * 3)
  })

  return (
    <mesh
      ref={mesh}
      material={material}
      renderOrder={50}
      visible={false}
      onClick={(e) => {
        if (!wasTap()) return
        e.stopPropagation()
        useStory.getState().setStarFocus(null)
      }}
    >
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}

export default function Constellation() {
  const root = useRef()
  const camera = useThree((s) => s.camera)
  const completeAt = useRef(null)

  const points = useMemo(() => heartPoints(N, HEART_W), [])

  useFrame((state) => {
    const p = smooth.p
    const t = state.clock.elapsedTime
    const visible = p > 0.675 && p < 0.95
    root.current.visible = visible
    if (!visible) {
      completeAt.current = null
      return
    }

    // Place heart in the sky in front of her, facing her
    _dir.set(0, Math.sin(HEART_TILT), -Math.cos(HEART_TILT))
    root.current.position.copy(fx.sunPos).addScaledVector(_dir, DIST)
    root.current.lookAt(fx.sunPos)

    // Fit on narrow screens
    const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * DIST * camera.aspect
    root.current.scale.setScalar(Math.min(1, (halfW * 0.9) / (HEART_W / 2)))

    // Heart completes when all stars are opened, or by scrolling to the end
    const allSeen = useStory.getState().seen.length >= N
    if (allSeen && completeAt.current === null) completeAt.current = t
    const timeDraw = completeAt.current !== null ? clamp01((t - completeAt.current) / DRAW_TIME) : 0
    const scrollDraw = clamp01((p - 0.8) / 0.025)
    shared.draw = Math.max(timeDraw, scrollDraw)

    // Heartbeat once the heart is whole
    const whole = clamp01(shared.draw * 1.2 - 0.2)
    const s1 = Math.max(Math.sin(t * 2.2), 0)
    const s2 = Math.max(Math.sin(t * 2.2 - 0.5), 0)
    shared.pulse = 1 + whole * (0.35 * Math.pow(s1, 12) + 0.2 * Math.pow(s2, 12))

    // Gentle fade during the apology so the letter takes focus
    shared.fade = band(p, 0.675, 0.69) * (1 - 0.5 * band(p, 0.84, 0.87))
  })

  return (
    <>
      <group ref={root} visible={false}>
        {points.map((pt, i) => (
          <Segment key={`s${i}`} index={i} a={pt} b={points[(i + 1) % N]} />
        ))}
        {points.map((pt, i) => (
          <Star key={`st${i}`} index={i} pos={pt} />
        ))}
      </group>

      {points.map((pt, i) => (
        <StarCard key={`c${i}`} index={i} root={root} localPos={pt} />
      ))}
    </>
  )
}