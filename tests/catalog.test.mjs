import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'

const catalog = JSON.parse(await readFile(new URL('../public/assets/catalog.json', import.meta.url), 'utf8'))
const sources = JSON.parse(await readFile(new URL('../assets/sources/source-manifest.json', import.meta.url), 'utf8'))

test('内置素材目录完整且 ID 唯一', () => {
  assert.equal(catalog.filter((item) => item.category === 'fabric').length, 140)
  assert.equal(new Set(catalog.map((item) => item.id)).size, catalog.length)
  for (const item of catalog) {
    for (const field of ['id','name','category','color','shape','shapeName','pattern','material','series','thumbnail','canvas','sourceType','author','license','processing']) {
      assert.ok(item[field], `${item.id || 'unknown'} 缺少 ${field}`)
    }
  }
})

test('每项画布素材都能从项目静态目录读取', async () => {
  await Promise.all(catalog.map((item) => access(new URL(`../public${item.canvas}`, import.meta.url))))
})

test('两套地域灵感系列都有实际素材和可编辑小样', () => {
  for (const series of ['南通蓝印花布灵感','韩国 Jogakbo 灵感']) {
    const members = catalog.filter((item) => item.series === series)
    assert.ok(members.length >= 5, `${series} 素材不足`)
    assert.ok(members.some((item) => item.category === 'inspiration'), `${series} 缺少小样`)
  }
})

test('40 张 CC0 基础纹理均有来源、哈希与本地原图', async () => {
  assert.equal(sources.sources.length, 40)
  assert.equal(sources.sources.filter((item) => item.provider === 'Poly Haven').length, 24)
  assert.equal(sources.sources.filter((item) => item.provider === 'ambientCG').length, 16)
  assert.equal(new Set(sources.sources.map((item) => item.md5)).size, 40)
  for (const source of sources.sources) {
    assert.equal(source.license, 'CC0 1.0')
    assert.match(source.originalPage, /^https:\/\//)
    assert.match(source.licenseUrl, /^https:\/\//)
    await access(new URL(`../${source.localFile}`, import.meta.url))
  }
})

test('加工布片覆盖目标颜色、形状、材质和透明格式', () => {
  const fabrics=catalog.filter((item) => item.category === 'fabric')
  for (const value of ['米白','灰棕','红粉','黄橙','绿色','蓝紫','黑色','多色']) assert.ok(fabrics.some((item)=>item.color===value),`缺少颜色 ${value}`)
  for (const value of ['方块','三角','椭圆','条带','弧形','花瓣','叶片','波浪边','不规则']) assert.ok(fabrics.some((item)=>item.shapeName===value),`缺少形状 ${value}`)
  for (const value of ['棉布','亚麻','牛仔','毛呢','缎面','纱类']) assert.ok(fabrics.some((item)=>item.material.includes(value)),`缺少材质 ${value}`)
  const processed=fabrics.filter((item)=>item.sourceType==='开放纹理加工')
  assert.equal(processed.length,120)
  assert.ok(processed.every((item)=>item.transparent&&item.canvas.endsWith('.webp')&&item.thumbnail.endsWith('.webp')))
})
