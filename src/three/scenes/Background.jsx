import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { smooth, fx } from '../progress'
import { band } from '../../content/chapters'

const BLACK = new THREE.Color('#000000')
const WARM = new THREE.Color('#120804')
const COLD = new THREE.Color('#02050c')
const NIGHT = new THREE.Color('#03040d')
const DAWN = new THREE.Color('#120a1c')

export default function Background() {
  const scene = useThree((s) => s.scene)
  const color = useMemo(() => new THREE.Color('#000000'), [])

  useEffect(() => {
    scene.background = color
  }, [scene, color])

  useFrame(() => {
    color
      .copy(BLACK)
      .lerp(WARM, band(smooth.p, 0.12, 0.26))
      .lerp(COLD, fx.cold)
      .lerp(NIGHT, fx.night)
      .lerp(DAWN, fx.dawn)
  })

  return null
}