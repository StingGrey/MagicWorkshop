# Magic Workshop 魔法工坊 V2.0

> 全客户端 AI 图片元数据编辑器 — 你的图片，你做主。

纯浏览器运行，无需服务器，所有处理都在本地完成。支持查看、编辑和清除 AI 生成图片中的元数据信息。

## 功能一览

### ✨ 元数据修改

编辑 AI 生成图片中的各种参数信息：

- **提示词**：正面 / 负面提示词编辑
- **角色标签（NAI 格式）**：多角色管理，支持坐标和正负权重切换
- **生成参数**：Steps、CFG、Seed、Sampler、Software 等
- **原始 JSON**：查看完整元数据树，支持手动编辑
- **一键清空**：清除 AI 数据或全部元数据

支持格式：SD WebUI / NovelAI / ComfyUI

### 📋 法术解析

只读信息面板，完整展示图片内部数据：

- 文件基本信息（格式、尺寸、大小）
- AI 生成参数解析
- 完整原始参数
- EXIF 数据
- 一键复制所有信息

基于 [stable-diffusion-inspector](https://github.com/Akegarasu/stable-diffusion-inspector) by @秋葉aaaki

### 📷 EXIF 修改

JPEG 图片的 EXIF 元数据编辑（26 个字段）：

- GPS 地理位置（经纬度、海拔）
- 相机 / 镜头信息
- 拍摄时间（带日期选择器）
- 曝光参数（光圈、ISO、快门等）
- 图像设置（白平衡、色彩空间、锐度等）
- 作者与版权信息

### 🔒 像素混淆

基于 Gilbert 曲线的像素空间打乱加密：

- 加密 / 解密像素排列
- 可选密码保护
- 自动处理模式（上传即加密或解密）
- 解混淆历史记录
- 保存结果图片（保留原始元数据）

## 支持格式

| 格式 | 元数据编辑 | EXIF 编辑 | 像素混淆 |
|------|:---------:|:---------:|:--------:|
| PNG  | &#10003;  |           | &#10003; |
| JPEG | &#10003;  | &#10003;  | &#10003; |
| WebP | 预览      |           |          |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 技术栈

- **Vite** — 构建工具
- **piexifjs** — JPEG EXIF 读写
- **ExifReader** — EXIF 数据解析
- **pako** — PNG zTXt 解压

纯 ES Modules，无框架依赖。

## 其他特性

- 中文 / English 双语切换
- Light / Dark 主题
- 动态渐变 Orb 背景动画
- iOS 风格分段控制器 Tab 栏
- Scale + Blur 内容切换动画
- GitHub Pages 自动部署
- 完全客户端处理，隐私安全

## 部署

推送到 `main` 分支后，GitHub Actions 自动构建并部署到 GitHub Pages。

## License

MIT
