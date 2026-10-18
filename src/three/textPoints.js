export async function loadFont(spec) {
  try {
    await document.fonts.load(spec)
  } catch {
    /* falls back to Georgia */
  }
}

export function sampleTexts(
  texts,
  count,
  { font = '500 220px "Cormorant Garamond", Georgia, serif', width = 6.5, step = 3 } = {}
) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  ctx.font = font
  const maxW = Math.max(...texts.map((t) => ctx.measureText(t).width))
  const W = Math.ceil(maxW + 40)
  const H = 320
  canvas.width = W
  canvas.height = H
  const scale = width / maxW // pixels to world units

  return texts.map((text) => {
    ctx.clearRect(0, 0, W, H)
    ctx.font = font // resizing canvas resets font
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, W / 2, H / 2)

    const data = ctx.getImageData(0, 0, W, H).data
    const pts = []
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        if (data[(y * W + x) * 4 + 3] > 140) {
          pts.push([(x - W / 2) * scale, -(y - H / 2) * scale])
        }
      }
    }

    // Shuffle so the morph swirls instead of sliding
    for (let i = pts.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0
      ;[pts[i], pts[j]] = [pts[j], pts[i]]
    }

    const out = new Float32Array(count * 3)
    const jitterSize = scale * step * 0.5
    for (let i = 0; i < count; i++) {
      const p = pts[i % pts.length]
      const jitter = i >= pts.length ? jitterSize : 0 // spread duplicates
      out[i * 3] = p[0] + (Math.random() - 0.5) * jitter
      out[i * 3 + 1] = p[1] + (Math.random() - 0.5) * jitter
      out[i * 3 + 2] = (Math.random() - 0.5) * 0.08
    }
    return out
  })
}