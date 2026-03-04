/* Global application state */
export const state = {
  curLang: 'zh-CN',
  currentFile: null,
  fileBuffer: null,
  fileFormat: '',
  metaObj: {},
  isSD: false,
  isComfy: false,
  originalSegments: [],
  isObfuscated: false,
  pngCommentObj: null,
  originalData: {},
  actualData: {},
  hasActual: false,
  isShowingActual: false,
  // Info panel state
  infoItems: [],
  infoExifItems: [],
  infoJsonData: null,
  infoMetaType: 'UNKNOWN',
};

export const MAGIC = 'PWD';

export const sdFields = [
  "Steps", "Sampler", "Schedule type", "CFG scale", "Seed", "Size",
  "Model hash", "Model", "Denoising strength", "RNG",
  "SD upscale overlap", "SD upscale upscaler", "Version", "Module 1"
];

export const OBF_HISTORY_KEY = 'magic_obf_history';
