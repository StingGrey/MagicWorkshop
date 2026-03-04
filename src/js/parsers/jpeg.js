/* JPEG EXIF parsing and writing */
import piexif from 'piexifjs';
import { setFieldVal, dmsRationalToDeg } from '../utils.js';

export { piexif };

export function JPEG_SD_UserComment_V2(ex) {
  if (!ex || !ex["Exif"]) return null;
  const uc = ex["Exif"][piexif.ExifIFD.UserComment];
  if (!uc) return null;
  let str = "";
  if (Array.isArray(uc)) {
    let start = 0;
    if (uc.length >= 8 && uc.slice(0, 8).map(c => String.fromCharCode(c)).join("").match(/^(UNICODE|ASCII)/)) start = 8;
    str = uc.slice(start).filter(c => c !== 0).map(c => String.fromCharCode(c)).join("");
  } else if (typeof uc === 'string') {
    str = uc.replace(/^(UNICODE|ASCII)\0+/, '');
  }
  str = str.replace(/\0/g, '').trim();
  if (!str) return null;
  try {
    const j = JSON.parse(str);
    if (j && typeof j === 'object') return { obj: j, raw: j };
  } catch (e) { }
  if (str.includes("Steps:") || (str.toLowerCase().includes("prompt") && str.toLowerCase().includes("negative"))) return str;
  return null;
}

export function decodeExifUserComment(uc) {
  if (!uc) return "";
  let str = "";
  if (Array.isArray(uc)) {
    let start = 0;
    if (uc.length >= 8 && uc.slice(0, 8).map(c => String.fromCharCode(c)).join("").match(/^(UNICODE|ASCII)/)) start = 8;
    str = uc.slice(start).filter(c => c !== 0).map(c => String.fromCharCode(c)).join("");
  } else if (typeof uc === 'string') {
    str = uc.replace(/^(UNICODE|ASCII)\0+/, '');
  }
  return str.replace(/\0/g, '').trim();
}

export function loadJpegExifData(piexifObj) {
  try {
    const th = piexifObj["0th"] || {};
    const xif = piexifObj["Exif"] || {};
    const gps = piexifObj["GPS"] || {};
    setFieldVal('exifMake', th[piexif.ImageIFD.Make] || "");
    setFieldVal('exifModel', th[piexif.ImageIFD.Model] || "");
    setFieldVal('exifSoftware', th[piexif.ImageIFD.Software] || "");
    setFieldVal('exifDateTime', th[piexif.ImageIFD.DateTime] || "");
    if (xif[piexif.ExifIFD.ExposureTime]) setFieldVal('exifExposure', xif[piexif.ExifIFD.ExposureTime][0] + '/' + xif[piexif.ExifIFD.ExposureTime][1]);
    if (xif[piexif.ExifIFD.FNumber]) setFieldVal('exifFNumber', (xif[piexif.ExifIFD.FNumber][0] / xif[piexif.ExifIFD.FNumber][1]).toFixed(1));
    if (xif[piexif.ExifIFD.FocalLength]) setFieldVal('exifFocal', (xif[piexif.ExifIFD.FocalLength][0] / xif[piexif.ExifIFD.FocalLength][1]).toFixed(1));
    if (xif[piexif.ExifIFD.ISOSpeedRatings]) setFieldVal('exifISO', xif[piexif.ExifIFD.ISOSpeedRatings]);
    if (xif[piexif.ExifIFD.UserComment]) setFieldVal('exifUserComment', decodeExifUserComment(xif[piexif.ExifIFD.UserComment]));
    if (gps[piexif.GPSIFD.GPSLatitude]) setFieldVal('exifLat', dmsRationalToDeg(gps[piexif.GPSIFD.GPSLatitude], gps[piexif.GPSIFD.GPSLatitudeRef]).toFixed(6));
    if (gps[piexif.GPSIFD.GPSLongitude]) setFieldVal('exifLong', dmsRationalToDeg(gps[piexif.GPSIFD.GPSLongitude], gps[piexif.GPSIFD.GPSLongitudeRef]).toFixed(6));
    if (gps[piexif.GPSIFD.GPSAltitude]) setFieldVal('exifAlt', (gps[piexif.GPSIFD.GPSAltitude][0] / gps[piexif.GPSIFD.GPSAltitude][1]).toFixed(1));
  } catch (e) {
    console.error(e);
  }
}
