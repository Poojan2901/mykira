import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStory } from '../store/useStory'
import { smooth } from './progress'

// Runs before every other useFrame (priority -1)
export default function ProgressDamper() {
  useFrame((_, dt) => {
    const target = useStory.getState().progress
    smooth.p = THREE.MathUtils.damp(smooth.p, target, 3, Math.min(dt, 0.1))
  }, -1)
  return null
}