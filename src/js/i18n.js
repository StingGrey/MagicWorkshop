import { state } from './state.js';

export const i18n = {
  "zh-CN": {
    appTitle: "魔法工坊",
    cardLeftTitle: "源文件",
    cardLeftSub: "拖放上传",
    dropTitle: "将文件拖到这里",
    dropSub: "PNG / JPG / WebP",
    previewEmpty: "暂无图片",
    cardRightTitle: "工具箱",
    cardRightSub: "选择魔法",
    tabMeta: "✨ 元数据修改",
    tabInfo: "📋 法术解析",
    tabExif: "📷 EXIF修改",
    tabObf: "🔒 混淆",
    fieldTitle: "标题",
    fieldPrompt: "正面提示词",
    charTitle: "角色标签",
    btnAddChar: "＋ 添加角色",
    fieldNegative: "负面提示词",
    phTitle: "给它起个可爱的名字...",
    phPrompt: "masterpiece, best quality, 1girl...",
    phNegative: "lowres, bad anatomy...",
    fieldComment: "备注",
    phComment: "有什么秘密笔记？",
    rawTitle: "📜 查看原始 JSON",
    btnSaveMeta: "✨ 保存数据",
    btnClearMeta: "🧹 清除 AI 数据",
    gpsTitle: "地理位置",
    btnSaveExif: "📸 保存 EXIF",
    btnClearExif: "🛡️ 清除 EXIF",
    btnActualPrompt: "🔮 真实提示词",
    btnNuke: "🧨 清除所有",
    obfDesc: "Gilbert 曲线像素混淆",
    obfPassword: "魔法密码（可选）",
    obfNote: "还原时需要相同密码",
    btnEncrypt: "加密",
    btnDecrypt: "解密",
    btnSaveObf: "💾 保存结果",
    btnReload: "🔄 使用处理结果",
    toastMetaFound: "发现元数据！✨",
    toastNoMeta: "未发现 AI 数据...",
    toastSaved: "保存成功！💖",
    toastExifSaved: "EXIF 更新成功！📸",
    toastCleaned: "清理完毕！🧹",
    toastJPEGFound: "检测到 JPEG 📸",
    toastObfDone: "混淆完成！💫",
    toastRestored: "已还原！✅",
    toastErr: "出错了 ❌",
    charLabel: "角色",
    charTogglePos: "正面",
    charToggleNeg: "负面",
    charRemove: "×",
    charCenter: "中心",
    infoDesc: "📊 完整图片信息",
    infoFileTitle: "📁 文件信息",
    infoGenTitle: "🎨 生成信息",
    infoFullTitle: "📜 完整参数",
    infoExifTitle: "📷 EXIF 数据",
    infoEmpty: "上传图片后显示信息",
    btnCopyAll: "📋 复制所有信息",
    toastCopied: "已复制到剪贴板！📋",
    infoNoData: "😭 无法读取 Metadata",
    exifCamera: "📷 相机信息",
    exifTime: "📅 时间",
    exifExposure: "⚡ 曝光参数",
    exifImgSettings: "🎨 图像设置",
    exifAuthor: "👤 作者信息",
    exifDesc: "📝 描述",
    phShotTime: "拍摄时间",
    phDigitizedTime: "数字化时间",
    phArtist: "摄影师",
    phCopyright: "© 2024",
    phImageDesc: "图片描述",
    obfAutoProcess: "🚀 上传自动处理",
    segOff: "关闭",
    segEnc: "混淆",
    segDec: "解密"
  },
  "en": {
    appTitle: "Magic Workshop",
    cardLeftTitle: "Source",
    cardLeftSub: "DRAG & DROP",
    dropTitle: "Drop File Here",
    dropSub: "PNG / JPG / WebP",
    previewEmpty: "No image selected",
    cardRightTitle: "Toolbox",
    cardRightSub: "SELECT SPELL",
    tabMeta: "✨ Meta",
    tabInfo: "📋 Info",
    tabExif: "📍 GPS",
    tabObf: "🔒 Lock",
    fieldTitle: "Title",
    fieldPrompt: "Positive Prompt",
    charTitle: "Characters",
    btnAddChar: "＋ Add Character",
    fieldNegative: "Negative Prompt",
    phTitle: "Give it a cute name...",
    phPrompt: "masterpiece, best quality, 1girl...",
    phNegative: "lowres, bad anatomy...",
    fieldComment: "Comment",
    phComment: "Any secret notes?",
    rawTitle: "📜 View Raw JSON",
    btnSaveMeta: "✨ Save Data",
    btnClearMeta: "🧹 Clear AI Data",
    gpsTitle: "Geolocation",
    btnSaveExif: "📸 Save EXIF",
    btnClearExif: "🛡️ Clean EXIF",
    btnActualPrompt: "🔮 True Prompt",
    btnNuke: "🧨 Nuke All",
    obfDesc: "Gilbert Curve Scrambling",
    obfPassword: "Secret Password (Optional)",
    obfNote: "Same password needed to restore",
    btnEncrypt: "Scramble",
    btnDecrypt: "Restore",
    btnSaveObf: "💾 Download",
    btnReload: "🔄 Use Result",
    toastMetaFound: "Metadata Found! ✨",
    toastNoMeta: "No AI Data found...",
    toastSaved: "Saved! 💖",
    toastExifSaved: "EXIF Updated! 📸",
    toastCleaned: "All Cleaned! 🧹",
    toastJPEGFound: "JPEG Detected 📸",
    toastObfDone: "Scrambled! 💫",
    toastRestored: "Restored! ✅",
    toastErr: "Error ❌",
    charLabel: "Chara",
    charTogglePos: "Pos",
    charToggleNeg: "Neg",
    charRemove: "x",
    charCenter: "Center",
    infoDesc: "📊 Complete Image Inspector",
    infoFileTitle: "📁 File Info",
    infoGenTitle: "🎨 Generation Info",
    infoFullTitle: "📜 Full Parameters",
    infoExifTitle: "📷 EXIF Data",
    infoEmpty: "Upload an image to view info",
    btnCopyAll: "📋 Copy All Info",
    toastCopied: "Copied to clipboard! 📋",
    infoNoData: "😭 Cannot read Metadata",
    exifCamera: "📷 Camera Info",
    exifTime: "📅 Date Time",
    exifExposure: "⚡ Exposure Settings",
    exifImgSettings: "🎨 Image Settings",
    exifAuthor: "👤 Author Info",
    exifDesc: "📝 Description",
    phShotTime: "Original Shot Time",
    phDigitizedTime: "Digitized Time",
    phArtist: "Photographer",
    phCopyright: "© 2024",
    phImageDesc: "Image Description",
    obfAutoProcess: "🚀 Auto Process on Upload",
    segOff: "Off",
    segEnc: "Scramble",
    segDec: "Restore"
  }
};

export function getT(k) {
  return (i18n[state.curLang] || i18n['en'])[k] || k;
}

export function changeLanguage(val) {
  state.curLang = val;
  updateTexts();
}

export function updateTexts() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = getT(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = getT(el.getAttribute('data-i18n-ph'));
  });
  refreshDynamicUI();
}

export function refreshDynamicUI() {
  document.querySelectorAll('.char-item').forEach(item => {
    const label = item.querySelector('.char-item-header span');
    if (label) label.textContent = getT('charLabel');
    const removeBtn = item.querySelector('.btn-remove-char');
    if (removeBtn) removeBtn.textContent = getT('charRemove');
    const coordLabel = item.querySelector('.char-coords span');
    if (coordLabel) coordLabel.textContent = getT('charCenter');
    const toggleBtn = item.querySelector('.btn-toggle-uc');
    if (toggleBtn) toggleBtn.textContent = toggleBtn.classList.contains('active') ? getT('charTogglePos') : getT('charToggleNeg');
  });
}
