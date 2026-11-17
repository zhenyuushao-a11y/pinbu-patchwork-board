# 工艺资料与视觉关系

## 2026-11-13 私人审美素材包

用户提供了 13 张拼布与布艺参考截图，用于明确新版的审美方向：旧棉布和亚麻、小花与格纹、可见刺绣和修补、自然毛边、低饱和底色，以及少量砖红、靛蓝、苔绿和赭金焦点色。截图中的作品和社交媒体界面没有原样进入素材库。

在此基础上生成 4 张原创素材表，分离为 48 种基础布纹，并批量加工为 432 件透明 WebP。四个系列为“旧布花园”“乡居格纹”“暮色植物”“靛蓝与薄绡”。逐项记录见 `assets/private-source/manifest.json`，加工脚本为 `scripts/build-private-fabric-pack.py`。

本批按用户选择的“私人本地学习素材包”管理，暂不更新当前公开站点。未来若决定重新公开或开源，需要重新确认素材范围、生成内容条款和项目级许可说明。

## 实际入库的开放纹理

2026-11-12 通过官方 API 和原始下载地址取得 40 张基础纹理：

- **Poly Haven：24 张。** 包括棉布、亚麻、牛仔、毛呢、绒面、灯芯绒、乔其纱与缎面等。Poly Haven 说明其资产为创作者直接提交或由工作人员制作，全部采用 CC0，允许修改、再分发和用于商业作品。许可：https://polyhaven.com/license
- **ambientCG：16 张。** 选择不同色相的平整 Fabric Color 贴图。ambientCG 明确说明可下载资产及材质预览均采用 CC0，可复制、修改和随项目分发原文件。许可：https://docs.ambientcg.com/license/

每个来源的原始条目、作者、许可链接、下载地址、本地文件、MD5 和加工方式见 `assets/sources/source-manifest.json`。原始图保存在 `assets/sources/base/`，不是外链缩略图。每张纹理裁为三种不同轮廓，共生成 120 件透明 WebP；成品见 `public/assets/fabrics/`，缩略图见 `public/assets/thumbs/`。

本批未采用来源不清、只允许网页浏览、或未明确允许加工和再分发的搜索结果。中文与英文搜索用于发现候选和补足检索词，最终只入库两个条款清晰、文件可追溯的 CC0 官方资源库。

## 南通蓝印花布灵感

南通蓝印花布以棉布、靛蓝和防染印花见长。史密森尼民俗与文化遗产中心的文章介绍了以纸版施加豆粉与石灰调成的防染浆，再反复浸染、氧化形成蓝白纹样的过程。本站没有下载或复制该页图片，而是以原创 SVG 表现蓝白花叶、团花、菱纹和窄边条，标注为“南通蓝印花布灵感”。

- 资料：Smithsonian Center for Folklife and Cultural Heritage, “Family Memories Woven into the Blue Calico Cloth of Nantong, China”
- 链接：https://folklife.si.edu/magazine/blue-calico-cloth-nantong-china
- 本站关系：工艺研究与视觉特征参考；网页图像不入库、不再分发。

## 韩国 Jogakbo 灵感

Jogakbo 是把剩余布片缝成包袱布（bojagi）的拼布方式，常以棉、丝、苎麻、麻或纸构成。V&A 的介绍指出，`gekki` 三重缝合会形成平整封闭的接缝和近似窗格的观感，布片常以不规则、即兴方式扩展。本站以原创半透明矩形、细接缝和抽象拼接小样表现这些视觉特征。

- 资料：Victoria and Albert Museum, “Jogakbo – traditional Korean patchwork”
- 链接：https://www.vam.ac.uk/articles/jogakbo-traditional-korean-patchwork
- 本站关系：工艺研究与视觉特征参考；V&A 馆藏图像不入库、不再分发。

## 开放馆藏判断原则

The Met 的 Open Access 页面说明：只有明确带 Open Access 标识的公共领域作品图像才可按 CC0 不受限使用；是否能浏览不等于可以下载并随开源项目再分发。本站首版未使用 The Met 图像。未来若加入，必须按具体藏品页逐项保存权利状态、来源与加工记录。

- 资料：https://www.metmuseum.org/policies/frequently-asked-questions-image-and-data-resources

## 视觉参考截图

用户提供的“小红书粉色百合”截图仅用于观察米色织物底、花瓣叠压、格纹、毛边、针脚和珠子的视觉语言。截图和其中作品未复制进仓库，也未作为可导出的内置素材。
