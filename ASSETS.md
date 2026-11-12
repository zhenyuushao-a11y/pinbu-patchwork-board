# 内置素材与许可

网站代码使用 MIT License。素材许可按来源分别管理：

- `public/assets/items/`：原创 SVG 零件与基础布片，**CC BY 4.0**，署名建议为“拼布项目贡献者”。
- `assets/sources/base/`：24 张 Poly Haven、16 张 ambientCG 基础纹理，均为 **CC0 1.0**。
- `public/assets/fabrics/` 与 `public/assets/thumbs/`：由上述 CC0 纹理裁切加工的 120 件透明 WebP，沿用 CC0。
- 用户导入照片：只属于用户，不适用仓库许可。

字体使用访客设备的系统中文字体，不随项目分发。

`public/assets/catalog.json` 为完整机器可读目录，逐项记录稳定 ID、名称、分类、颜色、形状、材质、纹样、系列、来源 ID、作者、许可、图片路径、尺寸、标签与加工记录。`assets/sources/source-manifest.json` 记录基础原图的页面、下载地址、MD5、查验日期和许可链接。

## 当前统计

- 157 件目录素材
- 140 件可拼布片：120 件透明 WebP + 20 件原创 SVG
- 40 张不同基础纹理：Poly Haven 24，ambientCG 16
- 9 种轮廓：方块、三角、椭圆、条带、弧形、花瓣、叶片、波浪边、不规则
- 颜色覆盖：米白、灰棕、红粉、黄橙、绿色、蓝紫、黑色、多色
- 材质覆盖：棉布、亚麻、牛仔、毛呢、缎面、纱类、针织、毛绒、灯芯绒、弹力织物等
- 10 件独立零件、3 款相框、4 件灵感小样

`public/assets/fabric-overview.webp` 在每个单元内同时使用浅色和深色背景，用于检查透明边缘、白边和轮廓辨识度。

## 加入新素材

1. 将来源原图放入 `assets/sources/base/`，或将原创透明底 SVG/PNG 放入 `public/assets/items/`；避免烘焙方向性阴影。
2. 在 `assets/sources/source-manifest.json` 登记来源、下载地址、作者、许可、条款链接、查验日期、哈希和加工说明。
3. 如素材不是原创，填写真实 `sourceUrl`、作者、精确许可与署名要求，并确认许可允许随源码再分发和加工。
4. 执行 `pnpm process:textures` 后在素材抽屉和总览中检查缩略图、透明边缘、重复性及放大清晰度。

用户导入的照片只保存在用户浏览器的 IndexedDB 和主动下载的项目文件中，不会上传到服务器，也不适用本仓库许可。
