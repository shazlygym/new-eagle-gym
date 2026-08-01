// Single source of truth for the app mark: a loaded barbell, tilted, on the
// near-black brand background.
//
// The bar is drawn from the centre out — bar, inner plate, outer plate, each
// pair mirrored across x=256 — so the silhouette stays exactly symmetric before
// the whole group is rotated. Shapes are kept few and bold: the icon has to
// survive being rendered at 60px on a Home Screen.
//
// `inset` shrinks the artwork toward the centre. Maskable icons need it because
// Android crops to a circle covering only the middle ~80% of the canvas; Apple
// and the favicon use the full bleed.

// A slight tilt reads as a barbell being lifted rather than a diagram of one.
// At -18° the outermost plate corner lands ~180px from the centre, inside the
// ~205px circle Android's maskable crop is guaranteed to keep.
const TILT = -18

export function iconSvg({ inset = 1, rounded = false } = {}) {
  const t = `translate(256 256) scale(${inset}) rotate(${TILT}) translate(-256 -256)`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <!-- userSpaceOnUse, spanning the mark's bounding box: the default is
         per-shape, which would run the full lime-to-cyan fade inside every
         single plate instead of once across the whole barbell. -->
    <linearGradient id="mark" gradientUnits="userSpaceOnUse"
                    x1="88" y1="336" x2="424" y2="176">
      <stop offset="0%" stop-color="#BEF264"/>
      <stop offset="55%" stop-color="#A3E635"/>
      <stop offset="100%" stop-color="#22D3EE"/>
    </linearGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#18181B"/>
      <stop offset="100%" stop-color="#09090B"/>
    </linearGradient>
  </defs>

  <!-- Fully opaque background: iOS renders any alpha in an apple-touch-icon as black. -->
  <rect width="512" height="512" fill="url(#bg)" ${rounded ? 'rx="112"' : ''}/>

  <g transform="${t}" fill="url(#mark)">
    <!-- Bar. -->
    <rect x="64" y="240" width="384" height="32" rx="16"/>
    <!-- Inner plates — the tall pair that gives the mark its weight. -->
    <rect x="136" y="176" width="40" height="160" rx="16"/>
    <rect x="336" y="176" width="40" height="160" rx="16"/>
    <!-- Outer plates. Only a little shorter than the inner pair — much smaller
         and they stop reading as plates and start reading as bolts. -->
    <rect x="86" y="196" width="38" height="120" rx="15"/>
    <rect x="388" y="196" width="38" height="120" rx="15"/>
  </g>
</svg>`
}
