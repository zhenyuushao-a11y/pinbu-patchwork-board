import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BringToFront, Check, ChevronDown, CircleHelp,
  Copy, Download, Eye, EyeOff, FileImage, Frame, Grip, ImagePlus, Layers3, Link2,
  FlipHorizontal, FlipVertical, Minus, MousePointer2, Palette, PanelLeftClose, PanelLeftOpen,
  Pencil, Plus, Redo2, RotateCcw, RotateCw, Save, Scissors, SendToBack, Shapes, Sparkles,
  Search, Share2, SlidersHorizontal, SquareDashed, Trash2, Type, Undo2, Upload, WandSparkles, X, ZoomIn, ZoomOut,
} from 'lucide-react'
import type { Asset, AssetCategory, Board, BoardItem, ChildItem, CutShape, PathPoint, SavedState, StitchStyle, TraceMode } from './types'
import { loadWorkspace, saveWorkspace, validateImportedProject } from './storage'
import { analyzeFabric, CUT_PATHS, makeTrace } from './trace'

const STAGE_W = 1200
const STAGE_H = 800
const DB_VERSION = 1 as const
const uid = () => typeof globalThis.crypto?.randomUUID === 'function'
  ? globalThis.crypto.randomUUID()
  : `pinbu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`
const clone = <T,>(value: T): T => structuredClone(value)
const now = () => new Date().toISOString()
const STITCH_LABELS:Record<StitchStyle,string>={running:'平针',cross:'十字针',blanket:'锁边针',chain:'链式针'}

const placeholderPhoto = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="700" viewBox="0 0 960 700">
  <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e9d6bc"/><stop offset="1" stop-color="#a9b6a0"/></linearGradient></defs>
  <rect width="960" height="700" fill="url(#s)"/>
  <circle cx="730" cy="140" r="72" fill="#f4dfad" opacity=".88"/>
  <path d="M0 510L230 300 410 470 590 250 960 560V700H0Z" fill="#72806f"/>
  <path d="M0 600L290 420 450 540 650 390 960 610V700H0Z" fill="#526357"/>
  <path d="M0 620Q250 540 480 622T960 600V700H0Z" fill="#c7ad8d"/>
  <text x="56" y="90" fill="#4b4a41" font-family="serif" font-size="30" letter-spacing="4">沿途，慢慢收集</text>
</svg>`)} `

const flowerChildren: ChildItem[] = [
  {assetId:'private-old-garden-11-petal',x:100,y:8,width:120,height:62,rotation:90},
  {assetId:'private-cottage-checks-07-petal',x:184,y:48,width:120,height:62,rotation:145},
  {assetId:'private-old-garden-01-petal',x:188,y:154,width:118,height:60,rotation:212},
  {assetId:'private-dusk-botanicals-10-petal',x:100,y:215,width:120,height:62,rotation:270},
  {assetId:'private-cottage-checks-01-petal',x:18,y:150,width:120,height:62,rotation:325},
  {assetId:'private-old-garden-07-petal',x:12,y:48,width:118,height:60,rotation:35},
  {assetId:'button-pearl',x:143,y:126,width:44,height:44,rotation:0},
]

const houseChildren: ChildItem[] = [
  {assetId:'tex-poly-ribbed_corduroy-square',x:78,y:118,width:176,height:142,rotation:0},
  {assetId:'tex-poly-denim_fabric-triangle',x:56,y:20,width:224,height:142,rotation:0},
  {assetId:'tex-poly-bi_stretch-strip',x:140,y:183,width:56,height:77,rotation:90},
  {assetId:'tex-poly-polar_fleece-square',x:96,y:153,width:42,height:42,rotation:0},
  {assetId:'tex-poly-polar_fleece-square',x:208,y:153,width:34,height:42,rotation:0},
]

function defaultBoard(): Board {
  return {
    version: DB_VERSION, id: uid(), title: '旧布花园', width: 1100, height: 720,
    format: 'landscape', background: '#ded5c5', createdAt: now(), updatedAt: now(),
    items: [
      {id:uid(),kind:'asset',assetId:'private-dusk-botanicals-09-irregular',x:74,y:444,width:370,height:210,rotation:-3,opacity:1},
      {id:uid(),kind:'asset',assetId:'private-cottage-checks-04-square',x:648,y:500,width:318,height:170,rotation:3,opacity:.96},
      {id:uid(),kind:'asset',assetId:'private-old-garden-06-strip',x:74,y:92,width:320,height:65,rotation:-2,opacity:.94},
      {id:uid(),kind:'frame',assetId:'frame-fray',x:164,y:176,width:430,height:322,rotation:-3,opacity:1,photoData:placeholderPhoto,photoName:'原创占位风景',cropX:0,cropY:0,cropScale:1},
      {id:uid(),kind:'asset',assetId:'private-indigo-sheers-07-leaf',x:700,y:330,width:185,height:82,rotation:-32,opacity:1},
      {id:uid(),kind:'asset',assetId:'private-old-garden-03-leaf',x:792,y:398,width:175,height:78,rotation:28,opacity:1},
      {id:uid(),kind:'group',assetId:'flower-blush',x:650,y:224,width:330,height:300,rotation:7,opacity:1,children:flowerChildren},
      {id:uid(),kind:'stitch',assetId:'stitch-cream',x:120,y:570,width:235,height:24,rotation:2,opacity:1},
      {id:uid(),kind:'text',x:700,y:112,width:290,height:70,rotation:1,opacity:1,text:'把日常，慢慢缝好',fontSize:30,color:'#35473b'},
      {id:uid(),kind:'text',x:730,y:166,width:220,height:40,rotation:1,opacity:.75,text:'杭州 · 2026.11',fontSize:17,color:'#5c5148'},
    ],
  }
}

function blankBoard(format: Board['format']='landscape'): Board {
  const dims = format === 'landscape' ? [1100,720] : format === 'portrait' ? [720,1100] : [900,900]
  return {version:1,id:uid(),title:'未命名拼布',width:dims[0],height:dims[1],format,background:'#e7dbc9',items:[],creationMode:'free',createdAt:now(),updatedAt:now()}
}

const flowerGuide = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900"><g fill="none" stroke="#675d54" stroke-width="8" stroke-dasharray="18 13" opacity=".74"><path d="M450 435C320 330 278 202 354 130c76-72 155 40 96 305Z"/><path d="M462 438c3-167 81-272 179-244 98 28 60 158-179 244Z"/><path d="M465 450c161-57 279-20 286 85 7 104-131 103-286-85Z"/><path d="M450 463c107 129 102 252 2 284-101 32-146-98-2-284Z"/><path d="M437 454c-18 168-107 260-201 222-94-39-43-165 201-222Z"/><path d="M437 440c-157 69-276 42-291-61-15-104 122-114 291 61Z"/><circle cx="451" cy="447" r="55"/></g><text x="450" y="835" text-anchor="middle" fill="#675d54" font-family="sans-serif" font-size="24">选布 · 裁成花瓣 · 对齐虚线</text></svg>`)}`

function guidedBoard(): Board {
  const board = blankBoard('square')
  return {...board,title:'我的第一朵布花',creationMode:'guided',tutorialId:'flower',guide:{imageData:flowerGuide,name:'五瓣花纸样',mode:'outline',opacity:.46,visible:true}}
}

function fileDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1200)
}

