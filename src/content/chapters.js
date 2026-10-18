export const CHAPTERS = [
  { id: 'void',          start: 0.00, end: 0.06 },
  { id: 'spark',         start: 0.06, end: 0.16 },
  { id: 'kira',          start: 0.16, end: 0.26 },
  { id: 'joy',           start: 0.26, end: 0.40 },
  { id: 'hurt',          start: 0.40, end: 0.52 },
  { id: 'becomeSun',     start: 0.52, end: 0.68 },
  { id: 'constellation', start: 0.68, end: 0.84 },
  { id: 'apology',       start: 0.84, end: 0.94 },
  { id: 'sunrise',       start: 0.94, end: 1.00 },
]

// Total scroll length in viewport heights. More = slower, calmer story.
export const SCROLL_VH = 2000

export function getChapter(p) {
  return CHAPTERS.find((c) => p >= c.start && p < c.end) ?? CHAPTERS[CHAPTERS.length - 1]
}

// 0..1 progress inside one chapter (clamped)
export function local(p, id) {
  const c = CHAPTERS.find((x) => x.id === id)
  if (!c) return 0
  return Math.min(1, Math.max(0, (p - c.start) / (c.end - c.start)))
}

// Smooth 0..1 between two global progress points
export function band(p, a, b) {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Free-look ranges. Fly-in finishes before explore starts.
export const EXPLORE_RANGES = [
  [0.57, 0.675], // Become the Sun
  [0.7, 0.835],  // Constellation
]

export const isExplore = (p) => EXPLORE_RANGES.some(([a, b]) => p >= a && p < b)