import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const assets = [
  ['linen-oat','燕麦素麻','fabric','#cdbb9d',['#cdbb9d','#eadfcd'],'素色','亚麻质感','通用素材','rect',260,180],
  ['linen-clay','陶土素麻','fabric','#ae745f',['#ae745f','#d9a28c'],'素色','亚麻质感','通用素材','rect',230,160],
  ['cotton-cream','奶油棉布','fabric','#eee3cf',['#eee3cf','#fffaf0'],'素色','棉布质感','通用素材','rect',260,170],
  ['cotton-moss','苔绿棉布','fabric','#66745d',['#66745d','#9aa68f'],'素色','棉布质感','通用素材','rect',240,170],
  ['denim-faded','水洗牛仔','fabric','#61758b',['#61758b','#9eb0c2'],'斜纹','牛仔质感','通用素材','rect',240,175],
  ['gingham-rose','灰粉格纹','fabric','#c98f98',['#c98f98','#f3dadd','#fff8ef'],'格纹','棉布质感','通用素材','rect',250,170],
  ['gingham-moss','苔绿格纹','fabric','#75836c',['#75836c','#dfe2d4','#f7f2e7'],'格纹','棉布质感','通用素材','rect',250,165],
  ['stripe-sand','沙色条纹','fabric','#ba9c75',['#ba9c75','#eadbc6'],'条纹','棉麻质感','通用素材','rect',250,170],
  ['floral-dusty','雾粉碎花','fabric','#c88f91',['#c88f91','#f3d9d2','#73806a'],'碎花','棉布质感','通用素材','rect',235,175],
  ['floral-night','夜色碎花','fabric','#4f5367',['#4f5367','#d6b6b8','#c9c0a4'],'碎花','棉布质感','通用素材','rect',235,175],
  ['indigo-leaf','靛蓝花叶','fabric','#2f4f73',['#2f4f73','#f5f0e6'],'蓝白印花','棉布质感','南通蓝印花布灵感','rect',235,175],
  ['indigo-diamond','靛蓝菱纹','fabric','#29496e',['#29496e','#edf0e8'],'几何印花','棉布质感','南通蓝印花布灵感','rect',235,175],
  ['indigo-bloom','靛蓝团花','fabric','#365b82',['#365b82','#f3eee2'],'蓝白印花','棉布质感','南通蓝印花布灵感','rect',235,175],
  ['indigo-border','靛蓝窄边条','fabric','#244267',['#244267','#f1ecdf'],'边条','棉布质感','南通蓝印花布灵感','rect',290,64],
  ['jogakbo-coral','珊瑚薄绡','fabric','#d78b7a',['#d78b7a','#f1b4a5'],'半透明','苎麻薄绡质感','韩国 Jogakbo 灵感','rect',210,165],
  ['jogakbo-jade','青玉薄绡','fabric','#72a291',['#72a291','#b8d3c7'],'半透明','苎麻薄绡质感','韩国 Jogakbo 灵感','rect',245,145],
  ['jogakbo-amber','琥珀薄绡','fabric','#c7a05b',['#c7a05b','#ead49b'],'半透明','苎麻薄绡质感','韩国 Jogakbo 灵感','rect',190,180],
  ['jogakbo-violet','暮紫薄绡','fabric','#8a7696',['#8a7696','#c8bad0'],'半透明','苎麻薄绡质感','韩国 Jogakbo 灵感','rect',210,150],
  ['jogakbo-cloud','云白薄绡','fabric','#ded8ca',['#ded8ca','#f8f3e9'],'半透明','苎麻薄绡质感','韩国 Jogakbo 灵感','rect',230,155],
  ['jogakbo-seam','细接缝布条','fabric','#9a7e66',['#9a7e66','#e6d7c4'],'接缝','苎麻质感','韩国 Jogakbo 灵感','rect',280,38],
  ['petal-blush','灰粉花瓣','part','#c88e96',['#c88e96','#e6b5bb'],'素色','棉布质感','通用素材','petal',120,62],
  ['petal-cream','奶白花瓣','part','#e5d4b7',['#e5d4b7','#f8f0df'],'格纹','棉布质感','通用素材','petal',118,60],
  ['petal-indigo','靛蓝花瓣','part','#395879',['#395879','#dbe1dc'],'蓝白印花','棉布质感','南通蓝印花布灵感','petal',120,62],
  ['leaf-moss','苔绿叶片','part','#52694d',['#52694d','#859675'],'叶脉','棉布质感','通用素材','leaf',116,52],
  ['leaf-olive','橄榄叶片','part','#74744c',['#74744c','#a2a077'],'叶脉','棉布质感','通用素材','leaf',110,50],
  ['button-pearl','旧珍珠扣','part','#e4d8c5',['#e4d8c5','#95816f'],'纽扣','树脂质感','通用素材','button',42,42],
  ['button-wood','木纹纽扣','part','#967151',['#967151','#d0a276'],'纽扣','木质感','通用素材','button',44,44],
  ['stitch-cream','奶白针脚','part','#eee2cd',['#eee2cd','#9a836b'],'针脚','棉线质感','通用素材','stitch',220,22],
  ['stitch-indigo','靛蓝针脚','part','#365373',['#365373','#f2eee3'],'针脚','棉线质感','南通蓝印花布灵感','stitch',220,22],
  ['label-memory','小布标','part','#d7c5a8',['#d7c5a8','#6f6252'],'文字布标','棉麻质感','通用素材','label',145,72],
  ['frame-fray','毛边方框','frame','#c5ad8b',['#c5ad8b','#e9ddc9'],'毛边','亚麻质感','通用素材','frame',330,245],
  ['frame-gingham','格纹包边框','frame','#bd858e',['#bd858e','#f0d8d6','#fff8ed'],'格纹','棉布质感','通用素材','frame',330,245],
  ['frame-patch','拼接圆角框','frame','#71806b',['#71806b','#c9aa7b','#d9b2b4'],'拼接','棉麻质感','韩国 Jogakbo 灵感','frame',330,245],
  ['flower-blush','已拼好的灰粉花','inspiration','#c88e96',['#c88e96','#52694d','#e7c96b'],'布花','混合布料','通用素材','flower',330,300],
  ['sample-indigo','南通蓝印小样','inspiration','#2f4f73',['#2f4f73','#f5f0e6','#c8b28f'],'蓝白印花','棉布质感','南通蓝印花布灵感','jogakbo',360,285],
  ['sample-jogakbo','Jogakbo 小样','inspiration','#d78b7a',['#d78b7a','#72a291','#c7a05b','#8a7696'],'拼接','苎麻薄绡质感','韩国 Jogakbo 灵感','jogakbo',360,285],
  ['sample-house','布块小屋','inspiration','#6d7e65',['#6d7e65','#4f6d8b','#d7b65d'],'基础拼图','混合布料','通用素材','mosaic',360,285],
]

