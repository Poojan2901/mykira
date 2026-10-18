import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { fx } from '../progress'
import {
  skyDomeVertex, skyDomeFragment,
  planetVertex, planetFragment,
  newSunVertex, newSunFragment,
} from '../shaders/sunrise'

const PLANET_R = 1000
const EYE_HEIGHT = 8       // horizon sits ~7 degrees below eye level
const SUN_DIST = 300
const SUN_SIZE = 34
const ELEV_START = -0.12   // radians: below horizon
const ELEV_END = 0.1       // radians: risen

const _sunDir = new THREE.Vector3()

export default function Sunrise() {
  const root = useRef()
  const sun = useRef()

  const domeMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyDomeVertex,
        fragmentShader: skyDomeFragment,
        uniforms: {
          uDawn: { value: 0 },
          uRise: { value: 0 },
          uSunDir: { value: new THREE.Vector3(0, 0, -1) },
        },
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      }),
    []
  )

  const planetMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: planetVertex,
        fragmentShader: planetFragment,
        uniforms: {
          uSunDir: { value: new THREE.Vector3(0, 0, -1) },
          uRise: { value: 0 },
          uOpacity: { value: 0 },
        },
        transparent: true,
      }),
    []
  )

  const sunMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: newSunVertex,
        fragmentShader: newSunFragment,
        uniforms: { uIntensity: { value: 0 }, uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  )

  useFrame((state) => {
    const visible = fx.dawn > 0.01
    root.current.visible = visible
    if (!visible) return

    root.current.position.copy(fx.sunPos) // centred on her

    const elev = THREE.MathUtils.lerp(ELEV_START, ELEV_END, fx.rise)
    _sunDir.set(0, Math.sin(elev), -Math.cos(elev))
    sun.current.position.copy(_sunDir).multiplyScalar(SUN_DIST)

    domeMat.uniforms.uDawn.value = fx.dawn
    domeMat.uniforms.uRise.value = fx.rise
    domeMat.uniforms.uSunDir.value.copy(_sunDir)

    planetMat.uniforms.uSunDir.value.copy(_sunDir)
    planetMat.uniforms.uRise.value = fx.rise
    planetMat.uniforms.uOpacity.value = fx.dawn

    sunMat.uniforms.uIntensity.value = fx.dawn * (0.4 + 0.6 * fx.rise)
    sunMat.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <group ref={root} visible={false}>
      <mesh material={domeMat} renderOrder={-2}>
        <sphereGeometry args={[180, 64, 32]} />
      </mesh>

      <group ref={sun}>
        <Billboard>
          <mesh material={sunMat} scale={SUN_SIZE} renderOrder={-1}>
            <planeGeometry args={[1, 1]} />
          </mesh>
        </Billboard>
      </group>

      <mesh material={planetMat} position={[0, -(PLANET_R + EYE_HEIGHT), 0]}>
        <sphereGeometry args={[PLANET_R, 128, 64]} />
      </mesh>
    </group>
  )
}