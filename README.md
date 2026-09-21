# Agemonia 中文指南

《阿格莫尼亚》非官方中文桌边规则参考。包含英雄、职业技能、专精、道具、状态与原书页码。

## 发布

GitHub Pages：Settings → Pages → Deploy from a branch → main → / (root)。
无需构建步骤，直接发布仓库根目录。

## 本地查看

运行 `python3 -m http.server 8000`，打开 `http://localhost:8000`。

## 内容与使用

- 图片、字体和脚本均为本站静态资源；大图延迟加载，重复图片复用。
- 搜索、收藏在浏览器本地运行；收藏不跨设备同步。
- 禁用脚本时仍可使用分类目录、条目链接与原页图。
- 页码使用书内页码；整理内容以原书为准，缺项和原书冲突在“待核对”中标注。
- 本站为玩家整理，非官方产品。Agemonia 名称、美术及规则原页等原始素材权利归各自权利人所有，未因本仓库公开而重新授权。
- 内嵌字体使用 Noto Sans SC，SIL Open Font License 文本见 `FONT-LICENSE.txt`。

## 维护

`index.html` 保存分栏内容与原页引用，`assets/guide.js` 包含搜索索引及交互，`assets/guide.css` 保存样式。修改内容后同步更新搜索索引。
