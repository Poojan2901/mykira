import * as THREE from 'three'

export const smooth = { p: 0 }

export const fx = {
  sunPos: new THREE.Vector3(0, 0, -600), // written by Star
  sunBoost: 1,
  sunDim: 1,
  warmth: 1,
  crack: 0,
  cold: 0,
  inside: 0,
  night: 0,
  dawn: 0,  // 0 night, 1 morning sky
  rise: 0,  // 0 new sun below horizon, 1 risen
}