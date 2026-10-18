import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { smooth, fx } from '../progress'
import { wasTap } from '../rig/rigState'
import { useStory } from '../../store/useStory'
import useOptionalTexture from '../useOptionalTexture'
import { ORBIT_PHOTOS } from '../../content/photos'
import { cardVertex, cardFragment } from '../shaders/orbit'

const H = 1.6            // card height in world units
const PAD = 0.15         // glow margin around card
const FOCUS_DIST = 3.2   // how close a tapped photo comes
const FOCUS_SCALE = 1.4
const R_MIN = 6
const R_MAX = 20
const PER_RING = 4       // photos sharing one orbit ring
const LOAD_AT = 0.45     // start loading photos during the hurt chapter

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const easeOut = (t) => 1 - Math.pow(1 - t, 3)
const easeIn = (t) => t * t * t

// Burst timing stays the same length no matter how many photos
const STAGGER = 0.03 / Math.max(1, ORBIT_PHOTOS.length)
const birthOf = (i, p) => easeOut(clamp01((p - 0.556 - i * STAGGER) / 0.03))
const exitOf = (p) => easeIn(clamp01((p - 0.66) / 0.022))

const _local = new THREE.Vector3()
const _world = new THREE.Vector3()
const _dir = new THREE.Vector3()

function OrbitLine({ o, index }) {
  const geometry = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 160; i++) {
      const th = (i / 160) * Math.PI * 2
      pts.push(new THREE.Vector3(o.a * Math.cos(th), 0, o.b * Math.sin(th)))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [o])

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#ffb860',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  )

  useFrame(() => {
    const p = smooth.p
    const focused = useStory.getState().focusId !== null
    material.opacity = 0.16 * birthOf(index, p) * (1 - exitOf(p)) * (focused ? 0.4 : 1)
  })

  return <line geometry={geometry} material={material} quaternion={o.tilt} />
}

function OrbitCard({ photo, o, index, clock, load }) {
  const mesh = useRef()
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const tex = useOptionalTexture(photo.src, load)
  const [hovered, setHovered] = useState(false)

  const focusW = useRef(0)
  const anchor = useRef(new THREE.Vector3())
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
          uGlow: { value: 1 },
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

  useEffect(() => {
    const explore = useStory.getState().mode === 'explore'
    gl.domElement.style.cursor = hovered ? 'pointer' : explore ? 'grab' : 'default'
  }, [hovered, gl])

  useFrame((state, dt) => {
    const p = smooth.p
    const { focusId } = useStory.getState()
    const isFocus = focusId === index

    // Freeze the spot in front of her at the moment she taps
    if (isFocus && !wasFocused.current) {
      camera.getWorldDirection(_dir)
      anchor.current.copy(camera.position).addScaledVector(_dir, FOCUS_DIST)
    }
    wasFocused.current = isFocus
    focusW.current = THREE.MathUtils.damp(focusW.current, isFocus ? 1 : 0, 5, dt)

    const birth = birthOf(index, p)
    const exit = exitOf(p)

    const th = o.phase + clock.current * o.speed
    _local
      .set(o.a * Math.cos(th), 0, o.b * Math.sin(th))
      .applyQuaternion(o.tilt)
      .multiplyScalar(birth * (1 + exit * 1.5))
    _local.y += exit * 8

    _world.copy(_local).add(fx.sunPos).lerp(anchor.current, focusW.current)

    mesh.current.position.copy(_world).sub(fx.sunPos)
    mesh.current.lookAt(camera.position)

    const s =
      H *
      (1 + focusW.current * (FOCUS_SCALE - 1)) *
      (hovered && !isFocus ? 1.08 : 1) *
      Math.max(birth, 0.001)
    mesh.current.scale.set(s * (cardAspect + 2 * PAD), s * (1 + 2 * PAD), 1)

    const dimOthers = focusId !== null && !isFocus ? 0.3 : 1
    material.uniforms.uOpacity.value = birth * (1 - exit) * dimOthers
    material.uniforms.uGlow.value = 1 + (hovered ? 0.6 : 0) + focusW.current * 0.5
  })

  return (
    <mesh
      ref={mesh}
      material={material}
      renderOrder={10 + index}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        if (!wasTap() || material.uniforms.uOpacity.value < 0.2) return
        e.stopPropagation()
        const { focusId, setFocus } = useStory.getState()
        setFocus(focusId === index ? null : index)
        navigator.vibrate?.(15)
      }}
    >
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}

export default function OrbitGallery() {
  const root = useRef()
  const clock = useRef(0)

  // Lazy load: flips true once she nears this chapter, then stays true
  const near = useStory((s) => s.progress > LOAD_AT)
  const [load, setLoad] = useState(false)
  useEffect(() => {
    if (near) setLoad(true)
  }, [near])

  const { orbits, rings } = useMemo(() => {
    const n = ORBIT_PHOTOS.length
    const ringCount = Math.ceil(n / PER_RING)

    const rings = Array.from({ length: ringCount }, (_, r) => {
      const radius = R_MIN + (ringCount > 1 ? (r / (ringCount - 1)) * (R_MAX - R_MIN) : 0)
      return {
        a: radius,
        b: radius * (0.82 + Math.random() * 0.18),
        tilt: new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            (Math.random() - 0.5) * 1.1,
            Math.random() * Math.PI * 2,
            (Math.random() - 0.5) * 0.6
          )
        ),
        phase: Math.random() * Math.PI * 2,
        speed: 0.12 * Math.pow(R_MIN / radius, 1.5), // inner rings faster
        first: r * PER_RING,
      }
    })

    // Photos on the same ring are spaced evenly around it
    const orbits = ORBIT_PHOTOS.map((_, i) => {
      const r = Math.floor(i / PER_RING)
      const inRing = Math.min(PER_RING, n - r * PER_RING)
      const slot = i % PER_RING
      return { ...rings[r], phase: rings[r].phase + (slot / inRing) * Math.PI * 2 }
    })

    return { orbits, rings }
  }, [])

  useFrame((_, dt) => {
    const p = smooth.p
    const visible = p > 0.55 && p < 0.685
    root.current.visible = visible
    if (!visible) return
    root.current.position.copy(fx.sunPos)
    const focused = useStory.getState().focusId !== null
    clock.current += Math.min(dt, 0.05) * (focused ? 0.15 : 1)
  })

  return (
    <group ref={root} visible={false}>
      {rings.map((o, r) => (
        <OrbitLine key={`ring${r}`} o={o} index={o.first} />
      ))}
      {ORBIT_PHOTOS.map((photo, i) => (
        <OrbitCard key={photo.src} photo={photo} o={orbits[i]} index={i} clock={clock} load={load} />
      ))}
    </group>
  )
}