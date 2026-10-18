import * as THREE from 'three'

// Raw input, written by listeners, consumed every frame by the rig
export const input = {
  dragging: false,
  pointerId: null,
  lastX: 0,
  lastY: 0,
  dragDist: 0,       // total px moved in current/last press
  lookDX: 0,         // px accumulated since last frame
  lookDY: 0,
  keys: new Set(),   // 'f' | 'b' | 'l' | 'r'
  joy: { x: 0, y: 0 }, // touch joystick, -1..1
}

// Story-controlled camera pose. Later chapters write to rig.base.
export const rig = {
  base: {
    pos: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    pitch: 0,
  },
  exploreRadius: 6,  // how far she can drift from base.pos in explore mode
  moveSpeed: 4,      // units per second
  lookSpeed: 0.0032, // radians per pixel
  invertLook: false, // false = drag the world (like Street View)
  swayScale: 1,
}

// Use inside onClick handlers: true only if the press was not a drag
export const wasTap = () => input.dragDist < 8