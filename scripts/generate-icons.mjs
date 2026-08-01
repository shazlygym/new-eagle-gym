// Rasterises the app mark to the PNG sizes the manifest and iOS need.
//
// Run with `npm run icons`. Uses the Chromium that ships with the image rather
// than pulling in a native image toolchain; the committed PNGs mean a normal
// build never has to run this.

import { chromium } from 'playwright-core'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { iconSvg } from './icon-source.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'public/icons')

const TARGETS = [
  // iOS reads this one for the Home Screen icon; it must be opaque and square.
  { file: 'apple-touch-icon-180.png', size: 180, svg: { inset: 1 } },
  { file: 'icon-192.png', size: 192, svg: { inset: 1, rounded: true } },
  { file: 'icon-512.png', size: 512, svg: { inset: 1, rounded: true } },
  // Maskable art must survive an aggressive circular crop, hence the inset. The
  // barbell is a wide, short mark, so it needs less shrinking than a tall one
  // would — 0.8 keeps its far corners ~142px from centre, inside the ~205px
  // safe radius, without leaving the icon swimming in background.
  { file: 'icon-512-maskable.png', size: 512, svg: { inset: 0.8 } },
]

const executablePath =
  process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

const browser = await chromium.launch({ executablePath })
const page = await browser.newPage()

await mkdir(outDir, { recursive: true })

for (const { file, size, svg } of TARGETS) {
  const markup = iconSvg(svg)
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<style>html,body{margin:0;padding:0;overflow:hidden}svg{display:block;width:${size}px;height:${size}px}</style>${markup}`
  )
  await page.screenshot({ path: resolve(outDir, file), omitBackground: false })
  console.log(`wrote ${file} (${size}x${size})`)
}

// The favicon stays vector — browsers scale it better than a fixed-size PNG.
await writeFile(resolve(outDir, 'favicon.svg'), iconSvg({ inset: 1, rounded: true }))
console.log('wrote favicon.svg')

await browser.close()