function safeName(name: string) { return name.replace(/[\\/:*?"<>|]/g,'-').trim() || '拼布作品' }

async function imageFileToDataUrl(file: File): Promise<string> {
  if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) throw new Error('暂不支持 HEIC，请先转换为 JPG、PNG 或 WebP。')
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error('请选择 JPG、PNG 或 WebP 图片。')
  const raw = await new Promise<string>((resolve,reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('图片读取失败')); reader.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve,reject) => {
    const el = new Image(); el.onload=()=>resolve(el); el.onerror=()=>reject(new Error('图片解码失败，请尝试另一张图片。')); el.src=raw
  })
  const max = 2600
  if (Math.max(img.naturalWidth,img.naturalHeight) <= max) return raw
  const scale = max / Math.max(img.naturalWidth,img.naturalHeight)
  const canvas = document.createElement('canvas'); canvas.width=Math.round(img.naturalWidth*scale); canvas.height=Math.round(img.naturalHeight*scale)
  canvas.getContext('2d')!.drawImage(img,0,0,canvas.width,canvas.height)
  return canvas.toDataURL(file.type==='image/png'?'image/png':'image/jpeg',.9)
}

type HandleMode = 'move'|'resize'|'rotate'|'stitchStart'|'stitchEnd'|'pan'
interface DragState { mode:HandleMode; id?:string; startX:number; startY:number; original?:BoardItem; before:Board; startView?:{zoom:number;panX:number;panY:number} }

interface SceneProps {
  board: Board; assets: Map<string,Asset>; dataUrls: Map<string,string>; selectedId?: string; interactive?: boolean;
  handleScale?: number;
  onItemDown?: (event:React.PointerEvent,id:string,mode:HandleMode)=>void
  onItemContext?: (event:React.MouseEvent,id:string)=>void
}

function AssetImage({asset,item,dataUrls,sceneId='live'}:{asset?:Asset,item:BoardItem|ChildItem,dataUrls:Map<string,string>,sceneId?:string}) {
  if (!asset) return <rect width={item.width} height={item.height} rx="10" fill="#c9b9a2" stroke="#9a8770" strokeDasharray="8 6" />
  const source=sceneId==='live'?asset.canvas:(dataUrls.get(asset.id)||asset.canvas)
  const cut = 'cutPath' in item && item.cutPath
  if (sceneId==='live') {
    const scale=cut?('textureScale' in item&&item.textureScale||1):1
    const x=cut?('textureX' in item&&item.textureX||0):0
    const y=cut?('textureY' in item&&item.textureY||0):0
    const content=<foreignObject data-asset-id={asset.id} x={x-item.width*(scale-1)/2} y={y-item.height*(scale-1)/2} width={item.width*scale} height={item.height*scale} pointerEvents="none">
      <div style={{width:'100%',height:'100%',overflow:'hidden'}}><img src={source} alt="" draggable={false} style={{display:'block',width:'100%',height:'100%',objectFit:cut?'cover':'fill'}}/></div>
    </foreignObject>
    return cut?<g clipPath={`url(#cut-${sceneId}-${'id' in item?item.id:''})`}>{content}</g>:content
  }
  if (cut) {
    const scale=item.textureScale||1, x=item.textureX||0, y=item.textureY||0
    return <g clipPath={`url(#cut-${sceneId}-${'id' in item?item.id:''})`}><image data-asset-id={asset.id} href={source} x={x-item.width*(scale-1)/2} y={y-item.height*(scale-1)/2} width={item.width*scale} height={item.height*scale} preserveAspectRatio="xMidYMid slice" /></g>
  }
  return <image data-asset-id={asset.id} href={source} width={item.width} height={item.height} preserveAspectRatio="none" />
}

function cssCut(shape?:CutShape,path?:string) {
  if (shape==='circle') return 'ellipse(46% 46% at 50% 50%)'
  if (shape==='triangle') return 'polygon(50% 3%, 97% 96%, 3% 96%)'
  if (shape==='strip') return 'polygon(2% 31%, 98% 25%, 98% 70%, 2% 76%)'
  if (shape==='petal') return 'polygon(50% 2%, 67% 12%, 82% 29%, 90% 47%, 88% 63%, 73% 82%, 50% 98%, 27% 82%, 12% 63%, 10% 47%, 18% 29%, 33% 12%)'
  if (shape==='leaf') return 'polygon(3% 55%, 17% 25%, 48% 5%, 80% 23%, 97% 50%, 80% 77%, 48% 95%, 18% 78%)'
  if (shape==='arch') return 'polygon(4% 96%, 4% 48%, 12% 24%, 31% 8%, 50% 3%, 69% 8%, 88% 24%, 96% 48%, 96% 96%)'
  if (shape==='wave') return 'polygon(2% 22%, 18% 10%, 35% 24%, 51% 9%, 68% 25%, 84% 11%, 98% 24%, 98% 78%, 82% 91%, 66% 76%, 49% 92%, 33% 75%, 16% 90%, 2% 77%)'
  if (shape==='freehand'&&path) {
    const values=path.match(/-?\d+(?:\.\d+)?/g)?.map(Number)||[]
    const points=[] as string[]
    for(let i=0;i<values.length-1;i+=2) points.push(`${Math.max(0,Math.min(100,values[i]))}% ${Math.max(0,Math.min(100,values[i+1]))}%`)
    if(points.length>2) return `polygon(${points.join(',')})`
  }
  return shape==='square'?'inset(3% round 2%)':undefined
}

function OverlayAsset({source,item}:{source:string,item:BoardItem|ChildItem}) {
  const cut='cutShape' in item?item.cutShape:undefined
  const scale='textureScale' in item&&item.textureScale||1
  const x='textureX' in item&&item.textureX||0
  const y='textureY' in item&&item.textureY||0
  return <span className="live-asset-clip" style={{clipPath:cssCut(cut,'cutPath' in item?item.cutPath:undefined)}}><img src={source} alt="" draggable={false} style={{transform:`translate(${x}px,${y}px) scale(${scale})`}}/></span>
}

const pointsPath=(points:PathPoint[])=>points.length?`M${points.map(point=>`${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join('L')}`:''

function samplePath(points:PathPoint[],gap:number) {
  const samples:Array<PathPoint&{angle:number}>=[]
  if(points.length<2)return samples
  let carry=0
  for(let index=1;index<points.length;index++){
    const start=points[index-1],end=points[index],dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy)
    if(length<.01)continue
    const angle=Math.atan2(dy,dx)*180/Math.PI
    for(let distance=gap-carry;distance<=length;distance+=gap){const ratio=distance/length;samples.push({x:start.x+dx*ratio,y:start.y+dy*ratio,angle})}
    carry=(carry+length)%gap
  }
  return samples
}

function StitchArtwork({points,style='running',color='#704c43',width=3,spacing=16}:{points:PathPoint[];style?:StitchStyle;color?:string;width?:number;spacing?:number}) {
  const path=pointsPath(points),gap=Math.max(6,spacing),samples=samplePath(points,gap)
  if(style==='cross')return <g fill="none" stroke={color} strokeWidth={width} strokeLinecap="round">{samples.map((point,index)=><g key={index} transform={`translate(${point.x} ${point.y}) rotate(${point.angle})`}><line x1="-4.5" y1="-4.5" x2="4.5" y2="4.5"/><line x1="-4.5" y1="4.5" x2="4.5" y2="-4.5"/></g>)}</g>
  if(style==='blanket')return <g fill="none" stroke={color} strokeLinecap="round"><path d={path} strokeWidth={Math.max(1.4,width*.62)}/>{samples.map((point,index)=><line key={index} x1={point.x} y1={point.y} x2={point.x} y2={point.y-9} strokeWidth={width} transform={`rotate(${point.angle} ${point.x} ${point.y})`}/>)}</g>
  if(style==='chain')return <g fill="none" stroke={color} strokeWidth={Math.max(1.5,width*.72)}>{samples.map((point,index)=><ellipse key={index} cx={point.x} cy={point.y} rx="6" ry="3.7" transform={`rotate(${point.angle} ${point.x} ${point.y})`}/>)}</g>
  return <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={`${Math.max(3,gap*.62)} ${Math.max(2,gap*.38)}`}/>
}

function contourFromPath(pathData:string) {
  try {
    const outline=pathData.includes('Z')?pathData.slice(0,pathData.indexOf('Z')+1):pathData
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',outline)
    const length=path.getTotalLength(),steps=Math.max(24,Math.min(180,Math.ceil(length/3)))
    return Array.from({length:steps+1},(_,index)=>{const point=path.getPointAtLength(length*index/steps);return{x:point.x,y:point.y}})
  } catch { return [{x:4,y:4},{x:96,y:4},{x:96,y:96},{x:4,y:96},{x:4,y:4}] }
}

function fabricContour(item:BoardItem) {
  const path=item.cutPath||(item.cutShape&&item.cutShape!=='freehand'?CUT_PATHS[item.cutShape]:'M4 4H96V96H4Z')
  const rad=item.rotation*Math.PI/180,cos=Math.cos(rad),sin=Math.sin(rad),cx=item.width/2,cy=item.height/2
  return contourFromPath(path).map(point=>{
    let x=point.x/100*item.width,y=point.y/100*item.height
    if(item.flipX)x=item.width-x;if(item.flipY)y=item.height-y
    const dx=x-cx,dy=y-cy
    return{x:item.x+cx+dx*cos-dy*sin,y:item.y+cy+dx*sin+dy*cos}
  })
}

function insetContour(points:PathPoint[],inset:number) {
  if(!points.length||!inset)return points.map(point=>({...point}))
  const unique=points.length>1&&Math.hypot(points[0].x-points.at(-1)!.x,points[0].y-points.at(-1)!.y)<.5?points.slice(0,-1):points
  const center=unique.reduce((total,point)=>({x:total.x+point.x/unique.length,y:total.y+point.y/unique.length}),{x:0,y:0})
  const adjusted=unique.map(point=>{const dx=point.x-center.x,dy=point.y-center.y,distance=Math.max(1,Math.hypot(dx,dy)),factor=(distance-inset)/distance;return{x:center.x+dx*factor,y:center.y+dy*factor}})
  return [...adjusted,{...adjusted[0]}]
}

function stitchFromContour(worldPoints:PathPoint[],options:{style:StitchStyle;color:string;width:number;spacing:number;inset:number;sourceId:string}):BoardItem {
  const padding=32,minX=Math.min(...worldPoints.map(point=>point.x))-padding,minY=Math.min(...worldPoints.map(point=>point.y))-padding,maxX=Math.max(...worldPoints.map(point=>point.x))+padding,maxY=Math.max(...worldPoints.map(point=>point.y))+padding
  const base=worldPoints.map(point=>({x:point.x-minX,y:point.y-minY}))
  return{id:uid(),kind:'drawnStitch',x:minX,y:minY,width:maxX-minX,height:maxY-minY,rotation:0,opacity:1,points:insetContour(base,options.inset),stitchBasePoints:base,stitchStyle:options.style,strokeColor:options.color,strokeWidth:options.width,stitchSpacing:options.spacing,stitchInset:options.inset,autoSourceId:options.sourceId}
}

function LiveItemOverlay({item,assets,view,selected}:{item:BoardItem,assets:Map<string,Asset>,view:{zoom:number;panX:number;panY:number},selected:boolean}) {
  const asset=item.assetId?assets.get(item.assetId):undefined
  const style={left:`${(view.panX+item.x*view.zoom)/STAGE_W*100}%`,top:`${(view.panY+item.y*view.zoom)/STAGE_H*100}%`,width:`${item.width*view.zoom/STAGE_W*100}%`,height:`${item.height*view.zoom/STAGE_H*100}%`,opacity:item.opacity,transform:`rotate(${item.rotation}deg) scale(${item.flipX?-1:1},${item.flipY?-1:1})`}
  return <div className={`live-item-overlay ${selected?'selected':''}`} style={style} aria-hidden="true">
    {item.kind==='text'&&<span className="live-text" style={{color:item.color||'#302b26',fontSize:`${(item.fontSize||28)*view.zoom}px`}}>{item.text}</span>}
    {(item.kind==='asset'||item.kind==='stitch')&&asset&&<OverlayAsset source={asset.canvas} item={item}/>}
    {item.kind==='drawnStitch'&&item.points&&<svg className="live-drawn-stitch" viewBox={`0 0 ${item.width} ${item.height}`} preserveAspectRatio="none"><StitchArtwork points={item.points} style={item.stitchStyle} color={item.strokeColor} width={item.strokeWidth} spacing={item.stitchSpacing}/></svg>}
    {item.kind==='photo'&&item.photoData&&<span className="live-photo"><img src={item.photoData} alt="" style={{transform:`translate(${item.cropX||0}px,${item.cropY||0}px) scale(${item.cropScale||1})`}}/></span>}
    {item.kind==='frame'&&<><span className="live-frame-window">{item.photoData&&<img src={item.photoData} alt="" style={{transform:`translate(${item.cropX||0}px,${item.cropY||0}px) scale(${item.cropScale||1})`}}/>}</span>{asset&&<OverlayAsset source={asset.canvas} item={item}/>}</>}
    {item.kind==='group'&&item.children?.map((child,index)=>{const childAsset=assets.get(child.assetId);return childAsset?<span className="live-group-child" key={`${child.assetId}-${index}`} style={{left:`${child.x/item.width*100}%`,top:`${child.y/item.height*100}%`,width:`${child.width/item.width*100}%`,height:`${child.height/item.height*100}%`,transform:`rotate(${child.rotation}deg)`}}><OverlayAsset source={childAsset.canvas} item={child}/></span>:null})}
  </div>
}

const objectTransform = (item:BoardItem) => `translate(${item.x + item.width/2} ${item.y + item.height/2}) rotate(${item.rotation}) scale(${item.flipX?-1:1} ${item.flipY?-1:1}) translate(${-item.width/2} ${-item.height/2})`

function BoardScene({board,assets,dataUrls,selectedId,interactive,handleScale=1,onItemDown,onItemContext}:SceneProps) {
  const sceneId=interactive?'live':'export'
  const backgroundAspect=board.backgroundFit==='stretch'?'none':board.backgroundFit==='contain'?'xMidYMid meet':'xMidYMid slice'
  return <>
    <defs>
      <filter id={`item-shadow-${sceneId}`} x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#3a2f27" floodOpacity=".18"/></filter>
      {board.items.filter(i=>i.kind==='frame'||i.kind==='photo').map(item=><clipPath id={`clip-${sceneId}-${item.id}`} key={item.id}><rect x={item.kind==='frame'?item.width*.105:0} y={item.kind==='frame'?item.height*.12:0} width={item.kind==='frame'?item.width*.79:item.width} height={item.kind==='frame'?item.height*.76:item.height} rx={item.kind==='frame'?8:12}/></clipPath>)}
      {board.items.filter(i=>i.cutPath).map(item=><clipPath id={`cut-${sceneId}-${item.id}`} key={`cut-${item.id}`}><path d={item.cutPath} transform={`scale(${item.width/100} ${item.height/100})`}/></clipPath>)}
    </defs>
    <rect width={board.width} height={board.height} rx="2" fill={board.background} />
    {board.backgroundImage&&<image href={board.backgroundImage} width={board.width} height={board.height} opacity={board.backgroundOpacity??1} preserveAspectRatio={backgroundAspect}/>}
    {board.items.map((item) => {
      const asset = item.assetId ? assets.get(item.assetId) : undefined
      return <g key={item.id} transform={objectTransform(item)} opacity={item.opacity} onPointerDown={interactive?(e)=>onItemDown?.(e,item.id,'move'):undefined} onContextMenu={interactive?(e)=>onItemContext?.(e,item.id):undefined} className={interactive?'canvas-object':''}>
        {interactive&&<rect width={item.width} height={item.height} fill="transparent" pointerEvents="all"/>}
        {!interactive&&item.kind==='text' && <text x="0" y={item.fontSize || 28} fill={item.color || '#302b26'} fontSize={item.fontSize || 28} fontFamily="ui-serif, STKaiti, KaiTi, serif" style={{whiteSpace:'pre'}}>{(item.text||'').split('\n').map((line,n)=><tspan key={n} x="0" dy={n===0?0:(item.fontSize||28)*1.28}>{line}</tspan>)}</text>}
        {!interactive&&(item.kind==='asset'||item.kind==='stitch') && <AssetImage asset={asset} item={item} dataUrls={dataUrls} sceneId={sceneId}/>}
        {!interactive&&item.kind==='drawnStitch'&&item.points&&<StitchArtwork points={item.points} style={item.stitchStyle} color={item.strokeColor} width={item.strokeWidth} spacing={item.stitchSpacing}/>}
        {!interactive&&item.kind==='photo' && <g clipPath={`url(#clip-${sceneId}-${item.id})`}><image href={item.photoData} x={item.cropX||0} y={item.cropY||0} width={item.width*(item.cropScale||1)} height={item.height*(item.cropScale||1)} preserveAspectRatio="xMidYMid slice"/></g>}
        {!interactive&&item.kind==='frame' && <>
          <rect x={item.width*.105} y={item.height*.12} width={item.width*.79} height={item.height*.76} rx="8" fill="#d9ccb7"/>
          {item.photoData ? <g clipPath={`url(#clip-${sceneId}-${item.id})`}><image href={item.photoData} x={item.width*.105+(item.cropX||0)} y={item.height*.12+(item.cropY||0)} width={item.width*.79*(item.cropScale||1)} height={item.height*.76*(item.cropScale||1)} preserveAspectRatio="xMidYMid slice"/></g> : <g><rect x={item.width*.105} y={item.height*.12} width={item.width*.79} height={item.height*.76} fill="#eee5d5"/><text x={item.width/2} y={item.height/2} textAnchor="middle" fill="#7d7062" fontSize="18">点击「换照片」</text></g>}
          <AssetImage asset={asset} item={item} dataUrls={dataUrls} sceneId={sceneId}/>
        </>}
        {!interactive&&item.kind==='group' && item.children?.map((child,n)=><g key={n} transform={`translate(${child.x} ${child.y}) rotate(${child.rotation} ${child.width/2} ${child.height/2})`}><AssetImage asset={assets.get(child.assetId)} item={child} dataUrls={dataUrls} sceneId={sceneId}/></g>)}
      </g>
    })}
    {interactive && selectedId && (()=>{
      const item=board.items.find(i=>i.id===selectedId); if(!item) return null
      return <g transform={`translate(${item.x} ${item.y}) rotate(${item.rotation} ${item.width/2} ${item.height/2})`} className="selection-ui">
        <rect x="-5" y="-5" width={item.width+10} height={item.height+10} rx="6" fill="none" stroke="#405747" strokeWidth="2" strokeDasharray="8 5" vectorEffect="non-scaling-stroke"/>
        <g className="resize-handle" transform={`translate(${item.width+4} ${item.height+4}) scale(${handleScale})`} onPointerDown={(e)=>onItemDown?.(e,item.id,'resize')}><title>拖动缩放</title><circle className="handle-hit" cx="0" cy="0" r="22" fill="transparent"/><circle cx="0" cy="0" r="12" fill="#f8f3e9" stroke="#405747" strokeWidth="2" pointerEvents="none"/></g>
        <g className="rotate-handle" transform={`translate(${item.width/2} -6) scale(${handleScale})`} onPointerDown={(e)=>onItemDown?.(e,item.id,'rotate')}><title>拖动旋转</title><line x1="0" y1="0" x2="0" y2="-31" stroke="#405747" strokeWidth="2" pointerEvents="none"/><circle className="handle-hit" cx="0" cy="-39" r="22" fill="transparent"/><circle cx="0" cy="-39" r="12" fill="#405747" stroke="#fff" strokeWidth="2" pointerEvents="none"/></g>
        {item.kind==='stitch' && <><circle cx="0" cy={item.height/2} r="12" fill="#f8f3e9" stroke="#405747" strokeWidth="2" onPointerDown={(e)=>onItemDown?.(e,item.id,'stitchStart')}/><circle cx={item.width} cy={item.height/2} r="12" fill="#f8f3e9" stroke="#405747" strokeWidth="2" onPointerDown={(e)=>onItemDown?.(e,item.id,'stitchEnd')}/></>}
      </g>
    })()}
  </>
}

