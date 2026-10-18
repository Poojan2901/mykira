import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStory } from '../../store/useStory'
import { input, rig } from './rigState'
import usePointerLook from './usePointerLook'
import useKeyboard from './useKeyboard'

const PITCH_LIMIT = 1.4 // ~80 degrees
const TAU = Math.PI * 2

const _fwd = new THREE.Vector3()
const _right = new THREE.Vector3()
const _target = new THREE.Vector3()

// Shortest signed angle, so returning from explore never spins the long way
const wrap = (a) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI

const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function FirstPersonRig() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)

  const s = useRef({
    mode: 'scroll',
    yaw: 0,
    pitch: 0,
    pos: new THREE.Vector3(),
    ex: { yaw: 0, pitch: 0, off: new THREE.Vector3() },
    parallax: new THREE.Vector2(),
  }).current

  usePointerLook(gl)
  useKeyboard()

  useEffect(() => {
    camera.rotation.order = 'YXZ'
  }, [camera])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const t = state.clock.elapsedTime
    const mode = useStory.getState().mode

    // ── Mode change handoff ──────────────────────
    if (mode !== s.mode) {
      if (mode === 'explore') {
        s.ex.yaw = s.yaw
        s.ex.pitch = s.pitch
        s.ex.off.set(0, 0, 0) // start exactly at the story position
      } else {
        s.yaw = rig.base.yaw + wrap(s.yaw - rig.base.yaw)
      }
      s.mode = mode
      input.lookDX = 0
      input.lookDY = 0
    }

    let tYaw, tPitch

    if (mode === 'explore') {
      // ── Look ─────────────────────────────────
      const dir = rig.invertLook ? -1 : 1
      s.ex.yaw += input.lookDX * rig.lookSpeed * dir
      s.ex.pitch += input.lookDY * rig.lookSpeed * dir
      s.ex.pitch = THREE.MathUtils.clamp(s.ex.pitch, -PITCH_LIMIT, PITCH_LIMIT)

      // ── Move (as offset from story position) ──
      const k = input.keys
      const f = (k.has('f') ? 1 : 0) - (k.has('b') ? 1 : 0) - input.joy.y
      const r = (k.has('r') ? 1 : 0) - (k.has('l') ? 1 : 0) + input.joy.x

      if (f !== 0 || r !== 0) {
        const { yaw, pitch } = s.ex
        _fwd.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch))
        _right.set(Math.cos(yaw), 0, -Math.sin(yaw))
        s.ex.off
          .addScaledVector(_fwd, f * rig.moveSpeed * dt)
          .addScaledVector(_right, r * rig.moveSpeed * dt)
      }
      if (s.ex.off.length() > rig.exploreRadius) s.ex.off.setLength(rig.exploreRadius)

      tYaw = s.ex.yaw
      tPitch = s.ex.pitch
      _target.copy(rig.base.pos).add(s.ex.off)
    } else {
      // ── Story mode: gaze leans gently toward the pointer ──
      s.parallax.lerp(state.pointer, 1 - Math.exp(-3 * dt))
      tYaw = rig.base.yaw - s.parallax.x * 0.08
      tPitch = rig.base.pitch + s.parallax.y * 0.05
      _target.copy(rig.base.pos)
    }

    input.lookDX = 0
    input.lookDY = 0

    // ── Smooth toward targets ────────────────────
    const lookLambda = mode === 'explore' ? 8 : 2.5
    const posLambda = mode === 'explore' ? 6 : 2
    s.yaw = THREE.MathUtils.damp(s.yaw, tYaw, lookLambda, dt)
    s.pitch = THREE.MathUtils.damp(s.pitch, tPitch, lookLambda, dt)
    s.pos.lerp(_target, 1 - Math.exp(-posLambda * dt))

    // ── Breathing sway ───────────────────────────
    const m = reducedMotion ? 0 : rig.swayScale
    const swayY = Math.sin(t * 0.6) * 0.03 * m
    const swayX = Math.sin(t * 0.37) * 0.015 * m
    const swayYaw = Math.sin(t * 0.27) * 0.004 * m
    const roll = Math.sin(t * 0.4) * 0.006 * m

    camera.position.set(s.pos.x + swayX, s.pos.y + swayY, s.pos.z)
    camera.rotation.set(s.pitch, s.yaw + swayYaw, roll)
  })

  return null
}