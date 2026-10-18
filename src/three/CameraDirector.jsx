import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { smooth, fx } from './progress'
import { rig } from './rig/rigState'
import { MEMORY_WINDOWS } from '../content/memories'

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const _from = new THREE.Vector3()

export const HEART_TILT = 0.08 // heart sits slightly above eye level

export default function CameraDirector() {
  const camera = useThree((s) => s.camera)

  useFrame(() => {
    const p = smooth.p
    let yaw = 0

    // Joy: look toward the memory beside her (landscape only)
    if (camera.aspect >= 1) {
      for (const m of MEMORY_WINDOWS) {
        const t = (p - m.win[0]) / (m.win[1] - m.win[0])
        if (t > 0 && t < 1) {
          const w = Math.pow(Math.sin(Math.PI * clamp01((t - 0.1) / 0.8)), 2)
          yaw += -m.side * 0.09 * w
        }
      }
    }

    const hurt = fx.cold

    // Become the Sun: travel into the sun's centre
    _from.set(0, 0, 0.8 * hurt)
    rig.base.pos.copy(_from).lerp(fx.sunPos, fx.inside)

    rig.base.yaw = yaw
    rig.base.pitch = -0.07 * hurt + HEART_TILT * fx.night // Constellation: eyes lift to the sky
    rig.swayScale = 1 - 0.7 * hurt
    rig.exploreRadius = 2.5
  })

  return null
}