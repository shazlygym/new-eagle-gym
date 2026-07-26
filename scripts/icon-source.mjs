// Single source of truth for the app mark: an eagle with spread wings above
// a barbell, on the near-black brand background.
//
// The eagle is drawn as one half and mirrored, so the silhouette stays exactly
// symmetric. Shapes are kept few and bold — the icon has to survive being
// rendered at 60px on a Home Screen.
//
// `inset` shrinks the artwork toward the centre. Maskable icons need it because
// Android crops to a circle covering only the middle ~80% of the canvas; Apple
// and the favicon use the full bleed.

// Right half of the bird: head, swept wing with three feather points, tail.
const EAGLE_HALF = `M256 96
   L282 132
   L300 166
   L418 132
   L370 190
   L404 196
   L336 240
   L362 250
   L292 286
   L286 330
   L256 348
   Z`

export function iconSvg({ inset = 1, rounded = false } = {}) {
  const t = `translate(256 256) scale(${inset}) translate(-256 -256)`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#93C5FD"/>
      <stop offset="50%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#16203A"/>
      <stop offset="100%" stop-color="#070B14"/>
    </linearGradient>
  </defs>

  <!-- Fully opaque background: iOS renders any alpha in an apple-touch-icon as black. -->
  <rect width="512" height="512" fill="url(#bg)" ${rounded ? 'rx="112"' : ''}/>

  <g transform="${t}" fill="url(#gold)">
    <g>
      <path d="${EAGLE_HALF}"/>
      <path d="${EAGLE_HALF}" transform="translate(512 0) scale(-1 1)"/>
    </g>

    <!-- Barbell: bar, inner collars, outer plates. -->
    <rect x="140" y="396" width="232" height="30" rx="15"/>
    <rect x="170" y="373" width="32" height="76" rx="13"/>
    <rect x="310" y="373" width="32" height="76" rx="13"/>
    <rect x="112" y="385" width="38" height="52" rx="16"/>
    <rect x="362" y="385" width="38" height="52" rx="16"/>
  </g>
</svg>`
}
