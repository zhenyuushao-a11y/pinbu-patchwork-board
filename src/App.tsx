import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArchiveRestore, ArrowDownToLine, BringToFront, Check, ChevronDown, CircleHelp,
  Copy, Download, FileImage, FolderOpen, Frame, Grip, ImagePlus, Layers3, Link2,
  Minus, MoreHorizontal, MousePointer2, Palette, PanelLeftClose, PanelLeftOpen,
  Plus, Redo2, RotateCcw, RotateCw, Save, Scissors, SendToBack, Shapes, Sparkles,
  SquareDashed, Trash2, Type, Undo2, Upload, ZoomIn, ZoomOut,
} from 'lucide-react'
import type { Asset, AssetCategory, Board, BoardItem, ChildItem, SavedState } from './types'
import { loadWorkspace, saveWorkspace, validateImportedProject } from './storage'

const STAGE_W = 1200
const STAGE_H = 800
const DB_VERSION = 1 as const
const uid = () => crypto.randomUUID()
const clone = <T,>(value: T): T => structuredClone(value)
const now = () => new Date().toISOString()

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
  {assetId:'petal-blush',x:100,y:8,width:120,height:62,rotation:90},
  {assetId:'petal-blush',x:184,y:48,width:120,height:62,rotation:145},
  {assetId:'petal-cream',x:188,y:154,width:118,height:60,rotation:212},
  {assetId:'petal-blush',x:100,y:215,width:120,height:62,rotation:270},
  {assetId:'petal-blush',x:18,y:150,width:120,height:62,rotation:325},
  {assetId:'petal-cream',x:12,y:48,width:118,height:60,rotation:35},
  {assetId:'button-pearl',x:143,y:126,width:44,height:44,rotation:0},
]

function defaultBoard(): Board {
  return {
    version: DB_VERSION, id: uid(), title: '沿途拾光', width: 1100, height: 720,
    format: 'landscape', background: '#e7dbc9', createdAt: now(), updatedAt: now(),
    items: [
      {id:uid(),kind:'asset',assetId:'linen-oat',x:84,y:432,width:350,height:220,rotation:-3,opacity:1},
      {id:uid(),kind:'asset',assetId:'gingham-rose',x:620,y:490,width:330,height:175,rotation:4,opacity:.96},
      {id:uid(),kind:'asset',assetId:'indigo-border',x:70,y:90,width:310,height:68,rotation:-2,opacity:.94},
      {id:uid(),kind:'frame',assetId:'frame-fray',x:168,y:170,width:430,height:322,rotation:-3,opacity:1,photoData:placeholderPhoto,photoName:'原创占位风景',cropX:0,cropY:0,cropScale:1},
      {id:uid(),kind:'asset',assetId:'leaf-moss',x:700,y:320,width:185,height:82,rotation:-32,opacity:1},
      {id:uid(),kind:'asset',assetId:'leaf-olive',x:786,y:390,width:175,height:78,rotation:28,opacity:1},
      {id:uid(),kind:'group',assetId:'flower-blush',x:650,y:220,width:330,height:300,rotation:8,opacity:1,children:flowerChildren},
      {id:uid(),kind:'stitch',assetId:'stitch-cream',x:120,y:570,width:235,height:24,rotation:2,opacity:1},
      {id:uid(),kind:'text',x:700,y:110,width:290,height:70,rotation:1,opacity:1,text:'把日常，缝成一页',fontSize:30,color:'#405747'},
      {id:uid(),kind:'text',x:728,y:164,width:220,height:40,rotation:1,opacity:.78,text:'杭州 · 2026.11',fontSize:17,color:'#5c5148'},
    ],
  }
}

function blankBoard(format: Board['format']='landscape'): Board {
  const dims = format === 'landscape' ? [1100,720] : format === 'portrait' ? [720,1100] : [900,900]
  return {version:1,id:uid(),title:'未命名拼布',width:dims[0],height:dims[1],format,background:'#e7dbc9',items:[],createdAt:now(),updatedAt:now()}
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
  onItemDown?: (event:React.PointerEvent,id:string,mode:HandleMode)=>void
}

function AssetImage({asset,item,dataUrls}:{asset?:Asset,item:BoardItem|ChildItem,dataUrls:Map<string,string>}) {
  if (!asset) return <rect width={item.width} height={item.height} rx="10" fill="#c9b9a2" stroke="#9a8770" strokeDasharray="8 6" />
  return <image href={dataUrls.get(asset.id) || asset.canvas} width={item.width} height={item.height} preserveAspectRatio="none" />
}

