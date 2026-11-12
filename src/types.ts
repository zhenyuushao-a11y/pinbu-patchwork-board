export type AssetCategory = 'fabric' | 'part' | 'frame' | 'inspiration'
export type AssetShape = 'rect' | 'petal' | 'leaf' | 'button' | 'stitch' | 'label' | 'frame' | 'flower' | 'jogakbo'

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
  width: number
  height: number
  thumbnail: string
  canvas: string
  sourceType: '原创绘制'
  author: string
  sourceUrl: string
  license: 'CC BY 4.0'
  attribution: string
  processing: string
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
