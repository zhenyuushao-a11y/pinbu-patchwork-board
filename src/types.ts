export type AssetCategory = 'fabric' | 'part' | 'frame' | 'inspiration'
export type AssetShape = 'square' | 'triangle' | 'oval' | 'strip' | 'petal' | 'leaf' | 'arch' | 'irregular' | 'wave' | 'button' | 'stitch' | 'label' | 'frame' | 'flower' | 'jogakbo' | 'mosaic'

export interface Asset {
  id: string
  name: string
  category: AssetCategory
  color: string
  colors: string[]
  pattern: string
  material: string
  series: '通用素材' | '南通蓝印花布灵感' | '韩国 Jogakbo 灵感'
  shape: AssetShape
  shapeName: string
  width: number
  height: number
  thumbnail: string
  canvas: string
  sourceType: '原创绘制' | '开放纹理加工'
  sourceId?: string
  author: string
  sourceUrl: string
  license: string
  licenseUrl?: string
  attribution: string
  processing: string
  tags?: string[]
  edge?: string
  transparent?: boolean
}

export type ItemKind = 'asset' | 'frame' | 'photo' | 'text' | 'stitch' | 'group'

export interface ChildItem {
  assetId: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

export interface BoardItem {
  id: string
  kind: ItemKind
  assetId?: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  flipX?: boolean
  flipY?: boolean
  text?: string
  fontSize?: number
  color?: string
  photoData?: string
  photoName?: string
  cropX?: number
  cropY?: number
  cropScale?: number
  children?: ChildItem[]
}

export interface Board {
  version: 1
  id: string
  title: string
  width: number
  height: number
  format: 'landscape' | 'portrait' | 'square'
  background: string
  items: BoardItem[]
  createdAt: string
  updatedAt: string
}

export interface SavedState {
  version: 1
  activeBoardId: string
  boards: Board[]
}
