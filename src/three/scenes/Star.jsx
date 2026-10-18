import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { smooth, fx } from '../progress'
import { band } from '../../content/chapters'
import { sunVertex, sunFragment, coronaVertex, coronaFragment } from '../shaders/sun'

const RADIUS = 3
const FAR = 600
const NEAR = 14

const _cold = new THREE.Color('#7fa3ff')

export default function Star() {
  const camera = useThree((s) => s.camera)
  const group = useRef()
  const core = useRef()
  const corona = useRef()
  const light = useRef()

  const coreMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: sunVertex,
        fragmentShader: sunFragment,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
          uWarmth: { value: 1 },
          uCrack: { value: 0 },
        },
      }),
    []
  )

  const coronaMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: coronaVertex,
        fragmentShader: coronaFragment,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
          uWarmth: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  )

  useFrame((state) => {
    const p = smooth.p
    const t = state.clock.elapsedTime

    const appear = band(p, 0.04, 0.075)

    const approach = band(p, 0.06, 0.26)
    const dist = FAR * Math.pow(NEAR / FAR, approach)
    group.current.position.set(0, 0, -dist)
    fx.sunPos.copy(group.current.position)

    const steady = band(p, 0.06, 0.1)
    const flickerAmt = (1 - steady) * 0.6
    const flicker = 1 - flickerAmt * (0.5 + 0.5 * Math.sin(t * 7.0) * Math.sin(t * 3.1))

    const s = Math.sin(t * 2.2)
    const s2 = Math.sin(t * 2.2 - 0.5)
    const beat = 1 + 0.08 * Math.pow(Math.max(s, 0), 12) + 0.05 * Math.pow(Math.max(s2, 0), 12)

    const bright =
      appear * flicker * beat * (0.8 + 3.2 * band(p, 0.07, 0.22)) * fx.sunBoost * fx.sunDim

    coreMat.uniforms.uTime.value = t
    coreMat.uniforms.uIntensity.value = bright
    coreMat.uniforms.uWarmth.value = fx.warmth
    coreMat.uniforms.uCrack.value = fx.crack

    coronaMat.uniforms.uTime.value = t
    coronaMat.uniforms.uIntensity.value = bright
    coronaMat.uniforms.uWarmth.value = fx.warmth

    const coronaSize = Math.max(RADIUS * 7, dist * 0.035)
    corona.current.scale.setScalar(coronaSize)

    // Once she is inside, the outer surface disappears: SunCore takes over
    const camDist = camera.position.distanceTo(group.current.position)
    const outside = camDist > RADIUS * 1.08
    core.current.visible = outside
    corona.current.visible = outside

    core.current.rotation.y = t * 0.03

    light.current.intensity = bright * 40
    light.current.color.setRGB(1, 0.81, 0.48).lerp(_cold, 1 - fx.warmth)
  })

  return (
    <group ref={group}>
      <mesh ref={core} material={coreMat}>
        <sphereGeometry args={[RADIUS, 128, 128]} />
      </mesh>

      <Billboard>
        <mesh ref={corona} material={coronaMat}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      </Billboard>

      <pointLight ref={light} color="#ffcf7a" distance={0} decay={1} />
    </group>
  )
}