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
  series: string
  shape: AssetShape
  shapeName: string
  width: number
  height: number
  thumbnail: string
  canvas: string
  sourceType: '原创绘制' | '开放纹理加工' | '生成素材' | '私人参考加工'
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

export type ItemKind = 'asset' | 'frame' | 'photo' | 'text' | 'stitch' | 'drawnStitch' | 'group'
export type CutShape = 'square' | 'triangle' | 'circle' | 'strip' | 'petal' | 'leaf' | 'arch' | 'wave' | 'freehand'
export type CreationMode = 'guided' | 'trace' | 'free'
export type TraceMode = 'outline' | 'blocks' | 'manual'
export type StitchStyle = 'running' | 'cross' | 'blanket' | 'chain'
export type TextFont = 'hand' | 'serif' | 'sans'

export interface PathPoint {
  x: number
  y: number
}

export interface BoardGuide {
  imageData: string
  sourceData?: string
  name: string
  mode: TraceMode
  opacity: number
  visible: boolean
  scale?: number
  rotation?: number
}

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
  fontFamily?: TextFont
  color?: string
  photoData?: string
  photoName?: string
  cropX?: number
  cropY?: number
  cropScale?: number
  children?: ChildItem[]
  cutShape?: CutShape
  cutPath?: string
  textureScale?: number
  textureX?: number
  textureY?: number
  points?: PathPoint[]
  stitchBasePoints?: PathPoint[]
  stitchStyle?: StitchStyle
  strokeColor?: string
  strokeWidth?: number
  stitchSpacing?: number
  stitchInset?: number
  autoSourceId?: string
}

export interface Board {
  version: 1
  id: string
  title: string
  width: number
  height: number
  format: 'landscape' | 'portrait' | 'square'
  background: string
  backgroundImage?: string
  backgroundImageName?: string
  backgroundFit?: 'cover' | 'contain' | 'stretch'
  backgroundOpacity?: number
  items: BoardItem[]
  guide?: BoardGuide
  creationMode?: CreationMode
  tutorialId?: 'flower' | 'house'
  coachDismissed?: boolean
  createdAt: string
  updatedAt: string
}

export interface SavedState {
  version: 1
  activeBoardId: string
  boards: Board[]
  userFabrics?: Asset[]
  onboardingSeen?: boolean
  tutorialSeen?: boolean
}
