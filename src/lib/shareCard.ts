// Renders the finished-workout summary as an image for sharing. Drawn on a
// canvas with the app's own near-black and lime palette so the card looks like
// the app, and with the system font stack so Arabic shapes correctly with zero
// downloads. The hexes are copied from tailwind.config.js rather than read from
// it — canvas takes no class names, and the ramp is commented at each use.

export interface ShareCardData {
  appName: string
  title: string
  dateLabel: string
  stats: Array<{ label: string; value: string }>
  recordsTitle: string
  records: Array<{ name: string; value: string }>
  tagline: string
  rtl: boolean
}

const W = 1080
const H = 1350
const MARGIN = 96

const FONT = (weight: string, size: number) =>
  `${weight} ${size}px -apple-system, 'SF Pro Text', 'Segoe UI', 'Noto Sans Arabic', 'Cairo', Tahoma, sans-serif`

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let result = text
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1)
  }
  return `${result}…`
}

export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas-unavailable')

  // Background: the app's page black with a soft brand glow up top.
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#17171B')
  bg.addColorStop(1, '#09090B')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  const glow = ctx.createRadialGradient(W * 0.8, 0, 0, W * 0.8, 0, W * 0.9)
  glow.addColorStop(0, 'rgba(163,230,53,0.16)')
  glow.addColorStop(1, 'rgba(163,230,53,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // Brand strip along the top edge.
  const strip = ctx.createLinearGradient(0, 0, W, 0)
  strip.addColorStop(0, '#A3E635')
  strip.addColorStop(1, '#22D3EE')
  ctx.fillStyle = strip
  ctx.fillRect(0, 0, W, 14)

  // Everything text flows from one edge; RTL flips the anchor.
  ctx.direction = data.rtl ? 'rtl' : 'ltr'
  ctx.textAlign = data.rtl ? 'right' : 'left'
  const startX = data.rtl ? W - MARGIN : MARGIN
  const contentWidth = W - MARGIN * 2

  let y = MARGIN + 60

  ctx.fillStyle = '#A3E635'
  ctx.font = FONT('700', 40)
  ctx.fillText(data.appName, startX, y)

  y += 108
  ctx.fillStyle = '#FAFAFA'
  ctx.font = FONT('700', 76)
  ctx.fillText(truncate(ctx, data.title, contentWidth), startX, y)

  y += 62
  ctx.fillStyle = '#A1A1AA'
  ctx.font = FONT('400', 36)
  ctx.fillText(data.dateLabel, startX, y)

  // Stat tiles.
  y += 70
  const gap = 24
  const tileWidth = (contentWidth - gap * 2) / 3
  const tileHeight = 190
  for (const [index, stat] of data.stats.entries()) {
    // Tiles keep reading order: first stat sits at the start edge.
    const slot = data.rtl ? data.stats.length - 1 - index : index
    const x = MARGIN + slot * (tileWidth + gap)

    ctx.fillStyle = '#18181B'
    roundRect(ctx, x, y, tileWidth, tileHeight, 28)
    ctx.fill()
    ctx.strokeStyle = '#32323A'
    ctx.lineWidth = 2
    ctx.stroke()

    const centerX = x + tileWidth / 2
    ctx.textAlign = 'center'
    ctx.fillStyle = '#FAFAFA'
    ctx.font = FONT('700', 58)
    ctx.fillText(truncate(ctx, stat.value, tileWidth - 32), centerX, y + 92)
    ctx.fillStyle = '#C7C7D0'
    ctx.font = FONT('400', 30)
    ctx.fillText(truncate(ctx, stat.label, tileWidth - 32), centerX, y + 148)
    ctx.textAlign = data.rtl ? 'right' : 'left'
  }
  y += tileHeight

  // Personal records, up to four.
  const records = data.records.slice(0, 4)
  if (records.length > 0) {
    y += 96
    ctx.fillStyle = '#BEF264'
    ctx.font = FONT('700', 38)
    ctx.fillText(`🏆 ${data.recordsTitle}`, startX, y)
    y += 28

    for (const record of records) {
      const rowHeight = 108
      ctx.fillStyle = 'rgba(24,24,27,0.85)'
      roundRect(ctx, MARGIN, y, contentWidth, rowHeight, 24)
      ctx.fill()
      ctx.strokeStyle = 'rgba(163,230,53,0.35)'
      ctx.lineWidth = 2
      ctx.stroke()

      const middle = y + rowHeight / 2 + 14
      ctx.fillStyle = '#FAFAFA'
      ctx.font = FONT('600', 38)
      ctx.fillText(truncate(ctx, record.name, contentWidth * 0.55), data.rtl ? W - MARGIN - 36 : MARGIN + 36, middle)

      // The value is numeric and reads LTR in both languages.
      ctx.direction = 'ltr'
      ctx.textAlign = data.rtl ? 'left' : 'right'
      ctx.fillStyle = '#BEF264'
      ctx.font = FONT('700', 40)
      ctx.fillText(record.value, data.rtl ? MARGIN + 36 : W - MARGIN - 36, middle)
      ctx.direction = data.rtl ? 'rtl' : 'ltr'
      ctx.textAlign = data.rtl ? 'right' : 'left'

      y += rowHeight + 20
    }
  }

  // Footer.
  ctx.textAlign = 'center'
  ctx.fillStyle = '#A1A1AA'
  ctx.font = FONT('400', 30)
  ctx.fillText(data.tagline, W / 2, H - 76)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('encode-failed'))),
      'image/png'
    )
  })
}
