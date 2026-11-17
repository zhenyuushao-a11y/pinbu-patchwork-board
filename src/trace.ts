import type { TraceMode } from './types'

export async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片解码失败'))
    image.src = dataUrl
  })
}

function imageCanvas(image: HTMLImageElement, maxSide = 960) {
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d', { willReadFrequently: true })!
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return { canvas, context }
}

function luminance(r: number, g: number, b: number) {
  return .299 * r + .587 * g + .114 * b
}

function outline(data: ImageData, threshold: number) {
  const { width, height } = data
  const source = data.data
  const grey = new Float32Array(width * height)
  for (let i = 0; i < grey.length; i++) grey[i] = luminance(source[i * 4], source[i * 4 + 1], source[i * 4 + 2])
  const result = new ImageData(width, height)
  const target = result.data
  const limit = 20 + threshold * .72
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      const gx = -grey[i - width - 1] + grey[i - width + 1] - 2 * grey[i - 1] + 2 * grey[i + 1] - grey[i + width - 1] + grey[i + width + 1]
      const gy = -grey[i - width - 1] - 2 * grey[i - width] - grey[i - width + 1] + grey[i + width - 1] + 2 * grey[i + width] + grey[i + width + 1]
      const edge = Math.hypot(gx, gy)
      const offset = i * 4
      target[offset] = 55
      target[offset + 1] = 49
      target[offset + 2] = 43
      target[offset + 3] = edge > limit ? Math.min(255, 95 + edge) : 0
    }
  }
  return result
}

function nearestPalette(pixel: [number, number, number], palette: number[][]) {
  let winner = palette[0]
  let distance = Infinity
  for (const color of palette) {
    const next = (pixel[0] - color[0]) ** 2 + (pixel[1] - color[1]) ** 2 + (pixel[2] - color[2]) ** 2
    if (next < distance) { distance = next; winner = color }
  }
  return winner
}

function quantize(data: ImageData, colorCount: number) {
  const pixels: number[][] = []
  const source = data.data
  const stride = Math.max(1, Math.floor((data.width * data.height) / 5200))
  for (let i = 0; i < source.length; i += 4 * stride) {
    if (source[i + 3] > 20) pixels.push([source[i], source[i + 1], source[i + 2]])
  }
  const sorted = pixels.sort((a, b) => luminance(a[0], a[1], a[2]) - luminance(b[0], b[1], b[2]))
  let palette = Array.from({ length: colorCount }, (_, index) => sorted[Math.min(sorted.length - 1, Math.floor((index + .5) * sorted.length / colorCount))] || [220, 210, 195])
  for (let round = 0; round < 5; round++) {
    const buckets = palette.map(() => [0, 0, 0, 0])
    for (const pixel of pixels) {
      const match = nearestPalette(pixel as [number, number, number], palette)
      const index = palette.indexOf(match)
      buckets[index][0] += pixel[0]; buckets[index][1] += pixel[1]; buckets[index][2] += pixel[2]; buckets[index][3]++
    }
    palette = palette.map((color, index) => buckets[index][3]
      ? buckets[index].slice(0, 3).map(value => Math.round(value / buckets[index][3]))
      : color)
  }
  const result = new ImageData(data.width, data.height)
  for (let i = 0; i < source.length; i += 4) {
    const color = nearestPalette([source[i], source[i + 1], source[i + 2]], palette)
    result.data[i] = color[0]; result.data[i + 1] = color[1]; result.data[i + 2] = color[2]; result.data[i + 3] = source[i + 3]
  }
  return result
}

export async function makeTrace(dataUrl: string, mode: TraceMode, threshold = 80, colorCount = 6) {
  const image = await loadImage(dataUrl)
  const { canvas, context } = imageCanvas(image)
  const source = context.getImageData(0, 0, canvas.width, canvas.height)
  if (mode === 'outline') context.putImageData(outline(source, threshold), 0, 0)
  if (mode === 'blocks') context.putImageData(quantize(source, colorCount), 0, 0)
  if (mode === 'manual') {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.globalAlpha = .72
    context.filter = 'grayscale(1) contrast(.82)'
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
  }
  return canvas.toDataURL('image/png')
}

export async function analyzeFabric(dataUrl: string) {
  const image = await loadImage(dataUrl)
  const { canvas, context } = imageCanvas(image, 420)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  let r = 0, g = 0, b = 0, count = 0, variation = 0
  const samples: [number, number, number][] = []
  for (let i = 0; i < pixels.length; i += 40) {
    if (pixels[i + 3] < 40) continue
    r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; count++
    samples.push([pixels[i], pixels[i + 1], pixels[i + 2]])
  }
  r /= count || 1; g /= count || 1; b /= count || 1
  for (const pixel of samples) variation += Math.abs(pixel[0] - r) + Math.abs(pixel[1] - g) + Math.abs(pixel[2] - b)
  variation /= Math.max(1, samples.length * 3)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), light = (max + min) / 2
  let color = '多色'
  if (light > 214 && max - min < 34) color = '米白'
  else if (light < 60) color = '黑色'
  else if (max - min < 30) color = '灰棕'
  else if (r > g * 1.16 && r > b * 1.12) color = '红粉'
  else if (r > b * 1.25 && g > b * 1.1) color = '黄橙'
  else if (g > r * 1.08 && g > b * .96) color = '绿色'
  else if (b > r * 1.06) color = '蓝紫'
  return {
    color,
    colors: [color],
    pattern: variation < 17 ? '纯色' : variation < 38 ? '纹理' : '多色图案',
    confidence: variation < 15 ? '高' : '中',
  }
}

export const CUT_PATHS = {
  square: 'M4 4H96V96H4Z',
  triangle: 'M50 3L98 96H2Z',
  circle: 'M50 2C77 2 98 23 98 50S77 98 50 98 2 77 2 50 23 2 50 2Z',
  strip: 'M3 28Q8 20 15 25L90 18Q98 20 96 31L91 76Q89 83 80 80L10 85Q2 82 4 70Z',
  petal: 'M50 2C72 14 90 34 90 53C90 72 71 89 50 98C29 89 10 72 10 53C10 34 28 14 50 2Z',
  leaf: 'M4 83C15 25 49 2 96 8 87 55 57 88 4 83ZM15 74C43 56 62 39 84 18',
  arch: 'M4 96V49C4 20 24 3 50 3S96 20 96 49V96Z',
  wave: 'M3 15C18 2 32 29 48 15S78 2 97 18V83C81 96 67 69 49 84S20 98 3 82Z',
} as const
