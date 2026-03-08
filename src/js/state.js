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

export const META_FIELD_IDS = [
  'fieldTitle', 'fieldPrompt', 'fieldNegative', 'fieldSteps', 'fieldCfg',
  'fieldSeed', 'fieldNoise', 'fieldSoftware', 'fieldSource', 'fieldComment', 'fieldNSamples'
];

export const EXIF_FIELD_IDS = [
  'exifMake', 'exifModel', 'exifSoftware', 'exifDateTime', 'exifExposure',
  'exifFNumber', 'exifISO', 'exifFocal', 'exifUserComment', 'exifLat', 'exifLong', 'exifAlt'
];

export const EXIF_UNICODE_HEADER = [85, 78, 73, 67, 79, 68, 69, 0];
