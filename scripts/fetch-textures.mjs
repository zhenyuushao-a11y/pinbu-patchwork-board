import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

const checkedAt = '2026-11-12'
const root = new URL('../', import.meta.url)
const sourceDir = new URL('../assets/sources/base/', import.meta.url)
await mkdir(sourceDir, { recursive: true })

const polyIds = [
  'bi_stretch','book_pattern','caban','cotton_jersey','crepe_georgette','crepe_satin',
  'curly_teddy_checkered','curly_teddy_natural','denim_fabric','denim_fabric_03',
  'denim_fabric_05','fabric_pattern_05','floral_jacquard','gingham_check','hessian_230',
  'jersey_melange','jogging_melange','knitted_fleece','polar_fleece','poly_wool_herringbone',
  'quatrefoil_jacquard_fabric','ribbed_corduroy','rough_linen','waffle_pique_cotton',
]

const ambientIds = [
  'Fabric085','Fabric084','Fabric066','Fabric080','Fabric026','Fabric023','Fabric018','Fabric035',
  'Fabric068','Fabric070','Fabric037','Fabric064','Fabric016','Fabric020','Fabric008','Fabric079',
]

const zhNames = {
  bi_stretch:'暖黄弹力布', book_pattern:'橄榄书布', caban:'橙色绒布', cotton_jersey:'米色针织棉',
  crepe_georgette:'青绿乔其纱', crepe_satin:'金色绉缎', curly_teddy_checkered:'青绿泰迪绒格',
  curly_teddy_natural:'自然白泰迪绒', denim_fabric:'旧蓝牛仔', denim_fabric_03:'浅蓝牛仔',
  denim_fabric_05:'炭灰牛仔', fabric_pattern_05:'暖灰棋盘棉布', floral_jacquard:'深色花卉提花',
  gingham_check:'绿色餐布格', hessian_230:'黄麻粗布', jersey_melange:'蓝色混纺针织',
  jogging_melange:'灰白运动绒', knitted_fleece:'棕色针织绒', polar_fleece:'奶油摇粒绒',
  poly_wool_herringbone:'灰色人字呢', quatrefoil_jacquard_fabric:'红色四叶提花',
  ribbed_corduroy:'绿色灯芯绒', rough_linen:'粗织蓝麻', waffle_pique_cotton:'黄色华夫棉',
  Fabric085:'砖红混色布', Fabric084:'湖蓝织物', Fabric066:'灰绿织物', Fabric080:'莓粉织物',
  Fabric026:'深红织物', Fabric023:'靛蓝织物', Fabric018:'苔绿织物', Fabric035:'姜黄织物',
  Fabric068:'杏橙织物', Fabric070:'青柠织物', Fabric037:'森林绿织物', Fabric064:'雾紫织物',
  Fabric016:'灰粉织物', Fabric020:'蓝紫织物', Fabric008:'沙色织物', Fabric079:'炭黑织物',
}

const getJson = async (url) => {
  const response = await fetch(url, { headers: { 'User-Agent': 'Pinbu local asset preparation/1.0' } })
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  return response.json()
}
const getBuffer = async (url) => {
  const response = await fetch(url, { headers: { 'User-Agent': 'Pinbu local asset preparation/1.0' } })
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  return Buffer.from(await response.arrayBuffer())
}
const md5 = (buffer) => createHash('md5').update(buffer).digest('hex')

const polyCatalog = await getJson('https://api.polyhaven.com/assets?type=textures&category=textiles-leather')
const ambientCatalog = await getJson('https://ambientcg.com/api/v3/assets?type=material&q=fabric&limit=100&include=downloads,title,url,tags,colors,thumbnails')
const ambientMap = new Map(ambientCatalog.assets.map((item) => [item.id, item]))
const sources = []

for (const id of polyIds) {
  const meta = polyCatalog[id]
  if (!meta) throw new Error(`Poly Haven 缺少 ${id}`)
  const files = await getJson(`https://api.polyhaven.com/files/${id}`)
  const colorKey = Object.keys(files).find((key) => /^(col1|diffuse|diff|basecolor|albedo)$/i.test(key)) || Object.keys(files).find((key) => /^col/i.test(key))
  const file = files[colorKey]?.['1k']?.jpg || files[colorKey]?.['1k']?.png
  if (!file?.url) throw new Error(`Poly Haven ${id} 缺少 1K 色彩贴图`)
  const buffer = await getBuffer(file.url)
  const ext = file.url.endsWith('.png') ? 'png' : 'jpg'
  const localFile = `assets/sources/base/poly-${id}.${ext}`
  await writeFile(new URL(`../${localFile}`, import.meta.url), buffer)
  sources.push({
    id:`poly-${id}`, provider:'Poly Haven', title:meta.name, chineseName:zhNames[id], author:Object.keys(meta.authors || {}).join('、') || 'Poly Haven contributors',
    originalPage:`https://polyhaven.com/a/${id}`, license:'CC0 1.0', licenseUrl:'https://polyhaven.com/license', checkedAt,
    downloadUrl:file.url, localFile, md5:md5(buffer), width:meta.max_resolution?.[0] || null, height:meta.max_resolution?.[1] || null,
    tags:meta.tags || [], categories:meta.categories || [], sourceType:'开放纹理', processing:'下载 1K 色彩贴图；后续以抗锯齿透明蒙版裁切为独立布片。',
  })
  console.log(`Poly Haven ${id}`)
}

for (const id of ambientIds) {
  const meta = ambientMap.get(id)
  if (!meta) throw new Error(`ambientCG 缺少 ${id}`)
  const download = meta.downloads.find((item) => item.attributes === '1K-JPG')
  if (!download) throw new Error(`ambientCG ${id} 缺少 1K JPG`)
  const zip = await getBuffer(download.url)
  const tmp = `/private/tmp/${id}-pinbu.zip`
  await writeFile(tmp, zip)
  const buffer = execFileSync('unzip', ['-p', tmp, `${id}_1K-JPG_Color.jpg`], { maxBuffer: 20 * 1024 * 1024 })
  const localFile = `assets/sources/base/acg-${id}.jpg`
  await writeFile(new URL(`../${localFile}`, import.meta.url), buffer)
  sources.push({
    id:`acg-${id}`, provider:'ambientCG', title:meta.title, chineseName:zhNames[id], author:'ambientCG contributors',
    originalPage:meta.url || `https://ambientcg.com/a/${id}`, license:'CC0 1.0', licenseUrl:'https://docs.ambientcg.com/license/', checkedAt,
    downloadUrl:download.url, localFile, md5:md5(buffer), width:1024, height:1024, colors:meta.colors || [], tags:meta.tags || [], categories:['fabric'],
    sourceType:'开放纹理', processing:'下载 1K JPG 包并提取 Color 贴图；后续以抗锯齿透明蒙版裁切为独立布片。',
  })
  console.log(`ambientCG ${id}`)
}

await writeFile(new URL('../assets/sources/source-manifest.json', import.meta.url), JSON.stringify({version:1,checkedAt,total:sources.length,sources}, null, 2))
console.log(`Saved ${sources.length} verified CC0 base textures.`)
