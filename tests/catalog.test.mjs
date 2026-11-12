import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'

const catalog = JSON.parse(await readFile(new URL('../public/assets/catalog.json', import.meta.url), 'utf8'))

test('内置素材目录完整且 ID 唯一', () => {
  assert.ok(catalog.length >= 34)
  assert.equal(new Set(catalog.map((item) => item.id)).size, catalog.length)
  for (const item of catalog) {
    for (const field of ['id','name','category','color','pattern','material','series','thumbnail','canvas','sourceType','author','license','processing']) {
      assert.ok(item[field], `${item.id || 'unknown'} 缺少 ${field}`)
    }
    assert.equal(item.sourceType, '原创绘制')
    assert.equal(item.license, 'CC BY 4.0')
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
