// Progress photos are stored in IndexedDB, so size discipline matters: a raw
// iPhone photo is 3–8 MB, and Safari's storage quota is the difference between
// a year of photos and an eviction. Downscaled to 1280px JPEG they land around
// 200–400 KB each.

/**
 * Decoded via an <img> element rather than createImageBitmap because the img
 * path applies EXIF orientation everywhere — without it, camera photos import
 * sideways on some browsers.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('decode-failed'))
    }
    image.src = url
  })
}

export async function compressImage(
  file: File,
  maxDimension = 1280,
  quality = 0.82
): Promise<Blob> {
  const image = await loadImage(file)
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas-unavailable')
  context.drawImage(image, 0, 0, width, height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('encode-failed'))),
      'image/jpeg',
      quality
    )
  })
}
