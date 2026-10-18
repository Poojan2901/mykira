import { ORBIT_CAPTIONS, STAR_CAPTIONS } from './captions'

const pad = (n) => String(n).padStart(2, '0')

// Become the Sun: one entry per file in public/photos/orbit (01.webp, 02.webp ...)
export const ORBIT_PHOTOS = ORBIT_CAPTIONS.map((caption, i) => ({
  src: `/photos/orbit/${pad(i + 1)}.webp`,
  caption,
}))

// Constellation: one entry per file in public/photos/stars
export const STAR_PHOTOS = STAR_CAPTIONS.map((caption, i) => ({
  src: `/photos/stars/${pad(i + 1)}.webp`,
  caption,
}))