const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
const svgFor = (a) => {
  const [id,name,category,base,colors,pattern,material,series,shape,w,h] = a
  const [c1,c2='#fff',c3='#fff'] = colors
  let motif = ''
  if (pattern === '格纹') motif = `<path d="M0 22H${w}M0 52H${w}M24 0V${h}M56 0V${h}" stroke="${c2}" stroke-width="12" opacity=".5"/><path d="M0 22H${w}M24 0V${h}" stroke="${c3}" stroke-width="2" opacity=".7"/>`
  if (pattern.includes('蓝白') || pattern.includes('印花')) motif = `<g fill="${c2}" opacity=".9"><path d="M32 26c15-22 32 1 13 12 23 6 5 29-9 12-9 22-31 6-18-10-21-14 3-31 11-14z"/><path d="M132 92c15-22 32 1 13 12 23 6 5 29-9 12-9 22-31 6-18-10-21-14 3-31 11-14z"/><circle cx="96" cy="44" r="7"/><circle cx="196" cy="132" r="7"/></g>`
  if (pattern === '几何印花') motif = `<path d="M0 0l28 28L56 0 84 28 112 0 140 28 168 0 196 28 224 0M0 56l28-28 28 28 28-28 28 28 28-28 28 28 28-28 28 28" fill="none" stroke="${c2}" stroke-width="7" opacity=".85"/>`
  if (pattern === '碎花') motif = `<g fill="${c2}" opacity=".8"><circle cx="36" cy="34" r="10"/><circle cx="62" cy="100" r="9"/><circle cx="150" cy="52" r="11"/><circle cx="205" cy="126" r="9"/></g><g stroke="${c3}" stroke-width="3" opacity=".8"><path d="M36 44l10 25m16 41 12 22m76-69 13 31m42 41-20 22"/></g>`
  if (pattern === '条纹' || pattern === '斜纹') motif = `<path d="M-40 15L50-30M-20 55L90-20M0 95L130-20M30 130L170-20M70 170L210-20M120 190L260 0M170 200L290 50" stroke="${c2}" stroke-width="9" opacity=".38"/>`
  if (pattern === '半透明') motif = `<rect width="100%" height="100%" fill="${c2}" opacity=".18"/><path d="M0 20H${w}M0 54H${w}M20 0V${h}M58 0V${h}" stroke="#fff" stroke-width="1" opacity=".28"/>`
  if (shape === 'petal') motif = `<path d="M7 ${h/2}Q${w*.42} -8 ${w-6} ${h/2}Q${w*.42} ${h+8} 7 ${h/2}Z" fill="${c1}" stroke="#735f55" stroke-width="2" stroke-dasharray="5 3"/><path d="M14 ${h/2}H${w-16}" stroke="${c2}" stroke-width="2" opacity=".7"/>`
  if (shape === 'leaf') motif = `<path d="M5 ${h/2}Q${w*.45} -8 ${w-5} ${h/2}Q${w*.45} ${h+8} 5 ${h/2}Z" fill="${c1}" stroke="#43513e" stroke-width="2"/><path d="M12 ${h/2}H${w-14}M48 ${h/2}l-15-13m32 13 15-13M48 ${h/2}l-15 13m32-13 15 13" stroke="${c2}" stroke-width="2" opacity=".6"/>`
  if (shape === 'button') motif = `<circle cx="${w/2}" cy="${h/2}" r="${w/2-3}" fill="${c1}" stroke="#66584d" stroke-width="2"/><circle cx="${w*.38}" cy="${h*.38}" r="3" fill="#695c51"/><circle cx="${w*.62}" cy="${h*.38}" r="3" fill="#695c51"/><circle cx="${w*.38}" cy="${h*.62}" r="3" fill="#695c51"/><circle cx="${w*.62}" cy="${h*.62}" r="3" fill="#695c51"/>`
  if (shape === 'stitch') motif = `<path d="M6 ${h/2}H${w-6}" stroke="${c1}" stroke-width="4" stroke-dasharray="9 7" stroke-linecap="round"/><path d="M6 ${h/2+4}H${w-6}" stroke="#6f6256" stroke-width="1" opacity=".4"/>`
  if (shape === 'label') motif = `<path d="M4 9Q12 2 22 6H${w-10}Q${w-3} 14 ${w-8} ${h-7}H10Q2 ${h-12} 4 9Z" fill="${c1}" stroke="#85715e" stroke-width="2" stroke-dasharray="6 4"/><text x="${w/2}" y="${h/2+5}" text-anchor="middle" fill="${c2}" font-size="16" font-family="serif">片刻留念</text>`
  if (shape === 'frame') motif = `<path d="M5 5H${w-5}V${h-5}H5ZM34 30V${h-30}H${w-34}V30Z" fill="${c1}" fill-rule="evenodd"/><rect x="34" y="30" width="${w-68}" height="${h-60}" rx="6" fill="none" stroke="#6d5b4c" stroke-width="2" stroke-dasharray="7 5" opacity=".55"/><path d="M8 18H${w-8}M8 ${h-18}H${w-8}" stroke="${c2}" stroke-width="10" stroke-dasharray="18 8" opacity=".45"/>`
  if (shape === 'flower') motif = `<g transform="translate(${w/2} ${h/2})"><g fill="${c1}" stroke="#755b5f" stroke-width="2" stroke-dasharray="6 4">${[0,60,120,180,240,300].map(r=>`<ellipse cx="0" cy="-67" rx="35" ry="77" transform="rotate(${r})"/>`).join('')}</g><circle r="20" fill="${c3}"/><g fill="#efe0c8">${[0,60,120,180,240,300].map(r=>`<circle cx="0" cy="-56" r="4" transform="rotate(${r})"/>`).join('')}</g></g>`
  if (shape === 'jogakbo') motif = `<rect width="100%" height="100%" rx="12" fill="${c1}"/><path d="M0 ${h*.35}H${w}M${w*.3} 0V${h}M${w*.68} 0V${h}M${w*.3} ${h*.68}H${w}" stroke="${c2}" stroke-width="7" opacity=".7"/><rect x="${w*.31}" y="7" width="${w*.35}" height="${h*.32}" fill="${c3}" opacity=".55"/><rect x="8" y="${h*.38}" width="${w*.28}" height="${h*.58}" fill="${colors[3]||c2}" opacity=".55"/>`
  if (shape === 'mosaic') motif = `<rect width="100%" height="100%" rx="12" fill="#eee4d4"/><path d="M74 136L180 46l106 90Z" fill="${c2}" stroke="#635649" stroke-width="3" stroke-dasharray="8 5"/><rect x="94" y="134" width="172" height="112" rx="4" fill="${c1}" stroke="#635649" stroke-width="3" stroke-dasharray="8 5"/><rect x="165" y="180" width="45" height="66" fill="${c3}"/><rect x="112" y="157" width="35" height="34" fill="#e9ddd0"/><rect x="225" y="157" width="25" height="34" fill="#e9ddd0"/>`
  const standard = !['petal','leaf','button','stitch','label','frame','flower','jogakbo','mosaic'].includes(shape)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><defs><filter id="n"><feTurbulence baseFrequency=".7" numOctaves="2" seed="${id.length}" result="t"/><feBlend in="SourceGraphic" in2="t" mode="soft-light"/></filter></defs>${standard?`<path d="M6 7Q17 2 29 7L${w-12} 4Q${w-2} 13 ${w-7} 25L${w-4} ${h-13}Q${w-13} ${h-2} ${w-28} ${h-7}L16 ${h-4}Q2 ${h-12} 7 ${h-27}Z" fill="${base}"/>`:''}<g filter="url(#n)">${motif}</g>${standard?`<path d="M10 9L${w-12} 7M9 ${h-10}L${w-10} ${h-8}" stroke="#6d5b4c" stroke-width="1.5" stroke-dasharray="6 5" opacity=".45"/>`:''}<title>${esc(name)}</title></svg>`
}

await mkdir('public/assets/items', { recursive: true })
const catalog = []
const colorCategory = (id, color) => {
  if (/floral|jogakbo/.test(id)) return '多色'
  if (/cream|cloud|oat|pearl/.test(id)) return '米白'
  if (/rose|blush|dusty|clay|coral/.test(id)) return '红粉'
  if (/moss|jade|olive|leaf/.test(id)) return '绿色'
  if (/indigo|denim|night/.test(id)) return '蓝紫'
  if (/amber|sand|wood|label|linen/.test(id)) return '灰棕'
  const hex = color.replace('#',''); const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16)
  if (Math.max(r,g,b)<85) return '黑色'; if (Math.max(r,g,b)-Math.min(r,g,b)<24) return r>190?'米白':'灰棕'
  return r>b*1.25&&r>g*1.05?'红粉':b>r*1.08?'蓝紫':g>r*1.04?'绿色':'黄橙'
}
const shapeNames = {rect:'方块',petal:'花瓣',leaf:'叶片',button:'圆形',stitch:'条带',label:'方块',frame:'相框',flower:'组合花',jogakbo:'拼接小样',mosaic:'基础拼图'}
for (const a of assets) {
  const [id,name,category,color,colors,pattern,material,series,shape,width,height] = a
  const url = `/assets/items/${id}.svg`
  await writeFile(join('public/assets/items', `${id}.svg`), svgFor(a))
  const normalizedShape = shape==='rect'?(height<85?'strip':'square'):shape
  const colorName=colorCategory(id,color)
  catalog.push({id,name,category,color:colorName,colors:[colorName],palette:colors,pattern,material,series,shape:normalizedShape,shapeName:shape==='rect'?(height<85?'条带':'方块'):(shapeNames[shape]||shape),width,height,thumbnail:url,canvas:url,sourceId:`original-${id}`,sourceType:'原创绘制',author:'拼布项目贡献者',sourceUrl:'',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',attribution:'“拼布”内置原创素材，CC BY 4.0',processing:'基于公开工艺资料提炼视觉特征后，以 SVG 原创建模；未复制馆藏或社交媒体图片。',tags:[name,colorName,pattern,material,series,shapeNames[shape]||shape],transparent:true})
}
try {
  const processed = JSON.parse(await readFile('public/assets/texture-pieces.json','utf8'))
  catalog.unshift(...processed)
} catch {}
await writeFile('public/assets/catalog.json', JSON.stringify(catalog, null, 2))
const stats={total:catalog.length,fabric:catalog.filter(x=>x.category==='fabric').length,parts:catalog.filter(x=>x.category==='part').length,frames:catalog.filter(x=>x.category==='frame').length,inspiration:catalog.filter(x=>x.category==='inspiration').length,baseSources:40,transparent:catalog.filter(x=>x.transparent).length}
await writeFile('public/assets/stats.json',JSON.stringify(stats,null,2))
console.log(`Generated catalog with ${catalog.length} assets (${stats.fabric} fabric pieces).`)