function BoardScene({board,assets,dataUrls,selectedId,interactive,onItemDown}:SceneProps) {
  return <>
    <defs>
      <filter id="item-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#3a2f27" floodOpacity=".18"/></filter>
      <filter id="paper-noise"><feTurbulence type="fractalNoise" baseFrequency=".52" numOctaves="2" seed="8" result="noise"/><feColorMatrix in="noise" type="saturate" values="0" result="mono"/><feBlend in="SourceGraphic" in2="mono" mode="soft-light"/></filter>
      {board.items.filter(i=>i.kind==='frame'||i.kind==='photo').map(item=><clipPath id={`clip-${item.id}`} key={item.id}><rect x={item.kind==='frame'?item.width*.105:0} y={item.kind==='frame'?item.height*.12:0} width={item.kind==='frame'?item.width*.79:item.width} height={item.kind==='frame'?item.height*.76:item.height} rx={item.kind==='frame'?8:12}/></clipPath>)}
    </defs>
    <rect width={board.width} height={board.height} rx="2" fill={board.background} filter="url(#paper-noise)" />
    {board.items.map((item) => {
      const asset = item.assetId ? assets.get(item.assetId) : undefined
      return <g key={item.id} transform={`translate(${item.x} ${item.y}) rotate(${item.rotation} ${item.width/2} ${item.height/2})`} opacity={item.opacity} filter={item.kind==='text'?'':'url(#item-shadow)'} onPointerDown={interactive?(e)=>onItemDown?.(e,item.id,'move'):undefined} className={interactive?'canvas-object':''}>
        {item.kind==='text' && <text x="0" y={item.fontSize || 28} fill={item.color || '#302b26'} fontSize={item.fontSize || 28} fontFamily="ui-serif, STKaiti, KaiTi, serif" style={{whiteSpace:'pre'}}>{(item.text||'').split('\n').map((line,n)=><tspan key={n} x="0" dy={n===0?0:(item.fontSize||28)*1.28}>{line}</tspan>)}</text>}
        {(item.kind==='asset'||item.kind==='stitch') && <AssetImage asset={asset} item={item} dataUrls={dataUrls}/>} 
        {item.kind==='photo' && <g clipPath={`url(#clip-${item.id})`}><image href={item.photoData} x={item.cropX||0} y={item.cropY||0} width={item.width*(item.cropScale||1)} height={item.height*(item.cropScale||1)} preserveAspectRatio="xMidYMid slice"/></g>}
        {item.kind==='frame' && <>
          <rect x={item.width*.105} y={item.height*.12} width={item.width*.79} height={item.height*.76} rx="8" fill="#d9ccb7"/>
          {item.photoData ? <g clipPath={`url(#clip-${item.id})`}><image href={item.photoData} x={item.width*.105+(item.cropX||0)} y={item.height*.12+(item.cropY||0)} width={item.width*.79*(item.cropScale||1)} height={item.height*.76*(item.cropScale||1)} preserveAspectRatio="xMidYMid slice"/></g> : <g><rect x={item.width*.105} y={item.height*.12} width={item.width*.79} height={item.height*.76} fill="#eee5d5"/><text x={item.width/2} y={item.height/2} textAnchor="middle" fill="#7d7062" fontSize="18">点击「换照片」</text></g>}
          <AssetImage asset={asset} item={item} dataUrls={dataUrls}/>
        </>}
        {item.kind==='group' && item.children?.map((child,n)=><g key={n} transform={`translate(${child.x} ${child.y}) rotate(${child.rotation} ${child.width/2} ${child.height/2})`}><AssetImage asset={assets.get(child.assetId)} item={child} dataUrls={dataUrls}/></g>)}
      </g>
    })}
    {interactive && selectedId && (()=>{
      const item=board.items.find(i=>i.id===selectedId); if(!item) return null
      return <g transform={`translate(${item.x} ${item.y}) rotate(${item.rotation} ${item.width/2} ${item.height/2})`} className="selection-ui">
        <rect x="-5" y="-5" width={item.width+10} height={item.height+10} rx="6" fill="none" stroke="#405747" strokeWidth="2" strokeDasharray="8 5" vectorEffect="non-scaling-stroke"/>
        <circle cx={item.width+4} cy={item.height+4} r="11" fill="#f8f3e9" stroke="#405747" strokeWidth="2" onPointerDown={(e)=>onItemDown?.(e,item.id,'resize')}><title>拖动缩放</title></circle>
        <line x1={item.width/2} y1="-6" x2={item.width/2} y2="-35" stroke="#405747" strokeWidth="2"/>
        <circle cx={item.width/2} cy="-42" r="11" fill="#405747" stroke="#fff" strokeWidth="2" onPointerDown={(e)=>onItemDown?.(e,item.id,'rotate')}><title>拖动旋转</title></circle>
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
  const [colorFilter,setColorFilter] = useState('全部')
  const [patternFilter,setPatternFilter] = useState('全部')
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
  const photoInput = useRef<HTMLInputElement>(null)
  const projectInput = useRef<HTMLInputElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<DragState|undefined>(undefined)
  const toastTimer = useRef<number|undefined>(undefined)

  const board = workspace?.boards.find(b=>b.id===workspace.activeBoardId)
  const assetMap = useMemo(()=>new Map(assets.map(a=>[a.id,a])),[assets])
  const selected = board?.items.find(i=>i.id===selectedId)

  const notify = useCallback((message:string)=>{
    setToast(message); if(toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current=window.setTimeout(()=>setToast(''),2800)
  },[])

  useEffect(()=>{
    fetch('/assets/catalog.json').then(r=>r.json()).then(async (list:Asset[])=>{
      setAssets(list)
      const pairs = await Promise.all(list.map(async a=>{
        try { const txt=await fetch(a.canvas).then(r=>r.text()); return [a.id,`data:image/svg+xml;charset=utf-8,${encodeURIComponent(txt)}`] as const } catch { return [a.id,a.canvas] as const }
      }))
      setAssetData(new Map(pairs))
    }).catch(()=>notify('素材目录载入失败，请刷新重试。'))
    loadWorkspace().then(saved=>setWorkspace(saved?.version===1?saved:{version:1,activeBoardId:'',boards:[]})).catch(()=>setWorkspace({version:1,activeBoardId:'',boards:[]}))
  },[notify])

  useEffect(()=>{
    if(!workspace) return
    if(workspace.boards.length===0) { const first=defaultBoard(); setWorkspace({version:1,activeBoardId:first.id,boards:[first]}); return }
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
    if(!board)return; e.stopPropagation(); e.preventDefault(); const p=toWorld(e.clientX,e.clientY); const item=board.items.find(i=>i.id===id); if(!item)return
    setSelectedId(id); setCropMode(false); dragRef.current={mode,id,startX:p.x,startY:p.y,original:clone(item),before:clone(board)}; (e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  },[board,toWorld])

  const onStageDown = (e:React.PointerEvent<SVGSVGElement>)=>{
    if(!board)return
    if(panMode){ const p=toWorld(e.clientX,e.clientY); dragRef.current={mode:'pan',startX:p.sx,startY:p.sy,before:clone(board),startView:{...view}}; e.currentTarget.setPointerCapture(e.pointerId) }
    else setSelectedId(undefined)
  }

  const onPointerMove = (e:React.PointerEvent<SVGSVGElement>)=>{
    const d=dragRef.current; if(!d||!board)return
    if(d.mode==='pan'&&d.startView){ const p=toWorld(e.clientX,e.clientY); setView({...d.startView,panX:d.startView.panX+p.sx-d.startX,panY:d.startView.panY+p.sy-d.startY}); return }
    if(!d.id||!d.original)return
    const p=toWorld(e.clientX,e.clientY), dx=p.x-d.startX, dy=p.y-d.startY, o=d.original
    mutateLive(b=>({...b,items:b.items.map(item=>{
      if(item.id!==d.id)return item
      if(d.mode==='move') return {...item,x:o.x+dx,y:o.y+dy}
      if(d.mode==='resize') return {...item,width:Math.max(36,o.width+dx),height:Math.max(24,o.height+dy)}
      if(d.mode==='rotate'){ const cx=o.x+o.width/2,cy=o.y+o.height/2; const start=Math.atan2(d.startY-cy,d.startX-cx),current=Math.atan2(p.y-cy,p.x-cx); return {...item,rotation:o.rotation+(current-start)*180/Math.PI} }
      if(d.mode==='stitchEnd'){ const cx=o.x,cy=o.y+o.height/2; const length=Math.max(30,Math.hypot(p.x-cx,p.y-cy)); return {...item,width:length,rotation:Math.atan2(p.y-cy,p.x-cx)*180/Math.PI} }
      if(d.mode==='stitchStart'){ const ex=o.x+Math.cos(o.rotation*Math.PI/180)*o.width,ey=o.y+o.height/2+Math.sin(o.rotation*Math.PI/180)*o.width; const length=Math.max(30,Math.hypot(ex-p.x,ey-p.y)); return {...item,x:p.x,y:p.y-o.height/2,width:length,rotation:Math.atan2(ey-p.y,ex-p.x)*180/Math.PI} }
      return item
    })}))
  }
  const onPointerUp = ()=>{
    const d=dragRef.current; if(!d)return
    if(d.mode!=='pan'&&board&&JSON.stringify(d.before.items)!==JSON.stringify(board.items)){ setHistory(h=>[...h.slice(-39),d.before]); setFuture([]) }
    dragRef.current=undefined
  }

  const addAsset = (asset:Asset,x?:number,y?:number)=>{
    if(!board)return
    if(asset.category==='frame'&&selected?.kind==='frame'){ commit(b=>({...b,items:b.items.map(i=>i.id===selected.id?{...i,assetId:asset.id}:i)}));notify('已换相框，照片与裁切已保留。');return }
    const w=asset.width,h=asset.height
    const item:BoardItem={id:uid(),kind:asset.shape==='frame'?'frame':asset.shape==='stitch'?'stitch':asset.shape==='flower'?'group':'asset',assetId:asset.id,x:x??Math.max(20,(board.width-w)/2+(Math.random()-.5)*90),y:y??Math.max(20,(board.height-h)/2+(Math.random()-.5)*70),width:w,height:h,rotation:(Math.random()-.5)*5,opacity:asset.pattern==='半透明'?.82:1}
    if(asset.shape==='flower') item.children=clone(flowerChildren)
    commit(b=>({...b,items:[...b.items,item]}));setSelectedId(item.id);notify(`${asset.name}已放到画布`)
  }

  const duplicateSelected = ()=>{ if(!selected)return; const copy={...clone(selected),id:uid(),x:selected.x+26,y:selected.y+26}; commit(b=>({...b,items:[...b.items,copy]}));setSelectedId(copy.id) }
  const deleteSelected = ()=>{ if(!selected)return; commit(b=>({...b,items:b.items.filter(i=>i.id!==selected.id)}));setSelectedId(undefined) }
  const layerMove = (front:boolean)=>{ if(!selected)return; commit(b=>{const items=b.items.filter(i=>i.id!==selected.id);return{...b,items:front?[...items,selected]:[selected,...items]}}) }
  const rotateSelected = (delta:number)=>{if(selected)commit(b=>({...b,items:b.items.map(i=>i.id===selected.id?{...i,rotation:i.rotation+delta}:i)}))}

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
  const exportProject=()=>{if(board)fileDownload(new Blob([JSON.stringify(board,null,2)],{type:'application/json'}),`${safeName(board.title)}.pinbu.json`)}
  const importProject=async(file?:File)=>{if(!file||!workspace)return;try{const value=JSON.parse(await file.text());if(!validateImportedProject(value))throw new Error();const imported={...value,id:uid(),title:`${value.title}（导入）`,createdAt:now(),updatedAt:now()};setWorkspace({...workspace,activeBoardId:imported.id,boards:[...workspace.boards,imported]});setHistory([]);setFuture([]);setSelectedId(undefined);notify('项目已作为独立作品导入。')}catch{notify('项目文件无效，当前作品没有改变。')}}

  const newBoard=(format:Board['format']='landscape')=>{if(!workspace)return;const b=blankBoard(format);setWorkspace({...workspace,activeBoardId:b.id,boards:[...workspace.boards,b]});setHistory([]);setFuture([]);setSelectedId(undefined);setShowBoards(false)}
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

  const colors=['全部','米白','粉','绿','蓝','棕','紫']
  const colorMatch=(a:Asset)=>colorFilter==='全部'||({米白:/#(c|d|e|f)/i,粉:/rose|blush|coral|clay|dusty/i,绿:/moss|jade|olive/i,蓝:/indigo|denim|night/i,棕:/linen|sand|wood|amber|cream/i,紫:/violet/i}[colorFilter as Exclude<typeof colorFilter,'全部'>]||/$^/).test(`${a.id} ${a.color}`)
  const filtered=assets.filter(a=>a.category===tab&&colorMatch(a)&&(patternFilter==='全部'||a.pattern.includes(patternFilter)))

  if(!workspace||!board)return <div className="loading-screen"><div className="thread-spool"/><p>正在铺开布料…</p></div>

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">拼</span><div><strong>拼布</strong><small>把日常缝成一页</small></div></div>
      <div className="board-title-wrap">
        <input aria-label="作品名称" className="board-title" value={board.title} onChange={e=>replaceBoard({...board,title:e.target.value,updatedAt:now()})}/>
        <button className="icon-btn tiny" onClick={()=>setShowBoards(v=>!v)} aria-label="打开作品列表"><ChevronDown size={16}/></button>
        {showBoards&&<div className="popover board-popover"><b>我的作品</b>{workspace.boards.map(b=><button key={b.id} onClick={()=>switchBoard(b.id)} className={b.id===board.id?'active':''}><span>{b.title}</span><small>{new Date(b.updatedAt).toLocaleDateString('zh-CN')}</small></button>)}<button className="new-board" onClick={()=>newBoard()}><Plus size={16}/> 新建空白板</button></div>}
      </div>
      <div className="top-actions">
        <span className={`save-indicator ${saveState}`}><Save size={14}/>{saveState==='saved'?'已保存':saveState==='saving'?'保存中':'保存失败'}</span>
        <button className="icon-btn" onClick={undo} disabled={!history.length} aria-label="撤销"><Undo2/></button>
        <button className="icon-btn" onClick={redo} disabled={!future.length} aria-label="重做"><Redo2/></button>
        <button className="secondary-btn desktop-only" onClick={()=>newBoard()}><SquareDashed size={18}/>空白板</button>
        <button className="primary-btn" onClick={()=>setShowExport(v=>!v)}><Download size={18}/>导出</button>
        {showExport&&<div className="popover export-popover"><button onClick={()=>void exportPng()}><FileImage/><span><b>高清 PNG</b><small>2× 清晰度，不含选中框</small></span></button><button onClick={exportProject}><ArchiveRestore/><span><b>可编辑项目</b><small>包含布局与用户照片</small></span></button></div>}
        <button className="icon-btn" onClick={()=>setShowHelp(true)} aria-label="使用帮助"><CircleHelp/></button>
      </div>
    </header>

    <main className="workspace">
      <aside className={`library ${drawerOpen?'open':'closed'}`}>
        <div className="library-head"><div><span>素材抽屉</span><small>{assets.length} 件原创布艺零件</small></div><button className="icon-btn" onClick={()=>setDrawerOpen(false)}><PanelLeftClose/></button></div>
        <nav className="asset-tabs" aria-label="素材分类">
          {([['fabric','布片',Layers3],['part','零件',Shapes],['frame','相框',Frame],['inspiration','灵感系列',Sparkles]] as const).map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon/><span>{label}</span></button>)}
        </nav>
        {tab==='fabric'&&<div className="filters"><div className="filter-row"><span>颜色</span>{colors.map(c=><button key={c} className={colorFilter===c?'active':''} onClick={()=>setColorFilter(c)}>{c}</button>)}</div><select value={patternFilter} onChange={e=>setPatternFilter(e.target.value)} aria-label="纹样筛选"><option>全部</option><option>素色</option><option>格纹</option><option>碎花</option><option>蓝白印花</option><option>半透明</option></select></div>}
        {tab==='inspiration'&&<div className="series-cards"><button onClick={()=>setSeriesInfo('南通蓝印花布灵感')}><i className="indigo-swatch"/><span><b>南通蓝印花布</b><small>蓝白防染花叶与几何边条</small></span></button><button onClick={()=>setSeriesInfo('韩国 Jogakbo 灵感')}><i className="jogakbo-swatch"/><span><b>韩国 Jogakbo</b><small>薄绡布块与窗格式细接缝</small></span></button></div>}
        <div className="asset-grid">{filtered.map(asset=><button key={asset.id} className="asset-card" onClick={()=>addAsset(asset)} draggable onDragStart={e=>{e.dataTransfer.setData('application/x-pinbu-asset',asset.id);e.dataTransfer.effectAllowed='copy'}}><span className="asset-preview"><img src={asset.thumbnail} alt="" loading="lazy"/></span><b>{asset.name}</b><small>{asset.series==='通用素材'?asset.material:asset.series.replace('灵感','')}</small></button>)}</div>
        {!filtered.length&&<div className="empty-state">没有匹配的布片，换个筛选试试。</div>}
        <footer className="library-foot"><button onClick={()=>setSeriesInfo('sources')}><Link2/>素材来源与许可</button></footer>
      </aside>

      <section className="stage-area">
        {!drawerOpen&&<button className="drawer-reopen" onClick={()=>setDrawerOpen(true)}><PanelLeftOpen/>素材</button>}
        <div className="floating-add">
          <button onClick={()=>photoInput.current?.click()}><ImagePlus/>照片</button><button onClick={openText}><Type/>文字</button>
        </div>
        <svg ref={svgRef} className={`stage-svg ${panMode?'pan-mode':''}`} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} onPointerDown={onStageDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onDragOver={e=>e.preventDefault()} onDrop={onDrop} role="application" aria-label="拼布画布">
          <rect width={STAGE_W} height={STAGE_H} fill="#cfc5b6"/>
          <g transform={`translate(${view.panX} ${view.panY}) scale(${view.zoom})`}><BoardScene board={board} assets={assetMap} dataUrls={assetData} selectedId={selectedId} interactive onItemDown={onItemDown}/></g>
        </svg>
        <div className="view-controls"><button className={panMode?'active':''} onClick={()=>setPanMode(v=>!v)} title="平移画布"><MousePointer2/></button><button onClick={()=>setView(v=>({...v,zoom:Math.max(.25,v.zoom-.1)}))} aria-label="缩小"><ZoomOut/></button><span>{Math.round(view.zoom*100)}%</span><button onClick={()=>setView(v=>({...v,zoom:Math.min(2.5,v.zoom+.1)}))} aria-label="放大"><ZoomIn/></button><button onClick={()=>fitView()} aria-label="回到全景"><Grip/></button></div>
        <div className="format-switch"><button className={board.format==='landscape'?'active':''} onClick={()=>changeFormat('landscape')}>横版</button><button className={board.format==='square'?'active':''} onClick={()=>changeFormat('square')}>方版</button><button className={board.format==='portrait'?'active':''} onClick={()=>changeFormat('portrait')}>竖版</button></div>
        {selected&&<div className="selection-toolbar">
          <span className="selection-name">{selected.kind==='text'?'文字':assetMap.get(selected.assetId||'')?.name||'照片'}</span>
          {selected.kind==='frame'&&<><button onClick={()=>photoInput.current?.click()}><ImagePlus/>换照片</button><button className={cropMode?'active':''} onClick={()=>setCropMode(v=>!v)}><MousePointer2/>调整照片</button></>}
          {selected.kind==='text'&&<button onClick={openText}><Type/>编辑</button>}
          {selected.kind==='group'&&<button onClick={splitFlower}><Scissors/>拆开</button>}
          <button onClick={duplicateSelected}><Copy/>复制</button><button onClick={()=>rotateSelected(-15)} aria-label="向左旋转"><RotateCcw/></button><button onClick={()=>rotateSelected(15)} aria-label="向右旋转"><RotateCw/></button><button onClick={()=>layerMove(true)}><BringToFront/>前移</button><button onClick={()=>layerMove(false)}><SendToBack/>后移</button><button className="danger" onClick={deleteSelected}><Trash2/>删除</button>
        </div>}
        {cropMode&&selected&&(selected.kind==='frame'||selected.kind==='photo')&&<div className="crop-toolbar"><b>调整框内照片</b><button onClick={()=>cropAdjust(-12,0)}>←</button><button onClick={()=>cropAdjust(12,0)}>→</button><button onClick={()=>cropAdjust(0,-12)}>↑</button><button onClick={()=>cropAdjust(0,12)}>↓</button><button onClick={()=>cropAdjust(0,0,-.1)}><Minus/></button><button onClick={()=>cropAdjust(0,0,.1)}><Plus/></button><button onClick={()=>setCropMode(false)}><Check/>完成</button></div>}
      </section>
    </main>

    <input ref={photoInput} hidden type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={e=>{void handlePhoto(e.target.files?.[0]);e.currentTarget.value=''}}/>
    <input ref={projectInput} hidden type="file" accept="application/json,.json,.pinbu.json" onChange={e=>{void importProject(e.target.files?.[0]);e.currentTarget.value=''}}/>
    <svg id="export-svg" className="export-svg" xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${board.width} ${board.height}`}><BoardScene board={board} assets={assetMap} dataUrls={assetData}/></svg>

    {showText&&<div className="modal-backdrop" onMouseDown={()=>setShowText(false)}><div className="modal text-modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><small>添加文字</small><h2>给这一页留句话</h2></div><button onClick={()=>setShowText(false)}>×</button></div><textarea autoFocus value={textDraft} onChange={e=>setTextDraft(e.target.value)} rows={4}/><div className="text-options"><label>字号 <input type="range" min="14" max="72" value={textSize} onChange={e=>setTextSize(Number(e.target.value))}/><span>{textSize}</span></label><label>颜色 <input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)}/></label></div><div className="modal-actions"><button onClick={()=>setShowText(false)}>取消</button><button className="primary-btn" onClick={addText}>放到画布</button></div></div></div>}
    {showHelp&&<div className="modal-backdrop" onMouseDown={()=>setShowHelp(false)}><div className="modal help-modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><small>三步就能开始</small><h2>这里没有复杂的门槛</h2></div><button onClick={()=>setShowHelp(false)}>×</button></div><div className="help-steps"><div><b>01</b><span><strong>点素材，或拖进画布</strong><small>选中后可移动，拖右下角缩放，拖顶部圆点旋转。</small></span></div><div><b>02</b><span><strong>把自己的照片放进来</strong><small>先选相框再点“照片”，也可直接把图片拖到相框。</small></span></div><div><b>03</b><span><strong>下载 PNG 或项目备份</strong><small>不注册，照片不上传。项目文件可在另一浏览器继续编辑。</small></span></div></div><div className="shortcut-list"><span>⌘/Ctrl Z 撤销</span><span>Delete 删除</span><span>方向键微移</span><span>Shift + 方向键 10px</span></div><div className="modal-actions"><button onClick={()=>projectInput.current?.click()}><Upload/>导入项目</button><button className="primary-btn" onClick={()=>setShowHelp(false)}>开始拼布</button></div></div></div>}
    {seriesInfo&&<div className="modal-backdrop" onMouseDown={()=>setSeriesInfo(undefined)}><div className="modal source-modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><small>工艺线索，而非风格标签</small><h2>{seriesInfo==='sources'?'素材来源与许可':seriesInfo}</h2></div><button onClick={()=>setSeriesInfo(undefined)}>×</button></div>{seriesInfo.includes('南通')&&<><p>南通蓝印花布以棉布、靛蓝与防染印花见长。公开资料介绍了以纸版施加防染浆，再反复浸染、氧化形成蓝白纹样的过程。</p><p>本站用原创 SVG 表现花叶、团花、几何纹样和窄边条；没有复制馆藏或社交媒体图片。</p><a href="https://folklife.si.edu/magazine/blue-calico-cloth-nantong-china" target="_blank">史密森尼民俗与文化遗产中心 · 阅读一手资料 ↗</a></>}{seriesInfo.includes('Jogakbo')&&<><p>Jogakbo 是把剩余布片缝成包袱布（bojagi）的拼布方式。棉、丝、苎麻或麻片经平整接缝组成不规则、即兴的窗格式结构。</p><p>本站用原创半透明布块、细接缝与拼接小样表现这些特征；V&A 馆藏图像未入库。</p><a href="https://www.vam.ac.uk/articles/jogakbo-traditional-korean-patchwork" target="_blank">V&amp;A · 阅读一手资料 ↗</a></>}{seriesInfo==='sources'&&<><p>首版 36 件内置素材全部由本项目原创绘制，采用 CC BY 4.0；代码使用 MIT License。参考截图仅用于观察构图与手作视觉语言，不在仓库中再分发。</p><p>每项素材的 ID、系列、许可、署名与加工记录位于 <code>public/assets/catalog.json</code>。完整说明见源码中的 <code>ASSETS.md</code> 与 <code>SOURCES.md</code>。</p><a href="https://www.metmuseum.org/policies/frequently-asked-questions-image-and-data-resources" target="_blank">The Met · Open Access 判断原则 ↗</a></>}</div></div>}
    {toast&&<div className="toast" role="status">{toast}</div>}
  </div>
}

export default App