function App() {
  const [assets,setAssets] = useState<Asset[]>([])
  const [assetData,setAssetData] = useState<Map<string,string>>(new Map())
  const [workspace,setWorkspace] = useState<SavedState|null>(null)
  const [selectedId,setSelectedId] = useState<string>()
  const [tab,setTab] = useState<AssetCategory>('fabric')
  const [filters,setFilters] = useState({colors:[] as string[],materials:[] as string[],patterns:[] as string[]})
  const [seriesFilter,setSeriesFilter] = useState('')
  const [searchQuery,setSearchQuery] = useState('')
  const [filterExpanded,setFilterExpanded] = useState(false)
  const [visibleLimit,setVisibleLimit] = useState(40)
  const [drawerOpen,setDrawerOpen] = useState(true)
  const [seriesInfo,setSeriesInfo] = useState<string>()
  const [view,setView] = useState({zoom:.88,panX:110,panY:75})
  const [panMode,setPanMode] = useState(false)
  const [history,setHistory] = useState<Board[]>([])
  const [future,setFuture] = useState<Board[]>([])
  const [toast,setToast] = useState('')
  const [saveState,setSaveState] = useState<'saved'|'saving'|'error'>('saved')
  const [showExport,setShowExport] = useState(false)
  const [showBoards,setShowBoards] = useState(false)
  const [showHelp,setShowHelp] = useState(false)
  const [showText,setShowText] = useState(false)
  const [textDraft,setTextDraft] = useState('')
  const [textSize,setTextSize] = useState(28)
  const [textColor,setTextColor] = useState('#405747')
  const [cropMode,setCropMode] = useState(false)
  const [showBackground,setShowBackground] = useState(false)
  const [showStart,setShowStart] = useState(false)
  const [showTrace,setShowTrace] = useState(false)
  const [traceSource,setTraceSource] = useState<{data:string;name:string}>()
  const [tracePreview,setTracePreview] = useState('')
  const [traceMode,setTraceMode] = useState<TraceMode>('outline')
  const [traceThreshold,setTraceThreshold] = useState(80)
  const [traceColors,setTraceColors] = useState(6)
  const [traceBusy,setTraceBusy] = useState(false)
  const [pendingFabric,setPendingFabric] = useState<Asset>()
  const [cutTargetId,setCutTargetId] = useState<string>()
  const [cutShape,setCutShape] = useState<CutShape>('square')
  const [freehandPoints,setFreehandPoints] = useState<{x:number;y:number}[]>([])
  const [drawingCut,setDrawingCut] = useState(false)
  const [cutTextureOffset,setCutTextureOffset] = useState({x:0,y:0})
  const [cutTextureScale,setCutTextureScale] = useState(1)
  const [inlineCutId,setInlineCutId] = useState<string>()
  const [inlineCutPoints,setInlineCutPoints] = useState<{x:number;y:number}[]>([])
  const [drawingInlineCut,setDrawingInlineCut] = useState(false)
  const [contextMenu,setContextMenu] = useState<{id:string;x:number;y:number}>()
  const [showLayers,setShowLayers] = useState(false)
  const [guideSelected,setGuideSelected] = useState(false)
  const [stitchDrawMode,setStitchDrawMode] = useState(false)
  const [stitchDrawPoints,setStitchDrawPoints] = useState<PathPoint[]>([])
  const [drawingStitch,setDrawingStitch] = useState(false)
  const [stitchStyle,setStitchStyle] = useState<StitchStyle>('running')
  const [stitchColor,setStitchColor] = useState('#704c43')
  const [stitchWidth,setStitchWidth] = useState(3)
  const [stitchSpacing,setStitchSpacing] = useState(16)
  const [stagePixelScale,setStagePixelScale] = useState(1)
  const [showFabricUpload,setShowFabricUpload] = useState(false)
  const [fabricDraft,setFabricDraft] = useState<{data:string;name:string;color:string;pattern:string;material:string;confidence:string}>()
  const photoInput = useRef<HTMLInputElement>(null)
  const projectInput = useRef<HTMLInputElement>(null)
  const traceInput = useRef<HTMLInputElement>(null)
  const fabricInput = useRef<HTMLInputElement>(null)
  const backgroundInput = useRef<HTMLInputElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<DragState|undefined>(undefined)
  const cutPanRef = useRef<{clientX:number;clientY:number;x:number;y:number}|undefined>(undefined)
  const toastTimer = useRef<number|undefined>(undefined)

  const board = workspace?.boards.find(b=>b.id===workspace.activeBoardId)
  const assetMap = useMemo(()=>new Map(assets.map(a=>[a.id,a])),[assets])
  const selected = board?.items.find(i=>i.id===selectedId)

  const notify = useCallback((message:string)=>{
    setToast(message); if(toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current=window.setTimeout(()=>setToast(''),2800)
  },[])

  useEffect(()=>{
    Promise.all([fetch('/assets/catalog.json').then(r=>r.json()) as Promise<Asset[]>,loadWorkspace()]).then(([list,saved])=>{
      const next:SavedState=saved?.version===1?saved:{version:1,activeBoardId:'',boards:[],userFabrics:[],onboardingSeen:false}
      setAssets([...list,...(next.userFabrics||[])])
      setWorkspace(next)
      setShowStart(!next.onboardingSeen)
    }).catch(()=>{setWorkspace({version:1,activeBoardId:'',boards:[],userFabrics:[],onboardingSeen:false});setShowStart(true);notify('工作台部分数据载入失败，已为你打开空白板。')})
  },[notify])

  useEffect(()=>{
    const stage=svgRef.current
    if(!stage)return
    const measure=()=>{const width=stage.getBoundingClientRect().width;if(width>0)setStagePixelScale(width/STAGE_W)}
    measure()
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(measure):undefined
    observer?.observe(stage)
    window.addEventListener('resize',measure)
    return()=>{observer?.disconnect();window.removeEventListener('resize',measure)}
  },[board?.id])

  useEffect(()=>{
    if(!traceSource||!showTrace)return
    let cancelled=false
    const timer=window.setTimeout(()=>{
      setTraceBusy(true)
      makeTrace(traceSource.data,traceMode,traceThreshold,traceColors).then(result=>{if(!cancelled)setTracePreview(result)}).catch(()=>notify('纸样生成失败，请换一张更清晰的图片。')).finally(()=>{if(!cancelled)setTraceBusy(false)})
    },220)
    return()=>{cancelled=true;clearTimeout(timer)}
  },[traceSource,traceMode,traceThreshold,traceColors,showTrace,notify])

  const loadAssetData = useCallback(async (asset:Asset) => {
    if (assetData.has(asset.id)) return
    try {
      const response=await fetch(asset.canvas)
      const data=asset.canvas.endsWith('.svg')
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(await response.text())}`
        : await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);response.blob().then(blob=>reader.readAsDataURL(blob),reject)})
      setAssetData(current=>{const next=new Map(current);next.set(asset.id,data);return next})
    } catch { /* 画布仍可使用同源静态 URL 显示 */ }
  },[assetData])

  useEffect(()=>{
    if(!board||!assets.length)return
    const ids=new Set<string>()
    for(const item of board.items){if(item.assetId)ids.add(item.assetId);for(const child of item.children||[])ids.add(child.assetId)}
    for(const id of ids){const asset=assetMap.get(id);if(asset&&!assetData.has(id))void loadAssetData(asset)}
  },[board,assets,assetMap,assetData,loadAssetData])

  useEffect(()=>{
    if(!workspace) return
    if(workspace.boards.length===0) { const first=defaultBoard(); setWorkspace({...workspace,activeBoardId:first.id,boards:[first]}); return }
    setSaveState('saving')
    const timer=window.setTimeout(()=>saveWorkspace(workspace).then(()=>setSaveState('saved')).catch(()=>{setSaveState('error');notify('自动保存失败。请先下载项目备份。')}),450)
    return ()=>clearTimeout(timer)
  },[workspace,notify])

  const replaceBoard = useCallback((next:Board)=>{
    setWorkspace(ws=>ws?{...ws,boards:ws.boards.map(b=>b.id===next.id?next:b)}:ws)
  },[])

  const commit = useCallback((recipe:(current:Board)=>Board)=>{
    if(!board) return
    setHistory(h=>[...h.slice(-39),clone(board)])
    setFuture([])
    replaceBoard({...recipe(clone(board)),updatedAt:now()})
  },[board,replaceBoard])

  const mutateLive = useCallback((recipe:(current:Board)=>Board)=>{
    if(!board) return
    replaceBoard({...recipe(clone(board)),updatedAt:now()})
  },[board,replaceBoard])

  const undo = useCallback(()=>{
    if(!board||!history.length) return
    const previous=history.at(-1)!; setFuture(f=>[clone(board),...f].slice(0,40)); setHistory(h=>h.slice(0,-1)); replaceBoard(previous); setSelectedId(undefined)
  },[board,history,replaceBoard])
  const redo = useCallback(()=>{
    if(!board||!future.length) return
    const next=future[0]; setHistory(h=>[...h,clone(board)].slice(-40)); setFuture(f=>f.slice(1)); replaceBoard(next); setSelectedId(undefined)
  },[board,future,replaceBoard])

  const fitView = useCallback((b=board)=>{
    if(!b)return; const z=Math.min(1080/b.width,680/b.height); setView({zoom:z,panX:(STAGE_W-b.width*z)/2,panY:(STAGE_H-b.height*z)/2})
  },[board])
  useEffect(()=>{ if(board) fitView(board) },[board?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const toWorld = useCallback((clientX:number,clientY:number)=>{
    const rect=svgRef.current!.getBoundingClientRect(); const sx=(clientX-rect.left)*STAGE_W/rect.width; const sy=(clientY-rect.top)*STAGE_H/rect.height
    return {x:(sx-view.panX)/view.zoom,y:(sy-view.panY)/view.zoom,sx,sy}
  },[view])

  const onItemDown = useCallback((e:React.PointerEvent,id:string,mode:HandleMode)=>{
    if(inlineCutId||stitchDrawMode)return
    if(!board)return; e.stopPropagation(); e.preventDefault(); const p=toWorld(e.clientX,e.clientY); const item=board.items.find(i=>i.id===id); if(!item)return
    setContextMenu(undefined);setGuideSelected(false);setSelectedId(id); setCropMode(false); dragRef.current={mode,id,startX:p.x,startY:p.y,original:clone(item),before:clone(board)}; svgRef.current?.setPointerCapture?.(e.pointerId)
  },[board,toWorld,inlineCutId,stitchDrawMode])

  const onStageDown = (e:React.PointerEvent<SVGSVGElement>)=>{
    if(!board)return
    setContextMenu(undefined)
    if(inlineCutId){const p=toWorld(e.clientX,e.clientY);setInlineCutPoints([{x:p.x,y:p.y}]);setDrawingInlineCut(true);e.currentTarget.setPointerCapture(e.pointerId);return}
    if(stitchDrawMode){const p=toWorld(e.clientX,e.clientY);setStitchDrawPoints([{x:p.x,y:p.y}]);setDrawingStitch(true);e.currentTarget.setPointerCapture(e.pointerId);return}
    if(panMode){ const p=toWorld(e.clientX,e.clientY); dragRef.current={mode:'pan',startX:p.sx,startY:p.sy,before:clone(board),startView:{...view}}; e.currentTarget.setPointerCapture(e.pointerId) }
    else {setSelectedId(undefined);setGuideSelected(false)}
  }

  const onPointerMove = (e:React.PointerEvent<SVGSVGElement>)=>{
    if(drawingInlineCut&&inlineCutId){const p=toWorld(e.clientX,e.clientY);setInlineCutPoints(points=>points.length&&Math.hypot(points.at(-1)!.x-p.x,points.at(-1)!.y-p.y)<3?points:[...points,{x:p.x,y:p.y}]);return}
    if(drawingStitch&&stitchDrawMode){const p=toWorld(e.clientX,e.clientY);setStitchDrawPoints(points=>points.length&&Math.hypot(points.at(-1)!.x-p.x,points.at(-1)!.y-p.y)<2.2?points:[...points,{x:p.x,y:p.y}]);return}
    const d=dragRef.current; if(!d||!board)return
    if(d.mode==='pan'&&d.startView){ const p=toWorld(e.clientX,e.clientY); setView({...d.startView,panX:d.startView.panX+p.sx-d.startX,panY:d.startView.panY+p.sy-d.startY}); return }
    if(!d.id||!d.original)return
    const p=toWorld(e.clientX,e.clientY), dx=p.x-d.startX, dy=p.y-d.startY, o=d.original
    mutateLive(b=>({...b,items:b.items.map(item=>{
      if(item.id!==d.id)return item
      if(d.mode==='move') return {...item,x:o.x+dx,y:o.y+dy}
      if(d.mode==='resize') {
        const width=Math.max(36,o.width+dx),height=Math.max(24,o.height+dy)
        if(o.kind==='drawnStitch'&&o.points){const sx=width/o.width,sy=height/o.height;return{...item,width,height,points:o.points.map(point=>({x:point.x*sx,y:point.y*sy})),stitchBasePoints:o.stitchBasePoints?.map(point=>({x:point.x*sx,y:point.y*sy})),strokeWidth:Math.max(1,(o.strokeWidth||3)*Math.sqrt(sx*sy)),stitchSpacing:Math.max(5,(o.stitchSpacing||16)*Math.sqrt(sx*sy))}}
        return {...item,width,height}
      }
      if(d.mode==='rotate'){ const cx=o.x+o.width/2,cy=o.y+o.height/2; const start=Math.atan2(d.startY-cy,d.startX-cx),current=Math.atan2(p.y-cy,p.x-cx); return {...item,rotation:o.rotation+(current-start)*180/Math.PI} }
      if(d.mode==='stitchEnd'){ const cx=o.x,cy=o.y+o.height/2; const length=Math.max(30,Math.hypot(p.x-cx,p.y-cy)); return {...item,width:length,rotation:Math.atan2(p.y-cy,p.x-cx)*180/Math.PI} }
      if(d.mode==='stitchStart'){ const ex=o.x+Math.cos(o.rotation*Math.PI/180)*o.width,ey=o.y+o.height/2+Math.sin(o.rotation*Math.PI/180)*o.width; const length=Math.max(30,Math.hypot(ex-p.x,ey-p.y)); return {...item,x:p.x,y:p.y-o.height/2,width:length,rotation:Math.atan2(ey-p.y,ex-p.x)*180/Math.PI} }
      return item
    })}))
  }
  const onPointerUp = ()=>{
    if(inlineCutId&&board){
      const item=board.items.find(current=>current.id===inlineCutId)
      if(item&&inlineCutPoints.length>=3){
        const angle=-item.rotation*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle),cx=item.x+item.width/2,cy=item.y+item.height/2
        const normalized=inlineCutPoints.map(point=>{const dx=point.x-cx,dy=point.y-cy;let x=dx*cos-dy*sin+item.width/2,y=dx*sin+dy*cos+item.height/2;if(item.flipX)x=item.width-x;if(item.flipY)y=item.height-y;return{x:Math.max(0,Math.min(100,x/item.width*100)),y:Math.max(0,Math.min(100,y/item.height*100))}})
        const path=`M${normalized.map(point=>`${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join('L')}Z`
        commit(current=>({...current,items:current.items.map(part=>part.id===inlineCutId?{...part,cutShape:'freehand',cutPath:path,textureScale:part.textureScale||1,textureX:part.textureX||0,textureY:part.textureY||0}:part)}));notify('已按画布上的描边裁好，仍可撤销或恢复整块布。')
      }else notify('轮廓太短，请沿纸样完整画一圈。')
      setDrawingInlineCut(false);setInlineCutId(undefined);setInlineCutPoints([]);return
    }
    if(stitchDrawMode&&drawingStitch&&board){
      if(stitchDrawPoints.length>=2){
        const minX=Math.min(...stitchDrawPoints.map(point=>point.x)),maxX=Math.max(...stitchDrawPoints.map(point=>point.x)),minY=Math.min(...stitchDrawPoints.map(point=>point.y)),maxY=Math.max(...stitchDrawPoints.map(point=>point.y)),padding=12
        const item:BoardItem={id:uid(),kind:'drawnStitch',x:minX-padding,y:minY-padding,width:Math.max(30,maxX-minX+padding*2),height:Math.max(30,maxY-minY+padding*2),rotation:0,opacity:1,points:stitchDrawPoints.map(point=>({x:point.x-minX+padding,y:point.y-minY+padding})),stitchStyle,strokeColor:stitchColor,strokeWidth:stitchWidth,stitchSpacing}
        commit(current=>({...current,items:[...current.items,item]}));setSelectedId(item.id);setGuideSelected(false);notify('缝线已放好。选中后可以切换针法、缩放和旋转。')
      }else notify('轨迹太短，请按住并画出一段缝线。')
      setDrawingStitch(false);setStitchDrawPoints([]);return
    }
    const d=dragRef.current; if(!d)return
    if(d.mode!=='pan'&&board&&JSON.stringify(d.before.items)!==JSON.stringify(board.items)){ setHistory(h=>[...h.slice(-39),d.before]); setFuture([]) }
    dragRef.current=undefined
  }

  const addAsset = (asset:Asset,x?:number,y?:number)=>{
    if(!board)return
    if(asset.category==='frame'&&selected?.kind==='frame'){ commit(b=>({...b,items:b.items.map(i=>i.id===selected.id?{...i,assetId:asset.id}:i)}));notify('已换相框，照片与裁切已保留。');return }
    const w=asset.width,h=asset.height
    const item:BoardItem={id:uid(),kind:asset.shape==='frame'?'frame':asset.shape==='stitch'?'stitch':['flower','mosaic'].includes(asset.shape)?'group':'asset',assetId:asset.id,x:x??Math.max(20,(board.width-w)/2+(Math.random()-.5)*90),y:y??Math.max(20,(board.height-h)/2+(Math.random()-.5)*70),width:w,height:h,rotation:(Math.random()-.5)*5,opacity:asset.pattern==='半透明'?.82:1}
    if(asset.shape==='flower') item.children=clone(flowerChildren)
    if(asset.shape==='mosaic') item.children=clone(houseChildren)
    void loadAssetData(asset)
    for(const child of item.children||[]){const childAsset=assetMap.get(child.assetId);if(childAsset)void loadAssetData(childAsset)}
    commit(b=>({...b,items:[...b.items,item]}));setSelectedId(item.id);notify(`${asset.name}已放到画布`)
  }

  const openCutter=(asset:Asset,targetId?:string)=>{
    const target=targetId?board?.items.find(item=>item.id===targetId):undefined
    setPendingFabric(asset);setCutTargetId(targetId);setCutShape(target?.cutShape||'square');setFreehandPoints([])
    setCutTextureScale(target?.textureScale||1);setCutTextureOffset({x:target?(target.textureX||0)/target.width*100:0,y:target?(target.textureY||0)/target.height*100:0});void loadAssetData(asset)
  }
  const placeCutFabric=()=>{
    if(!board||!pendingFabric)return
    let path:string
    if(cutShape==='freehand'){
      if(freehandPoints.length<3){notify('请先用手指或鼠标画出一个封闭轮廓。');return}
      path=`M${freehandPoints.map(point=>`${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join('L')}Z`
    }else path=CUT_PATHS[cutShape]
    if(cutTargetId){
      commit(b=>({...b,items:b.items.map(item=>item.id===cutTargetId?{...item,cutShape,cutPath:path,textureScale:cutTextureScale,textureX:cutTextureOffset.x/100*item.width,textureY:cutTextureOffset.y/100*item.height}:item)}));setSelectedId(cutTargetId);notify('裁剪已应用。拖动布纹、缩放或再次裁剪都不会破坏原布。')
    }else{
      const tall=['petal','leaf','arch'].includes(cutShape),wide=cutShape==='strip'||cutShape==='wave'
      const item:BoardItem={id:uid(),kind:'asset',assetId:pendingFabric.id,x:board.width*.42+(Math.random()-.5)*60,y:board.height*.38+(Math.random()-.5)*50,width:wide?270:tall?150:205,height:wide?100:tall?235:205,rotation:(Math.random()-.5)*3,opacity:pendingFabric.pattern==='半透明'?.82:1,cutShape,cutPath:path,textureScale:cutTextureScale,textureX:0,textureY:0}
      commit(b=>({...b,items:[...b.items,item]}));setSelectedId(item.id);notify(`已裁下一块${pendingFabric.name}`)
    }
    setPendingFabric(undefined);setCutTargetId(undefined);setFreehandPoints([])
  }
  const drawCutPoint=(event:React.PointerEvent<SVGSVGElement>)=>{
    if(!drawingCut)return
    const rect=event.currentTarget.getBoundingClientRect();const x=Math.max(0,Math.min(100,(event.clientX-rect.left)/rect.width*100));const y=Math.max(0,Math.min(100,(event.clientY-rect.top)/rect.height*100))
    setFreehandPoints(points=>points.length&&Math.hypot(points.at(-1)!.x-x,points.at(-1)!.y-y)<1.8?points:[...points,{x,y}])
  }
  const moveCutTexture=(event:React.PointerEvent<SVGSVGElement>)=>{
    if(cutShape==='freehand'||!cutPanRef.current)return
    const rect=event.currentTarget.getBoundingClientRect(),start=cutPanRef.current
    setCutTextureOffset({x:start.x+(event.clientX-start.clientX)/rect.width*100,y:start.y+(event.clientY-start.clientY)/rect.height*100})
  }
  const restoreWholeFabric=(id=selectedId)=>{
    if(!id)return
    commit(b=>({...b,items:b.items.map(item=>{if(item.id!==id)return item;const whole={...item};delete whole.cutShape;delete whole.cutPath;delete whole.textureScale;delete whole.textureX;delete whole.textureY;return whole})}));setContextMenu(undefined);notify('已恢复为整块布，原布没有被删除。')
  }
  const startInlineCut=(id=selectedId)=>{const item=board?.items.find(part=>part.id===id);if(!item||item.kind!=='asset')return;setSelectedId(item.id);setInlineCutId(item.id);setInlineCutPoints([]);setContextMenu(undefined);notify('请直接在画布上沿纸样画一圈，松手后完成裁剪。')}
  const onItemContext=(event:React.MouseEvent,id:string)=>{event.preventDefault();event.stopPropagation();const rect=svgRef.current?.getBoundingClientRect();if(!rect)return;setSelectedId(id);setContextMenu({id,x:event.clientX-rect.left,y:event.clientY-rect.top})}

  const duplicateSelected = ()=>{ if(!selected)return; const copy={...clone(selected),id:uid(),x:selected.x+26,y:selected.y+26}; commit(b=>({...b,items:[...b.items,copy]}));setSelectedId(copy.id) }
  const deleteSelected = ()=>{ if(!selected)return; commit(b=>({...b,items:b.items.filter(i=>i.id!==selected.id)}));setSelectedId(undefined) }
  const layerMove = (front:boolean)=>{ if(!selected)return; commit(b=>{const items=b.items.filter(i=>i.id!==selected.id);return{...b,items:front?[...items,selected]:[selected,...items]}}) }
  const rotateSelected = (delta:number)=>{if(selected)commit(b=>({...b,items:b.items.map(i=>i.id===selected.id?{...i,rotation:i.rotation+delta}:i)}))}
  const scaleSelected = (factor:number)=>{if(selected)commit(b=>({...b,items:b.items.map(item=>{if(item.id!==selected.id)return item;const width=Math.max(24,Math.min(b.width*2,item.width*factor)),height=Math.max(24,Math.min(b.height*2,item.height*factor)),sx=width/item.width,sy=height/item.height,ratio=Math.sqrt(sx*sy);return{...item,x:item.x+(item.width-width)/2,y:item.y+(item.height-height)/2,width,height,...(item.kind==='drawnStitch'&&item.points?{points:item.points.map(point=>({x:point.x*sx,y:point.y*sy})),stitchBasePoints:item.stitchBasePoints?.map(point=>({x:point.x*sx,y:point.y*sy})),strokeWidth:Math.max(1,(item.strokeWidth||3)*ratio),stitchSpacing:Math.max(5,(item.stitchSpacing||16)*ratio)}:{})}})}))}
  const flipSelected = (axis:'x'|'y')=>{if(selected)commit(b=>({...b,items:b.items.map(i=>i.id===selected.id?{...i,[axis==='x'?'flipX':'flipY']:axis==='x'?!i.flipX:!i.flipY}:i)}))}
  const adjustTexture=(dx:number,dy:number,scale:number)=>{if(selected?.cutPath)commit(b=>({...b,items:b.items.map(i=>i.id===selected.id?{...i,textureX:(i.textureX||0)+dx,textureY:(i.textureY||0)+dy,textureScale:Math.max(.7,Math.min(3,(i.textureScale||1)+scale))}:i)}))}
  const changeStitchStyle=(style:StitchStyle)=>{if(selected?.kind==='drawnStitch')commit(b=>({...b,items:b.items.map(item=>item.id===selected.id?{...item,stitchStyle:style}:item)}));setStitchStyle(style)}
  const updateStitch=(patch:Partial<BoardItem>)=>{if(selected?.kind==='drawnStitch')commit(b=>({...b,items:b.items.map(item=>item.id===selected.id?{...item,...patch}:item)}))}
  const changeStitchInset=(value:number)=>{if(selected?.kind==='drawnStitch'&&selected.stitchBasePoints)commit(b=>({...b,items:b.items.map(item=>item.id===selected.id&&item.stitchBasePoints?{...item,stitchInset:value,points:insetContour(item.stitchBasePoints,value)}:item)}))}
  const autoStitch=(source=selected)=>{
    if(!source||source.kind!=='asset'||!source.assetId)return
    const item=stitchFromContour(fabricContour(source),{style:stitchStyle,color:stitchColor,width:stitchWidth,spacing:stitchSpacing,inset:8,sourceId:source.id})
    commit(b=>({...b,items:[...b.items,item]}));setSelectedId(item.id);setGuideSelected(false);notify(`已沿布片边缘生成${STITCH_LABELS[stitchStyle]}，可以继续调整颜色和针距。`)
  }
  const toggleGuide=()=>{if(board?.guide)commit(b=>({...b,guide:{...b.guide!,visible:!b.guide!.visible}}))}
  const setGuideOpacity=(opacity:number)=>{if(board?.guide)mutateLive(b=>({...b,guide:{...b.guide!,opacity}}))}
  const transformGuide=(scaleDelta=0,rotationDelta=0)=>{if(board?.guide)commit(b=>({...b,guide:{...b.guide!,scale:Math.max(.35,Math.min(3,(b.guide!.scale||1)+scaleDelta)),rotation:(b.guide!.rotation||0)+rotationDelta}}))}
  const resetGuideTransform=()=>{if(board?.guide)commit(b=>({...b,guide:{...b.guide!,scale:1,rotation:0}}))}

  const splitFlower = ()=>{
    if(!selected||selected.kind!=='group'||!selected.children)return
    const rad=selected.rotation*Math.PI/180,cx=selected.width/2,cy=selected.height/2
    const pieces=selected.children.map(ch=>{
      const px=ch.x+ch.width/2-cx,py=ch.y+ch.height/2-cy
      const rx=px*Math.cos(rad)-py*Math.sin(rad),ry=px*Math.sin(rad)+py*Math.cos(rad)
      return {id:uid(),kind:'asset' as const,assetId:ch.assetId,x:selected.x+cx+rx-ch.width/2,y:selected.y+cy+ry-ch.height/2,width:ch.width,height:ch.height,rotation:ch.rotation+selected.rotation,opacity:selected.opacity}
    })
    commit(b=>{const at=b.items.findIndex(i=>i.id===selected.id);const items=b.items.filter(i=>i.id!==selected.id);items.splice(at,0,...pieces);return{...b,items}});setSelectedId(pieces[0]?.id);notify('整花已拆成独立布片，可撤销恢复。')
  }

  const addText = ()=>{
    if(!board||!textDraft.trim())return
    if(selected?.kind==='text'){commit(b=>({...b,items:b.items.map(i=>i.id===selected.id?{...i,text:textDraft,fontSize:textSize,color:textColor}:i)}))}
    else {const item:BoardItem={id:uid(),kind:'text',x:board.width*.38,y:board.height*.35,width:340,height:Math.max(50,textDraft.split('\n').length*textSize*1.3),rotation:0,opacity:1,text:textDraft,fontSize:textSize,color:textColor};commit(b=>({...b,items:[...b.items,item]}));setSelectedId(item.id)}
    setShowText(false);setTextDraft('')
  }
  const openText = ()=>{setTextDraft(selected?.kind==='text'?selected.text||'':'在这里写下一句话');setTextSize(selected?.fontSize||28);setTextColor(selected?.color||'#405747');setShowText(true)}

  const addPhotoData = (data:string,name:string,world?:{x:number;y:number})=>{
    if(!board)return
    let target=selected?.kind==='frame'?selected:undefined
    if(world&&!target) target=[...board.items].reverse().find(i=>i.kind==='frame'&&world.x>=i.x&&world.x<=i.x+i.width&&world.y>=i.y&&world.y<=i.y+i.height)
    if(target){commit(b=>({...b,items:b.items.map(i=>i.id===target!.id?{...i,photoData:data,photoName:name,cropX:0,cropY:0,cropScale:1}:i)}));setSelectedId(target.id);notify('照片已装入相框。')}
    else {const item:BoardItem={id:uid(),kind:'photo',x:world?.x??board.width*.35,y:world?.y??board.height*.3,width:360,height:270,rotation:0,opacity:1,photoData:data,photoName:name,cropX:0,cropY:0,cropScale:1};commit(b=>({...b,items:[...b.items,item]}));setSelectedId(item.id);notify('照片已放到画布。')}
  }
  const handlePhoto = async(file?:File,world?:{x:number;y:number})=>{if(!file)return;try{const data=await imageFileToDataUrl(file);addPhotoData(data,file.name,world)}catch(err){notify(err instanceof Error?err.message:'图片导入失败')}}
  const handleBackground=async(file?:File)=>{if(!file)return;try{const data=await imageFileToDataUrl(file);commit(b=>({...b,backgroundImage:data,backgroundImageName:file.name,backgroundFit:b.backgroundFit||'cover',backgroundOpacity:b.backgroundOpacity??1}));setShowBackground(true);notify('背景图片已铺到画布最底层。')}catch(error){notify(error instanceof Error?error.message:'背景图片读取失败')}}

  const onDrop = (e:React.DragEvent)=>{
    e.preventDefault(); if(!board)return; const p=toWorld(e.clientX,e.clientY); const assetId=e.dataTransfer.getData('application/x-pinbu-asset'); const asset=assetMap.get(assetId)
    if(asset)addAsset(asset,p.x-asset.width/2,p.y-asset.height/2); else if(e.dataTransfer.files[0])void handlePhoto(e.dataTransfer.files[0],p)
  }

  const cropAdjust=(dx:number,dy:number,scale=0)=>{if(!selected||(selected.kind!=='frame'&&selected.kind!=='photo'))return;commit(b=>({...b,items:b.items.map(i=>i.id===selected.id?{...i,cropX:(i.cropX||0)+dx,cropY:(i.cropY||0)+dy,cropScale:Math.max(.6,Math.min(3,(i.cropScale||1)+scale))}:i)}))}

  const exportPng = async()=>{
    if(!board)return;setShowExport(false);notify('正在生成高清 PNG…')
    try{
      const svg=document.getElementById('export-svg') as unknown as SVGSVGElement; const copy=svg.cloneNode(true) as SVGSVGElement; copy.setAttribute('xmlns','http://www.w3.org/2000/svg'); copy.setAttribute('width',String(board.width));copy.setAttribute('height',String(board.height));
      const xml=new XMLSerializer().serializeToString(copy);const url=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml'}));const img=new Image()
      await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new Error('渲染失败'));img.src=url})
      const canvas=document.createElement('canvas');canvas.width=board.width*2;canvas.height=board.height*2;const ctx=canvas.getContext('2d')!;ctx.scale(2,2);ctx.drawImage(img,0,0);URL.revokeObjectURL(url)
      const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('PNG 生成失败');fileDownload(blob,`${safeName(board.title)}.png`);notify('PNG 已下载。')
    }catch{notify('导出失败，作品仍已保留。请下载项目备份。')}
  }
  const exportProject=()=>{if(board&&workspace){const usedIds=new Set(board.items.map(item=>item.assetId).filter(Boolean));const bundle={kind:'pinbu-project',version:1,exportedAt:now(),board,userFabrics:(workspace.userFabrics||[]).filter(asset=>usedIds.has(asset.id))};fileDownload(new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}),`${safeName(board.title)}.pinbu.json`)}}
  const importProject=async(file?:File)=>{if(!file||!workspace)return;try{const value=JSON.parse(await file.text());const candidate=value?.kind==='pinbu-project'?value.board:value;if(!validateImportedProject(candidate))throw new Error();const imported={...candidate,id:uid(),title:`${candidate.title}（导入）`,createdAt:now(),updatedAt:now()};const incoming:Array<Asset>=Array.isArray(value?.userFabrics)?value.userFabrics:[];const existing=new Set(assets.map(asset=>asset.id));const safeIncoming=incoming.filter(asset=>asset&&typeof asset.id==='string'&&typeof asset.canvas==='string'&&!existing.has(asset.id));setAssets(current=>[...current,...safeIncoming]);setWorkspace({...workspace,userFabrics:[...(workspace.userFabrics||[]),...safeIncoming],activeBoardId:imported.id,boards:[...workspace.boards,imported]});setHistory([]);setFuture([]);setSelectedId(undefined);notify(`项目已导入${safeIncoming.length?`，包含 ${safeIncoming.length} 种自定义布料`:''}。`)}catch{notify('项目文件无效，当前作品没有改变。')}}

  const activateNewBoard=(b:Board)=>{if(!workspace)return;setWorkspace({...workspace,onboardingSeen:true,activeBoardId:b.id,boards:[...workspace.boards,b]});setHistory([]);setFuture([]);setSelectedId(undefined);setShowBoards(false);setShowStart(false)}
  const newBoard=(format:Board['format']='landscape')=>activateNewBoard(blankBoard(format))
  const startGuided=()=>{activateNewBoard(guidedBoard());setTab('fabric');setDrawerOpen(true);notify('先选一块布，再把它裁成花瓣。')}
  const startFree=()=>{activateNewBoard(blankBoard('landscape'));setTab('fabric');setDrawerOpen(true)}
  const continueCurrent=()=>{if(!workspace)return;setWorkspace({...workspace,onboardingSeen:true});setShowStart(false)}
  const startTrace=()=>{if(workspace)setWorkspace({...workspace,onboardingSeen:true});setShowStart(false);setShowTrace(true);setTraceSource(undefined);setTracePreview('')}
  const applyTrace=()=>{
    if(!traceSource||!tracePreview)return
    const b=blankBoard('square')
    const next:Board={...b,title:`${traceSource.name.replace(/\.[^.]+$/,'')}·拼布纸样`,creationMode:'trace',guide:{imageData:tracePreview,sourceData:traceSource.data,name:traceSource.name,mode:traceMode,opacity:traceMode==='outline'?.62:.4,visible:true}}
    activateNewBoard(next);setShowTrace(false);setTab('fabric');setDrawerOpen(true);notify('纸样已铺到画布上。现在选布，再按纸样裁剪。')
  }
  const handleTraceFile=async(file?:File)=>{if(!file)return;try{const data=await imageFileToDataUrl(file);setTraceSource({data,name:file.name});setTracePreview('')}catch(error){notify(error instanceof Error?error.message:'图片导入失败')}}
  const handleFabricFile=async(file?:File)=>{if(!file)return;try{const data=await imageFileToDataUrl(file);const result=await analyzeFabric(data);setFabricDraft({data,name:file.name.replace(/\.[^.]+$/,''),color:result.color,pattern:result.pattern,material:'未确认',confidence:result.confidence});setShowFabricUpload(true)}catch(error){notify(error instanceof Error?error.message:'布料读取失败')}}
  const saveUserFabric=()=>{
    if(!fabricDraft||!workspace)return
    const id=`user-fabric-${uid()}`
    const asset:Asset={id,name:fabricDraft.name||'我的布料',category:'fabric',color:fabricDraft.color,colors:[fabricDraft.color],pattern:fabricDraft.pattern,material:fabricDraft.material,series:'我的布料',shape:'square',shapeName:'基础布料',width:220,height:180,thumbnail:fabricDraft.data,canvas:fabricDraft.data,sourceType:'私人参考加工',sourceId:id,author:'用户上传',sourceUrl:'',license:'仅当前用户使用',attribution:'用户上传的私人布料',processing:`浏览器本地分析；颜色与纹样建议置信度${fabricDraft.confidence}，由用户确认。`,tags:[fabricDraft.name,fabricDraft.color,fabricDraft.pattern,fabricDraft.material,'我的布料'],edge:'待裁剪',transparent:false}
    setAssets(current=>[...current,asset]);setAssetData(current=>new Map(current).set(id,fabricDraft.data));setWorkspace({...workspace,userFabrics:[...(workspace.userFabrics||[]),asset]});setShowFabricUpload(false);setFabricDraft(undefined);setTab('fabric');setSeriesFilter('我的布料');notify('已收进“我的布料”，标签以后也可以修改。')
  }
  const switchBoard=(id:string)=>{if(!workspace)return;setWorkspace({...workspace,activeBoardId:id});setHistory([]);setFuture([]);setSelectedId(undefined);setShowBoards(false)}
  const changeFormat=(format:Board['format'])=>{if(!board)return;const dims=format==='landscape'?[1100,720]:format==='portrait'?[720,1100]:[900,900];commit(b=>({...b,format,width:dims[0],height:dims[1]}));setTimeout(()=>fitView({...board,format,width:dims[0],height:dims[1]}),0)}

  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      const target=e.target as HTMLElement;if(target.matches('input,textarea,[contenteditable=true]'))return
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}
      else if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo()}
      else if((e.key==='Delete'||e.key==='Backspace')&&selectedId){e.preventDefault();deleteSelected()}
      else if(selected&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const step=e.shiftKey?10:1;const dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;commit(b=>({...b,items:b.items.map(i=>i.id===selected.id?{...i,x:i.x+dx,y:i.y+dy}:i)}))}
    };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)
  },[undo,redo,selectedId,selected,commit])

  const baseFabrics=useMemo(()=>{
    const groups=new Map<string,Asset[]>()
    for(const asset of assets.filter(a=>a.category==='fabric')){
      const key=asset.sourceId||asset.id
      groups.set(key,[...(groups.get(key)||[]),asset])
    }
    return [...groups.values()].map(group=>{
      const asset=group.find(item=>item.shape==='square')||group[0]
      return {...asset,name:asset.name.replace(/·(方块|三角|椭圆|条带|弧形|花瓣|叶片|波浪边|不规则)$/,'')}
    })
  },[assets])
  const colorOptions=['米白','灰棕','红粉','黄橙','绿色','蓝紫','黑色','多色']
  const materialOptions=useMemo(()=>[...new Set(baseFabrics.map(a=>a.material))].sort(),[baseFabrics])
  const patternOptions=useMemo(()=>[...new Set(baseFabrics.map(a=>a.pattern))].sort(),[baseFabrics])
  const seriesOptions=useMemo(()=>[...new Set(baseFabrics.map(a=>a.series))].filter(name=>!name.includes('开放纹理')).sort(),[baseFabrics])
  const toggleFilter=(key:keyof typeof filters,value:string)=>setFilters(current=>({...current,[key]:current[key].includes(value)?current[key].filter(item=>item!==value):[...current[key],value]}))
  const clearFilters=()=>{setFilters({colors:[],materials:[],patterns:[]});setSearchQuery('');setSeriesFilter('')}
  const activeFilterCount=Object.values(filters).reduce((sum,values)=>sum+values.length,0)+(searchQuery?1:0)+(seriesFilter?1:0)
  const normalizedQuery=searchQuery.trim().toLowerCase()
  const matchesFabric=useCallback((a:Asset,omit?:keyof typeof filters)=>{
    if(seriesFilter&&a.series!==seriesFilter)return false
    if(omit!=='colors'&&filters.colors.length&&!filters.colors.some(value=>(a.colors||[]).includes(value)||a.color===value))return false
    if(omit!=='materials'&&filters.materials.length&&!filters.materials.includes(a.material))return false
    if(omit!=='patterns'&&filters.patterns.length&&!filters.patterns.includes(a.pattern))return false
    if(normalizedQuery){const hay=[a.name,a.id,a.shapeName,a.material,a.pattern,a.series,...(a.tags||[])].join(' ').toLowerCase();if(!hay.includes(normalizedQuery))return false}
    return true
  },[filters,normalizedQuery,seriesFilter])
  const filtered=useMemo(()=>tab==='fabric'?baseFabrics.filter(a=>matchesFabric(a)):assets.filter(a=>a.category===tab),[assets,baseFabrics,matchesFabric,tab])
  const facetCount=useCallback((key:keyof typeof filters,value:string)=>baseFabrics.filter(a=>matchesFabric(a,key)&&(
    key==='colors'?((a.colors||[]).includes(value)||a.color===value):key==='materials'?a.material===value:a.pattern===value
  )).length,[baseFabrics,matchesFabric])
  const visibleAssets=filtered.slice(0,visibleLimit)
  useEffect(()=>setVisibleLimit(40),[filters,searchQuery,tab,seriesFilter])

  const placedFabricCount=board?.items.filter(item=>item.kind==='asset'&&assetMap.get(item.assetId||'')?.category==='fabric').length||0
  const cutFabricCount=board?.items.filter(item=>item.kind==='asset'&&item.cutPath).length||0
  const hasDecoration=board?.items.some(item=>item.kind==='stitch'||item.kind==='drawnStitch'||item.kind==='text'||item.kind==='group')||false
  const journeyStep=!board?.guide&&placedFabricCount===0?0:placedFabricCount===0?1:cutFabricCount===0||placedFabricCount<3?2:!hasDecoration?3:4
  const journeyLabels=['纸样','放布','裁布与拼贴','针脚细节','完成']
  const coachAction=()=>{
    if(journeyStep===0){setShowStart(true);return}
    if(journeyStep===1){setDrawerOpen(true);setTab('fabric');return}
    if(journeyStep===2){if(selected&&selected.kind==='asset'){const asset=assetMap.get(selected.assetId||'');if(asset?.category==='fabric'){openCutter(asset,selected.id);return}}setDrawerOpen(true);setTab('fabric');notify('先放入一块布，再选中它开始裁剪。');return}
    if(journeyStep===3){setDrawerOpen(true);setTab('part');return}
    setShowExport(true)
  }
  const coachActionLabel=['选择起点','去放一块布','裁这块布','加针脚与细节','导出作品'][journeyStep]

  const layerName=(item:BoardItem,index:number)=>{
    if(item.kind==='text')return item.text?.split('\n')[0]||'文字'
    if(item.kind==='photo')return item.photoName||'照片'
    if(item.kind==='drawnStitch')return`${item.autoSourceId?'自动':'手绘'}${STITCH_LABELS[item.stitchStyle||'running']}`
    if(item.kind==='group')return assetMap.get(item.assetId||'')?.name||'组合素材'
    return assetMap.get(item.assetId||'')?.name||`图层 ${index+1}`
  }
  const focusLayer=(item:BoardItem)=>{setGuideSelected(false);setStitchDrawMode(false);setDrawingStitch(false);setStitchDrawPoints([]);setSelectedId(item.id);setCropMode(false);setView(current=>({...current,panX:STAGE_W/2-(item.x+item.width/2)*current.zoom,panY:STAGE_H/2-(item.y+item.height/2)*current.zoom}))}

  if(!workspace||!board)return <div className="loading-screen"><div className="thread-spool"/><p>正在铺开布料…</p></div>

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={()=>setShowStart(true)} aria-label="打开创作起点"><span className="brand-mark">拼</span><span><strong>拼布</strong><small>从纸样到作品</small></span></button>
      <div className="board-title-wrap">
        <input aria-label="作品名称" className="board-title" value={board.title} onChange={e=>replaceBoard({...board,title:e.target.value,updatedAt:now()})}/>
        <button className="icon-btn tiny" onClick={()=>setShowBoards(v=>!v)} aria-label="打开作品列表"><ChevronDown size={16}/></button>
        {showBoards&&<div className="popover board-popover"><b>我的作品</b>{workspace.boards.map(b=><button key={b.id} onClick={()=>switchBoard(b.id)} className={b.id===board.id?'active':''}><span>{b.title}</span><small>{new Date(b.updatedAt).toLocaleDateString('zh-CN')}</small></button>)}<button className="new-board" onClick={()=>newBoard()}><Plus size={16}/> 新建空白板</button></div>}
      </div>
      <div className="top-actions">
        <span className={`save-indicator ${saveState}`}><Save size={14}/>{saveState==='saved'?'已保存':saveState==='saving'?'保存中':'保存失败'}</span>
        <button className="icon-btn" onClick={undo} disabled={!history.length} aria-label="撤销"><Undo2/></button>
        <button className="icon-btn" onClick={redo} disabled={!future.length} aria-label="重做"><Redo2/></button>
        <button className="secondary-btn desktop-only" onClick={()=>setShowStart(true)}><Sparkles size={18}/>创作起点</button>
        <button className="primary-btn" onClick={()=>setShowExport(v=>!v)}><Download size={18}/>导出</button>
        {showExport&&<div className="popover export-popover"><button onClick={()=>void exportPng()}><FileImage/><span><b>高清 PNG</b><small>2× 清晰度，不含纸样和选中框</small></span></button><button onClick={exportProject}><Share2/><span><b>发给组员继续编辑</b><small>包含布局、照片和已使用的自定义布料</small></span></button></div>}
        <button className="icon-btn" onClick={()=>setShowHelp(true)} aria-label="使用帮助"><CircleHelp/></button>
      </div>
    </header>

    <main className="workspace">
      <aside className={`library ${drawerOpen?'open':'closed'}`}>
        <div className="library-head"><div><span>材料台</span><small>{baseFabrics.length} 种基础布 · 先放到纸样上再决定怎么裁</small></div><button className="icon-btn" onClick={()=>setDrawerOpen(false)} aria-label="收起素材库"><PanelLeftClose/></button></div>
        <nav className="asset-tabs" aria-label="素材分类">
          {([['fabric','布料',Layers3],['part','针脚装饰',Shapes],['frame','相框',Frame],['inspiration','纸样灵感',Sparkles]] as const).map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon/><span>{label}</span></button>)}
        </nav>
        {tab==='fabric'&&<div className="filters">
          <div className="fabric-actions"><button className="upload-fabric" onClick={()=>fabricInput.current?.click()}><Upload/>上传我的布料</button><span>图片只留在浏览器</span></div>
          <div className="asset-search"><Search/><input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="搜索颜色、材质、格纹…" aria-label="搜索素材"/>{searchQuery&&<button onClick={()=>setSearchQuery('')} aria-label="清除搜索"><X/></button>}</div>
          <div className="series-filter" aria-label="布料系列"><button className={!seriesFilter?'active':''} onClick={()=>setSeriesFilter('')}>全部</button>{seriesOptions.map(series=><button key={series} className={seriesFilter===series?'active':''} onClick={()=>setSeriesFilter(series)}>{series}</button>)}</div>
          <div className="filter-summary"><button className={filterExpanded?'active':''} onClick={()=>setFilterExpanded(v=>!v)}><SlidersHorizontal/>筛选{activeFilterCount?` · ${activeFilterCount}`:''}</button><span>{filtered.length} 件</span>{activeFilterCount>0&&<button onClick={clearFilters}>清除全部</button>}</div>
          <div className={`filter-panel ${filterExpanded?'expanded':''}`}>
            <div className="filter-group"><b>颜色</b><div>{colorOptions.filter(value=>facetCount('colors',value)>0||filters.colors.includes(value)).map(value=><button key={value} className={filters.colors.includes(value)?'active':''} onClick={()=>toggleFilter('colors',value)}><i className={`color-dot color-${value}`}/>{value}<small>{facetCount('colors',value)}</small></button>)}</div></div>
            <div className="filter-group"><b>材质</b><div>{materialOptions.filter(value=>facetCount('materials',value)>0||filters.materials.includes(value)).map(value=><button key={value} className={filters.materials.includes(value)?'active':''} onClick={()=>toggleFilter('materials',value)}>{value}<small>{facetCount('materials',value)}</small></button>)}</div></div>
            <div className="filter-group"><b>纹样</b><div>{patternOptions.filter(value=>facetCount('patterns',value)>0||filters.patterns.includes(value)).map(value=><button key={value} className={filters.patterns.includes(value)?'active':''} onClick={()=>toggleFilter('patterns',value)}>{value}<small>{facetCount('patterns',value)}</small></button>)}</div></div>
          </div>
          {activeFilterCount>0&&<div className="active-filters">{Object.entries(filters).flatMap(([key,values])=>values.map(value=><button key={`${key}-${value}`} onClick={()=>toggleFilter(key as keyof typeof filters,value)}>{value}<X/></button>))}</div>}
        </div>}
        {tab==='inspiration'&&<div className="series-cards"><button onClick={()=>{setTab('fabric');setSeriesFilter('旧布花园')}}><i className="old-garden-swatch"/><span><b>旧布花园</b><small>褪色花布、亚麻与植物刺绣</small></span></button><button onClick={()=>{setTab('fabric');setSeriesFilter('乡居格纹')}}><i className="cottage-swatch"/><span><b>乡居格纹</b><small>小花、点点、条纹和温柔格纹</small></span></button><button onClick={()=>{setTab('fabric');setSeriesFilter('暮色植物')}}><i className="dusk-swatch"/><span><b>暮色植物</b><small>深色植物、旧布修补与花边</small></span></button><button onClick={()=>{setTab('fabric');setSeriesFilter('靛蓝与薄绡')}}><i className="indigo-swatch"/><span><b>靛蓝与薄绡</b><small>手染蓝布、牛仔和半透明纱</small></span></button></div>}
        <div className="asset-grid">{visibleAssets.map(asset=><button key={asset.id} className="asset-card" onClick={()=>addAsset(asset)} draggable onDragStart={e=>{e.dataTransfer.setData('application/x-pinbu-asset',asset.id);e.dataTransfer.effectAllowed='copy'}}><span className="asset-preview"><img src={asset.thumbnail} alt="" loading="lazy"/></span><b>{asset.name}</b><small>{tab==='fabric'?`${asset.color} · ${asset.material} · ${asset.pattern}`:`${asset.material} · ${asset.pattern}`}</small>{tab==='fabric'&&<em>点击或拖入整块布</em>}</button>)}{visibleAssets.length<filtered.length&&<button className="load-more" onClick={()=>setVisibleLimit(limit=>limit+40)}>再看 {Math.min(40,filtered.length-visibleAssets.length)} 件</button>}</div>
        {!filtered.length&&<div className="empty-state"><b>没有找到合适的布片</b><span>试试减少一个条件，或清空后继续取布。</span><button onClick={clearFilters}>清除筛选</button></div>}
        <footer className="library-foot"><button onClick={()=>setSeriesInfo('sources')}><Link2/>关于这套私人素材</button></footer>
      </aside>

      <section className="stage-area">
        {!drawerOpen&&<button className="drawer-reopen" onClick={()=>setDrawerOpen(true)}><PanelLeftOpen/>素材</button>}
        <div className={`floating-add ${selected?.kind==='drawnStitch'?'stitch-selected':''} ${showBackground?'background-open':''}`}>
          <button className={stitchDrawMode?'active':''} onClick={()=>{setShowBackground(false);setShowLayers(false);setStitchDrawMode(true);setInlineCutId(undefined);setStitchDrawPoints([]);setContextMenu(undefined)}}><Pencil/>画缝线</button><button onClick={()=>{setShowBackground(false);setShowLayers(false);photoInput.current?.click()}}><ImagePlus/>照片</button><button onClick={()=>{setShowBackground(false);setShowLayers(false);openText()}}><Type/>文字</button><button className={showBackground?'active':''} onClick={()=>{setShowLayers(false);setShowBackground(value=>!value)}}><Palette/>底布</button><button className={showLayers?'active':''} onClick={()=>{setShowBackground(false);setShowLayers(value=>!value)}}><Layers3/>图层</button>
          {showBackground&&<div className="background-palette"><b>画布背景</b><div className="background-colors">{['#f5f0e6','#e7dbca','#d9cbb7','#d7ddd1','#d9dce3','#d8c8c8','#383633'].map(color=><button key={color} style={{background:color}} className={board.background===color?'active':''} onClick={()=>commit(b=>({...b,background:color}))} aria-label={`底布颜色 ${color}`}/>)}</div><button className="upload-background" onClick={()=>backgroundInput.current?.click()}><ImagePlus/>上传背景图片</button>{board.backgroundImage&&<div className="background-image-settings"><span title={board.backgroundImageName}>{board.backgroundImageName||'已上传背景'}</span><div className="background-fit-buttons">{([['cover','铺满'],['contain','完整'],['stretch','拉伸']] as const).map(([fit,label])=><button key={fit} className={(board.backgroundFit||'cover')===fit?'active':''} onClick={()=>commit(b=>({...b,backgroundFit:fit}))}>{label}</button>)}</div><label>背景深浅<input aria-label="背景图片透明度" type="range" min=".15" max="1" step=".05" value={board.backgroundOpacity??1} onChange={event=>mutateLive(b=>({...b,backgroundOpacity:Number(event.target.value)}))}/></label><button className="remove-background" onClick={()=>commit(b=>{const next={...b};delete next.backgroundImage;delete next.backgroundImageName;delete next.backgroundFit;delete next.backgroundOpacity;return next})}><Trash2/>移除图片背景</button></div>}<small>背景固定在最底层，会随作品保存和导出。</small></div>}
        </div>
        {showLayers&&<aside className="layers-panel" aria-label="全部图层"><header><span><Layers3/><b>全部图层</b><small>{board.items.length+(board.guide?1:0)+1}</small></span><button onClick={()=>setShowLayers(false)} aria-label="关闭图层面板"><X/></button></header><div className="layer-list">{board.guide&&<button className={`layer-row guide-row ${guideSelected?'active':''}`} onClick={()=>{setStitchDrawMode(false);setDrawingStitch(false);setStitchDrawPoints([]);setGuideSelected(true);setSelectedId(undefined);if(!board.guide?.visible)toggleGuide()}}><i><Eye/></i><span><b>{board.guide.name||'纸样'}</b><small>纸样 · 始终置顶</small></span></button>}{[...board.items].map((item,index)=>({item,index})).reverse().map(({item,index})=><button key={item.id} className={`layer-row ${selectedId===item.id?'active':''}`} onClick={()=>focusLayer(item)}><i>{board.items.length-index}</i><span><b>{layerName(item,index)}</b><small>{item.kind==='drawnStitch'?STITCH_LABELS[item.stitchStyle||'running']:item.kind==='text'?'文字':item.kind==='frame'?'相框':item.kind==='photo'?'照片':item.kind==='group'?'组合':'素材'}</small></span></button>)}<button className="layer-row background-row" onClick={()=>{setSelectedId(undefined);setGuideSelected(false);setShowLayers(false);setShowBackground(true)}}><i><Palette/></i><span><b>{board.backgroundImageName||'画布背景'}</b><small>{board.backgroundImage?'图片背景 · 固定最底层':'纯色背景 · 固定最底层'}</small></span></button></div></aside>}
        {!board.coachDismissed&&<div className="journey-coach">
          <div className="journey-steps" aria-label="创作进度">{journeyLabels.map((label,index)=><span key={label} className={index<journeyStep?'done':index===journeyStep?'current':''}>{index<journeyStep?<Check/>:index+1}<b>{label}</b></span>)}</div>
          <button onClick={coachAction}>{coachActionLabel}</button><button className="coach-close" onClick={()=>commit(b=>({...b,coachDismissed:true}))} aria-label="收起创作引导"><X/></button>
        </div>}
        {board.guide&&<div className={`guide-controls ${guideSelected?'selected':''}`}><button onClick={toggleGuide}>{board.guide.visible?<Eye/>:<EyeOff/>}{board.guide.visible?'隐藏纸样':'显示纸样'}</button>{board.guide.visible&&<><label>纸样深浅<input type="range" min="0.12" max="0.85" step="0.01" value={board.guide.opacity} onChange={event=>setGuideOpacity(Number(event.target.value))}/></label><button onClick={()=>transformGuide(-.1,0)} aria-label="缩小纸样" title="缩小纸样"><ZoomOut/></button><button onClick={()=>transformGuide(.1,0)} aria-label="放大纸样" title="放大纸样"><ZoomIn/></button><button onClick={()=>transformGuide(0,-15)} aria-label="纸样向左旋转" title="纸样向左旋转"><RotateCcw/></button><button onClick={()=>transformGuide(0,15)} aria-label="纸样向右旋转" title="纸样向右旋转"><RotateCw/></button><button onClick={resetGuideTransform} aria-label="重置纸样变换" title="重置纸样"><Grip/></button></>}<button onClick={()=>{setTraceSource(board.guide?.sourceData?{data:board.guide.sourceData,name:board.guide.name}:undefined);setTracePreview('');setShowTrace(true)}}><WandSparkles/>换纸样</button></div>}
        {inlineCutId&&<div className="inline-cut-tip"><Pencil/><span><b>沿纸样画裁剪线</b><small>红色轨迹会实时显示，用来对比是否贴合纸样</small></span><button onClick={()=>{setInlineCutId(undefined);setInlineCutPoints([]);setDrawingInlineCut(false)}}>取消</button></div>}
        {stitchDrawMode&&<div className="stitch-draw-tip"><Pencil/><span><b>按住画缝线</b><small>松手生成独立缝线图层，可继续画下一段</small></span><div className="stitch-style-picker">{(Object.entries(STITCH_LABELS) as [StitchStyle,string][]).map(([style,label])=><button key={style} className={stitchStyle===style?'active':''} onClick={()=>setStitchStyle(style)}>{label}</button>)}</div><label className="draw-stitch-color" title="缝线颜色"><input aria-label="新缝线颜色" type="color" value={stitchColor} onChange={event=>setStitchColor(event.target.value)}/></label><label className="draw-stitch-range">粗细<input aria-label="新缝线粗细" type="range" min="1" max="10" step=".5" value={stitchWidth} onChange={event=>setStitchWidth(Number(event.target.value))}/></label><label className="draw-stitch-range">针距<input aria-label="新缝线针距" type="range" min="6" max="30" step="1" value={stitchSpacing} onChange={event=>setStitchSpacing(Number(event.target.value))}/></label><button className="finish-drawing" onClick={()=>{setStitchDrawMode(false);setDrawingStitch(false);setStitchDrawPoints([])}}><Check/>完成</button></div>}
        {board.guide?.visible&&<div className="guide-overlay" style={{left:`${(view.panX+(board.tutorialId==='flower'?board.width*.24:0)*view.zoom)/STAGE_W*100}%`,top:`${(view.panY+(board.tutorialId==='flower'?board.height*.2:0)*view.zoom)/STAGE_H*100}%`,width:`${(board.tutorialId==='flower'?board.width*.52:board.width)*view.zoom/STAGE_W*100}%`,height:`${(board.tutorialId==='flower'?board.height*.55:board.height)*view.zoom/STAGE_H*100}%`,opacity:board.tutorialId==='flower'?Math.max(.68,board.guide.opacity):board.guide.opacity,transform:`rotate(${board.guide.rotation||0}deg) scale(${board.guide.scale||1})`,transformOrigin:'center'}} aria-hidden="true"><img src={board.tutorialId==='flower'?'/assets/guides/flower-guide.svg':board.guide.imageData} alt="" draggable={false}/></div>}
        {(inlineCutPoints.length>0||stitchDrawPoints.length>0)&&<svg className="drawing-trace-overlay" viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} aria-hidden="true"><g transform={`translate(${view.panX} ${view.panY}) scale(${view.zoom})`}>{inlineCutPoints.length>0&&<polyline points={inlineCutPoints.map(point=>`${point.x},${point.y}`).join(' ')} className="inline-cut-line"/>}{stitchDrawPoints.length>0&&<StitchArtwork points={stitchDrawPoints} style={stitchStyle} color={stitchColor} width={stitchWidth} spacing={stitchSpacing}/>}</g></svg>}
        <div className="live-item-layer" aria-hidden="true">{board.items.map(item=><LiveItemOverlay key={item.id} item={item} assets={assetMap} view={view} selected={item.id===selectedId}/>)}</div>
        <svg ref={svgRef} className={`stage-svg ${panMode?'pan-mode':''} ${(inlineCutId||stitchDrawMode)?'draw-mode':''}`} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} onPointerDown={onStageDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onDragOver={e=>e.preventDefault()} onDrop={onDrop} role="application" aria-label="拼布画布">
          <rect width={STAGE_W} height={STAGE_H} fill="#c9c4bb"/>
          <g transform={`translate(${view.panX} ${view.panY}) scale(${view.zoom})`}><BoardScene board={board} assets={assetMap} dataUrls={assetData} selectedId={selectedId} interactive handleScale={1/Math.max(.05,view.zoom*stagePixelScale)} onItemDown={onItemDown} onItemContext={onItemContext}/></g>
        </svg>
        {contextMenu&&(()=>{const item=board.items.find(part=>part.id===contextMenu.id);const asset=item?.assetId?assetMap.get(item.assetId):undefined;const fabric=item?.kind==='asset'&&asset?.category==='fabric';if(!item)return null;return <div className="canvas-context" style={{left:contextMenu.x,top:contextMenu.y}} onMouseDown={event=>event.stopPropagation()}>{fabric&&<button onClick={()=>{autoStitch(item);setContextMenu(undefined)}}><Sparkles/>沿边自动生成缝线</button>}{fabric&&<button onClick={()=>{openCutter(asset!,item.id);setContextMenu(undefined)}}><Scissors/>裁剪这块布…</button>}{fabric&&<button onClick={()=>startInlineCut(item.id)}><Pencil/>沿画布纸样自由裁</button>}{item.cutPath&&<button onClick={()=>restoreWholeFabric(item.id)}><SquareDashed/>恢复整块布</button>}<button onClick={duplicateSelected}><Copy/>复制</button><button className="danger" onClick={deleteSelected}><Trash2/>删除</button></div>})()}
        <div className="view-controls"><button className={panMode?'active':''} onClick={()=>setPanMode(v=>!v)} title="平移画布"><MousePointer2/></button><button onClick={()=>setView(v=>({...v,zoom:Math.max(.25,v.zoom-.1)}))} aria-label="缩小"><ZoomOut/></button><span>{Math.round(view.zoom*100)}%</span><button onClick={()=>setView(v=>({...v,zoom:Math.min(2.5,v.zoom+.1)}))} aria-label="放大"><ZoomIn/></button><button onClick={()=>fitView()} aria-label="回到全景"><Grip/></button></div>
        <div className="format-switch"><button className={board.format==='landscape'?'active':''} onClick={()=>changeFormat('landscape')}>横版</button><button className={board.format==='square'?'active':''} onClick={()=>changeFormat('square')}>方版</button><button className={board.format==='portrait'?'active':''} onClick={()=>changeFormat('portrait')}>竖版</button></div>
        {selected&&<div className="selection-toolbar">
          <span className="selection-name">{selected.kind==='text'?'文字':selected.kind==='drawnStitch'?`手绘${STITCH_LABELS[selected.stitchStyle||'running']}`:assetMap.get(selected.assetId||'')?.name||'照片'}</span>
          <button onClick={()=>scaleSelected(.9)} aria-label="缩小对象"><ZoomOut/>缩小</button><button onClick={()=>scaleSelected(1.1)} aria-label="放大对象"><ZoomIn/>放大</button><button onClick={()=>rotateSelected(-15)} aria-label="向左旋转"><RotateCcw/>左转</button><button onClick={()=>rotateSelected(15)} aria-label="向右旋转"><RotateCw/>右转</button>
          {selected.kind==='frame'&&<><button onClick={()=>photoInput.current?.click()}><ImagePlus/>换照片</button><button className={cropMode?'active':''} onClick={()=>setCropMode(v=>!v)}><MousePointer2/>调整照片</button></>}
          {selected.kind==='text'&&<button onClick={openText}><Type/>编辑</button>}
          {selected.kind==='group'&&<button onClick={splitFlower}><Scissors/>拆开</button>}
          {selected.kind==='asset'&&assetMap.get(selected.assetId||'')?.category==='fabric'&&<><button className="auto-stitch-button" onClick={()=>autoStitch(selected)}><Sparkles/>自动缝边</button><button onClick={()=>openCutter(assetMap.get(selected.assetId||'')!,selected.id)}><Scissors/>裁剪</button><button onClick={()=>startInlineCut(selected.id)}><Pencil/>沿纸样自由裁</button>{selected.cutPath&&<button onClick={()=>restoreWholeFabric(selected.id)}><SquareDashed/>恢复整块</button>}</>}
          {selected.cutPath&&<><button onClick={()=>adjustTexture(-10,0,0)} aria-label="布纹向左">纹理←</button><button onClick={()=>adjustTexture(10,0,0)} aria-label="布纹向右">纹理→</button><button onClick={()=>adjustTexture(0,0,-.12)} aria-label="缩小布纹"><Minus/></button><button onClick={()=>adjustTexture(0,0,.12)} aria-label="放大布纹"><Plus/></button></>}
          <button onClick={duplicateSelected}><Copy/>复制</button>{selected.kind!=='text'&&selected.kind!=='drawnStitch'&&<><button onClick={()=>flipSelected('x')}><FlipHorizontal/>水平翻转</button><button onClick={()=>flipSelected('y')}><FlipVertical/>垂直翻转</button></>}<button onClick={()=>layerMove(true)}><BringToFront/>前移</button><button onClick={()=>layerMove(false)}><SendToBack/>后移</button><button className="danger" onClick={deleteSelected}><Trash2/>删除</button>
        </div>}
        {selected?.kind==='drawnStitch'&&<div className="stitch-editor-panel"><div className="stitch-editor-title"><Pencil/><span><b>{selected.autoSourceId?'自动缝边':'手绘缝线'}</b><small>调整后仍可移动、旋转和缩放</small></span></div><div className="stitch-editor-controls"><label className="stitch-color-control" title="缝线颜色"><span>颜色</span><input aria-label="缝线颜色" type="color" value={selected.strokeColor||'#704c43'} onChange={event=>{setStitchColor(event.target.value);updateStitch({strokeColor:event.target.value})}}/></label><label><span>粗细</span><input aria-label="缝线粗细" type="range" min="1" max="10" step=".5" value={selected.strokeWidth||3} onChange={event=>{const value=Number(event.target.value);setStitchWidth(value);updateStitch({strokeWidth:value})}}/></label><label><span>针距</span><input aria-label="缝线针距" type="range" min="6" max="30" step="1" value={selected.stitchSpacing||16} onChange={event=>{const value=Number(event.target.value);setStitchSpacing(value);updateStitch({stitchSpacing:value})}}/></label><label><span>透明</span><input aria-label="缝线透明度" type="range" min=".2" max="1" step=".05" value={selected.opacity} onChange={event=>updateStitch({opacity:Number(event.target.value)})}/></label>{selected.stitchBasePoints&&<label><span>离边</span><input aria-label="缝线离边距离" type="range" min="-20" max="35" step="1" value={selected.stitchInset||0} onChange={event=>changeStitchInset(Number(event.target.value))}/></label>}</div><div className="stitch-editor-styles">{(Object.entries(STITCH_LABELS) as [StitchStyle,string][]).map(([style,label])=><button key={style} className={selected.stitchStyle===style?'active':''} onClick={()=>changeStitchStyle(style)}>{label}</button>)}</div></div>}
        {cropMode&&selected&&(selected.kind==='frame'||selected.kind==='photo')&&<div className="crop-toolbar"><b>调整框内照片</b><button onClick={()=>cropAdjust(-12,0)}>←</button><button onClick={()=>cropAdjust(12,0)}>→</button><button onClick={()=>cropAdjust(0,-12)}>↑</button><button onClick={()=>cropAdjust(0,12)}>↓</button><button onClick={()=>cropAdjust(0,0,-.1)}><Minus/></button><button onClick={()=>cropAdjust(0,0,.1)}><Plus/></button><button onClick={()=>setCropMode(false)}><Check/>完成</button></div>}
      </section>
    </main>

    <input ref={photoInput} hidden type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={e=>{void handlePhoto(e.target.files?.[0]);e.currentTarget.value=''}}/>
    <input ref={projectInput} hidden type="file" accept="application/json,.json,.pinbu.json" onChange={e=>{void importProject(e.target.files?.[0]);e.currentTarget.value=''}}/>
    <input ref={traceInput} hidden type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={e=>{void handleTraceFile(e.target.files?.[0]);e.currentTarget.value=''}}/>
    <input ref={fabricInput} hidden type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={e=>{void handleFabricFile(e.target.files?.[0]);e.currentTarget.value=''}}/>
    <input ref={backgroundInput} hidden type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={e=>{void handleBackground(e.target.files?.[0]);e.currentTarget.value=''}}/>
    <svg id="export-svg" className="export-svg" xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${board.width} ${board.height}`}><BoardScene board={board} assets={assetMap} dataUrls={assetData}/></svg>

    {showStart&&<div className="modal-backdrop start-backdrop"><div className="start-modal" role="dialog" aria-modal="true" aria-label="选择创作起点"><div className="start-copy"><small>从一个清楚的起点开始</small><h1>今天想怎么拼？</h1><p>不需要先学会编辑器。选一条路，第一步会直接出现在你面前。</p></div><div className="start-choices">
      <button className="start-choice recommended" onClick={startGuided}><span className="choice-art flower-art"><i/><i/><i/><i/><i/><b/></span><span><em>推荐第一次</em><strong>跟着做一朵布花</strong><small>选布、裁花瓣、对齐纸样，3分钟完成第一件作品。</small></span></button>
      <button className="start-choice" onClick={startTrace}><span className="choice-art trace-art"><WandSparkles/><i/><i/><i/></span><span><em>照片 / 线稿 / 成品图</em><strong>上传图片，生成拼布纸样</strong><small>可选轮廓、色块或手动描图，再按形状裁布。</small></span></button>
      <button className="start-choice" onClick={startFree}><span className="choice-art free-art"><i/><i/><i/></span><span><em>我已经有想法</em><strong>从空白画布自由创作</strong><small>直接选布、裁剪和叠放，所有引导都可收起。</small></span></button>
    </div>{workspace.boards.length>0&&<button className="continue-work" onClick={continueCurrent}><span>继续上次的作品</span><b>{board.title}</b><small>{board.items.length} 个元素 · 已自动保存</small></button>}</div></div>}

    {showTrace&&<div className="modal-backdrop" onMouseDown={()=>setShowTrace(false)}><div className="modal trace-modal" onMouseDown={event=>event.stopPropagation()}><div className="modal-head"><div><small>把图片变成可描的底稿</small><h2>生成拼布纸样</h2></div><button onClick={()=>setShowTrace(false)}><X/></button></div>{!traceSource?<button className="trace-drop" onClick={()=>traceInput.current?.click()}><Upload/><strong>选择一张图片</strong><span>简笔画、线稿和主体清楚的照片效果最好</span><small>JPG、PNG 或 WebP · 只在本机处理</small></button>:<><div className="trace-layout"><div className={`trace-preview ${traceBusy?'busy':''}`}><img src={tracePreview||traceSource.data} alt="纸样预览"/><span>{traceBusy?'正在重新描线…':'纸样预览'}</span></div><div className="trace-settings"><b>一、选择拓印方式</b><div className="trace-modes"><button className={traceMode==='outline'?'active':''} onClick={()=>setTraceMode('outline')}><Pencil/><strong>轮廓纸样</strong><small>动物、花朵、物品外形</small></button><button className={traceMode==='blocks'?'active':''} onClick={()=>setTraceMode('blocks')}><Layers3/><strong>色块纸样</strong><small>分层贴布和复杂照片</small></button><button className={traceMode==='manual'?'active':''} onClick={()=>setTraceMode('manual')}><MousePointer2/><strong>手动描图</strong><small>保留原图，自己沿边裁</small></button></div>{traceMode==='outline'&&<label className="range-field"><span>轮廓精简度 <b>{traceThreshold}</b></span><input type="range" min="25" max="150" value={traceThreshold} onChange={event=>setTraceThreshold(Number(event.target.value))}/></label>}{traceMode==='blocks'&&<label className="range-field"><span>主要色块 <b>{traceColors}色</b></span><input type="range" min="4" max="8" step="2" value={traceColors} onChange={event=>setTraceColors(Number(event.target.value))}/></label>}<button className="change-image" onClick={()=>traceInput.current?.click()}>换一张图</button></div></div><div className="modal-actions"><button onClick={()=>setShowTrace(false)}>取消</button><button className="primary-btn" disabled={!tracePreview||traceBusy} onClick={applyTrace}>用这张纸样开始拼布</button></div></>}</div></div>}

    {pendingFabric&&<div className="modal-backdrop" onMouseDown={()=>{setPendingFabric(undefined);setCutTargetId(undefined)}}><div className="modal cut-modal" onMouseDown={event=>event.stopPropagation()}><div className="modal-head"><div><small>布已在画布上 · 裁剪后仍可重新调整</small><h2>裁剪“{pendingFabric.name}”</h2></div><button onClick={()=>{setPendingFabric(undefined);setCutTargetId(undefined)}}><X/></button></div><div className="cut-layout"><div><svg className={`cut-preview ${cutShape==='freehand'?'draw-mode':''}`} viewBox="0 0 100 100" onPointerDown={event=>{if(cutShape==='freehand'){const rect=event.currentTarget.getBoundingClientRect();setFreehandPoints([{x:(event.clientX-rect.left)/rect.width*100,y:(event.clientY-rect.top)/rect.height*100}]);setDrawingCut(true)}else cutPanRef.current={clientX:event.clientX,clientY:event.clientY,x:cutTextureOffset.x,y:cutTextureOffset.y};event.currentTarget.setPointerCapture(event.pointerId)}} onPointerMove={event=>cutShape==='freehand'?drawCutPoint(event):moveCutTexture(event)} onPointerUp={()=>{setDrawingCut(false);cutPanRef.current=undefined}} onPointerCancel={()=>{setDrawingCut(false);cutPanRef.current=undefined}}><defs><clipPath id="modal-cut"><path d={cutShape==='freehand'?(freehandPoints.length?`M${freehandPoints.map(point=>`${point.x} ${point.y}`).join('L')}Z`:'M8 8H92V92H8Z'):CUT_PATHS[cutShape]}/></clipPath></defs><image href={pendingFabric.canvas} x={cutTextureOffset.x-50*(cutTextureScale-1)} y={cutTextureOffset.y-50*(cutTextureScale-1)} width={100*cutTextureScale} height={100*cutTextureScale} preserveAspectRatio="xMidYMid slice" clipPath="url(#modal-cut)"/><path className="cut-outline" d={cutShape==='freehand'?(freehandPoints.length?`M${freehandPoints.map(point=>`${point.x} ${point.y}`).join('L')}${drawingCut?'':'Z'}`:'M8 8H92V92H8Z'):CUT_PATHS[cutShape]}/></svg><p className="draw-hint">{cutShape==='freehand'?'在预览中按住画出任意轮廓。如果要贴着画布纸样描，请用画布上的“沿纸样自由裁”。':'按住拖动布料，选择想保留的纹样范围。'}</p><label className="cut-zoom"><span>布纹大小 <b>{Math.round(cutTextureScale*100)}%</b></span><input type="range" min="0.6" max="3" step="0.05" value={cutTextureScale} onChange={event=>setCutTextureScale(Number(event.target.value))}/></label></div><div className="cut-options"><b>选择裁剪形状</b><div className="shape-grid">{([['square','方块'],['triangle','三角'],['circle','圆形'],['strip','条带'],['petal','花瓣'],['leaf','叶片'],['arch','拱形'],['wave','波浪'],['freehand','自由画轮廓']] as const).map(([shape,label])=><button key={shape} className={cutShape===shape?'active':''} onClick={()=>{setCutShape(shape);setFreehandPoints([])}}><i className={`shape-icon shape-${shape}`}/><span>{label}</span></button>)}</div><div className="cut-note"><Scissors/><span><strong>非破坏性裁剪</strong><small>原布不会消失。裁好后仍可移动、放大布纹，重新裁剪或一键恢复整布。</small></span></div></div></div><div className="modal-actions"><button onClick={()=>{setPendingFabric(undefined);setCutTargetId(undefined)}}>暂不裁剪</button>{cutTargetId&&board.items.find(item=>item.id===cutTargetId)?.cutPath&&<button onClick={()=>{restoreWholeFabric(cutTargetId);setPendingFabric(undefined);setCutTargetId(undefined)}}>恢复整块布</button>}<button className="primary-btn" onClick={placeCutFabric}><Scissors/>应用裁剪</button></div></div></div>}

    {showFabricUpload&&fabricDraft&&<div className="modal-backdrop" onMouseDown={()=>setShowFabricUpload(false)}><div className="modal fabric-modal" onMouseDown={event=>event.stopPropagation()}><div className="modal-head"><div><small>系统先给建议，你来做最后确认</small><h2>收进我的布料</h2></div><button onClick={()=>setShowFabricUpload(false)}><X/></button></div><div className="fabric-review"><img src={fabricDraft.data} alt="上传的布料"/><div><label>布料名称<input value={fabricDraft.name} onChange={event=>setFabricDraft({...fabricDraft,name:event.target.value})}/></label><label>主要颜色<select value={fabricDraft.color} onChange={event=>setFabricDraft({...fabricDraft,color:event.target.value})}>{colorOptions.map(value=><option key={value}>{value}</option>)}</select></label><label>纹样<select value={fabricDraft.pattern} onChange={event=>setFabricDraft({...fabricDraft,pattern:event.target.value})}>{['纯色','碎花','格纹','条纹','波点','几何','印染','纹理','多色图案'].map(value=><option key={value}>{value}</option>)}</select></label><label>材质<select value={fabricDraft.material} onChange={event=>setFabricDraft({...fabricDraft,material:event.target.value})}>{['未确认','棉布','亚麻','牛仔','毛毡','丝缎','纱类','帆布'].map(value=><option key={value}>{value}</option>)}</select></label><p>图片无法稳定判断真实材质，所以材质默认留为“未确认”。颜色与纹样建议置信度：{fabricDraft.confidence}。</p></div></div><div className="modal-actions"><button onClick={()=>setShowFabricUpload(false)}>取消</button><button className="primary-btn" onClick={saveUserFabric}>确认并收进布料柜</button></div></div></div>}

    {showText&&<div className="modal-backdrop" onMouseDown={()=>setShowText(false)}><div className="modal text-modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><small>添加文字</small><h2>给这一页留句话</h2></div><button onClick={()=>setShowText(false)}>×</button></div><textarea autoFocus value={textDraft} onChange={e=>setTextDraft(e.target.value)} rows={4}/><div className="text-options"><label>字号 <input type="range" min="14" max="72" value={textSize} onChange={e=>setTextSize(Number(e.target.value))}/><span>{textSize}</span></label><label>颜色 <input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)}/></label></div><div className="modal-actions"><button onClick={()=>setShowText(false)}>取消</button><button className="primary-btn" onClick={addText}>放到画布</button></div></div></div>}
    {showHelp&&<div className="modal-backdrop" onMouseDown={()=>setShowHelp(false)}><div className="modal help-modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><small>一条看得懂的创作路径</small><h2>纸样 → 放布 → 裁布 → 拼贴</h2></div><button onClick={()=>setShowHelp(false)}>×</button></div><div className="help-steps"><div><b>01</b><span><strong>从纸样、图片或空白板开始</strong><small>图片可转轮廓、色块或半透明描图底稿，纸样随时可隐藏。</small></span></div><div><b>02</b><span><strong>先把整块布放上画布</strong><small>点击或拖入即可，放下后立即能选中、移动、缩放和旋转。</small></span></div><div><b>03</b><span><strong>选中或右键后再决定怎么裁</strong><small>可拖动布纹选范围、自由画轮廓，也可直接贴着画布上的纸样描边。手机用底部的“裁剪”按钮。</small></span></div><div><b>04</b><span><strong>手绘针脚，或给布片自动缝边</strong><small>选中布片点“自动缝边”，系统会沿真实裁剪轮廓生成独立缝线；颜色、粗细、针距、透明度、离边距离和针法都能继续调整。</small></span></div></div><div className="shortcut-list"><span>右键布料 裁剪 / 自动缝边</span><span>⌘/Ctrl Z 撤销</span><span>Delete 删除</span><span>方向键微移</span></div><div className="modal-actions"><button onClick={()=>projectInput.current?.click()}><Upload/>导入组员项目</button><button className="primary-btn" onClick={()=>{setShowHelp(false);setShowStart(true)}}>回到创作起点</button></div></div></div>}
    {seriesInfo&&<div className="modal-backdrop" onMouseDown={()=>setSeriesInfo(undefined)}><div className="modal source-modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><small>私人本地学习素材包</small><h2>{seriesInfo==='sources'?'关于这套素材':seriesInfo}</h2></div><button onClick={()=>setSeriesInfo(undefined)}>×</button></div>{seriesInfo==='sources'&&<><div className="source-stats"><b>{baseFabrics.length}</b><span>基础布料</span><b>9</b><span>内置裁法</span><b>{assets.filter(a=>a.category==='fabric').length}</b><span>兼容旧裁片</span></div><p>素材库以“基础布料”为主体。用户先把整布放到画布，然后再选形状、拖动纹样范围或沿纸样自由裁剪，不会再把同一块布的九种形状当作九种材料。旧作品依然能正常打开。</p><p>内置素材根据用户提供的参考提炼色彩、织纹、旧化与手作语言；用户上传的布料只存在当前浏览器，系统标签只是建议，以用户确认为准。</p><div className="source-links"><a href="/assets/fabric-overview.webp" target="_blank">打开完整布料总览 ↗</a></div></>}</div></div>}
    {toast&&<div className="toast" role="status">{toast}</div>}
  </div>
}

export default App
