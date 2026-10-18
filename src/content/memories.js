import { BEATS } from './story'

// side: 1 = orb on right (caption on left), -1 = orb on left
// dim: quieter orb for the sad memory
export const MEMORIES = [
  { id: 'school',  beat: 'joy-1', side:  1, tint: '#ffcf8a', photo: '/photos/memories/01-school.webp' },
  { id: 'apart',   beat: 'joy-2', side: -1, tint: '#9fb4d8', photo: '/photos/memories/02-apart.webp', dim: true },
  { id: 'message', beat: 'joy-3', side:  1, tint: '#ffd9a0', photo: '/photos/memories/03-message.webp' },
  { id: 'march15', beat: 'joy-4', side: -1, tint: '#ffb37a', photo: '/photos/memories/04-15-march.webp' },
  { id: 'cities',  beat: 'joy-5', side:  1, tint: '#ffc48f', photo: '/photos/memories/05-palanpur-vapi.webp' },
  { id: 'laugh',   beat: 'joy-6', side: -1, tint: '#ffe0a8', photo: '/photos/memories/06-laughing.webp' },
]

// Orb arrives a little before its caption and leaves a little after
const LEAD = 0.012

export const MEMORY_WINDOWS = MEMORIES.map((m) => {
  const b = BEATS.find((x) => x.id === m.beat)
  return { ...m, win: [b.from - LEAD, b.to + LEAD] }
})