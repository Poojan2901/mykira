// style: 'whisper' | 'line' | 'title' | 'name'
// tone:  'warm' | 'cold' | 'neutral'
// pos:   'center' | 'bottom' | 'left' | 'right' | 'upper'
// Use \n for a line break. No punctuation: Caption strips it anyway.

export const BEATS = [
  // ── VOID (0 – 0.06) · no sun yet, centre is safe ──
  { id: 'void-1', from: 0.004, to: 0.024, text: 'Before you', style: 'whisper', tone: 'neutral' },
  { id: 'void-2', from: 0.024, to: 0.048, text: 'this was my life\nQuiet\nDark\nEndless', style: 'line', tone: 'neutral' },

  // ── SPARK (0.06 – 0.16) · star small, keep text below ──
  { id: 'spark-1', from: 0.058, to: 0.085, text: 'And then somewhere in all that dark', style: 'whisper', tone: 'neutral', pos: 'bottom' },
  { id: 'spark-2', from: 0.085, to: 0.115, text: 'a light', style: 'title', tone: 'warm', pos: 'bottom' },
  { id: 'spark-3', from: 0.115, to: 0.158, text: 'Small and far away\nbut warm enough to make me look up', style: 'line', tone: 'warm', pos: 'bottom' },

  // ── KIRA (0.16 – 0.26) ──────────────────────────
  { id: 'kira-1', from: 0.165, to: 0.198, text: 'It was you', style: 'title', tone: 'warm', pos: 'left' },
  { id: 'kira-3', from: 0.236, to: 0.262, text: 'My sun', style: 'title', tone: 'warm', pos: 'right' },
  { id: 'kira-3', from: 0.236, to: 0.262, text: 'My sun', style: 'title', tone: 'warm', pos: 'right' },

  // ── JOY (0.26 – 0.40) · alternate sides like turning pages ──
  { id: 'joy-1', from: 0.268, to: 0.29,  text: 'A boy changes schools\nand meets a girl\nhe never saw coming', style: 'line', tone: 'warm', pos: 'left' },
  { id: 'joy-2', from: 0.29,  to: 0.31,  text: 'Then life pulled us apart\nand the light went quiet again', style: 'line', tone: 'neutral', pos: 'right' },
  { id: 'joy-3', from: 0.31,  to: 0.33,  text: 'Until one day a message\nand you were back', style: 'line', tone: 'warm', pos: 'left' },
  { id: 'joy-4', from: 0.33,  to: 0.35,  text: '15 March\nthe day my universe\nfound its centre', style: 'line', tone: 'warm', pos: 'right' },
  { id: 'joy-5', from: 0.35,  to: 0.372, text: 'Palanpur and Vapi\ntwo cities two meetings\nand every call in between', style: 'line', tone: 'warm', pos: 'left' },
  { id: 'joy-6', from: 0.372, to: 0.398, text: 'You made me laugh at nothing\nYou made ordinary days\nfeel like summer', style: 'line', tone: 'warm', pos: 'right' },

  // ── HURT (0.40 – 0.52) · replace hurt-3 / 4 / 5 with your own words ──
  { id: 'hurt-1', from: 0.404, to: 0.424, text: 'But somewhere along the way', style: 'whisper', tone: 'cold', pos: 'bottom' },
  { id: 'hurt-2', from: 0.424, to: 0.446, text: 'I forgot how much light\nyou were giving me', style: 'line', tone: 'cold', pos: 'left' },
  { id: 'hurt-3', from: 0.446, to: 0.468, text: 'I said things\nI should have held back', style: 'line', tone: 'cold', pos: 'right' },
  { id: 'hurt-4', from: 0.468, to: 0.49,  text: 'I was not there\nwhen you needed me most', style: 'line', tone: 'cold', pos: 'left' },
  { id: 'hurt-5', from: 0.49,  to: 0.518, text: 'And the worst part\nI did not even notice\nI was hurting you', style: 'line', tone: 'cold', pos: 'right' },

  // ── BECOME THE SUN (0.52 – 0.68) ──
  { id: 'sun-1', from: 0.524, to: 0.546, text: 'So let me show you\nwhat you are to me', style: 'line', tone: 'warm', pos: 'bottom' },
  { id: 'sun-2', from: 0.546, to: 0.566, text: 'Not a part of my world', style: 'whisper', tone: 'warm', pos: 'bottom' },
  { id: 'sun-3', from: 0.566, to: 0.59,  text: 'The centre of it', style: 'title', tone: 'warm', pos: 'bottom' },

  // ── CONSTELLATION (0.68 – 0.84) ─────────────────
  { id: 'const-1', from: 0.684, to: 0.71, text: 'And every moment with you\nbecame a star', style: 'line', tone: 'warm', pos: 'bottom' },
  { id: 'const-2', from: 0.81, to: 0.836, text: 'Every one of them\nleads back to you', style: 'line', tone: 'warm', pos: 'bottom' },

  // ── APOLOGY (0.84 – 0.94) ──
  { id: 'apology-1', from: 0.842, to: 0.866, text: 'There is something I need to say', style: 'whisper', tone: 'warm', pos: 'bottom' },

  // ── SUNRISE (0.94 – 1) ──
  { id: 'sunrise-1', from: 0.944, to: 0.97, text: 'Every night ends\nEvery dark gets a morning', style: 'line', tone: 'warm', pos: 'upper' },
]

export function findBeat(p) {
  return BEATS.find((b) => p >= b.from && p < b.to) ?? null
}