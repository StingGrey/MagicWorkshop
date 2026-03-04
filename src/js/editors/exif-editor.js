/* EXIF editor logic */
import { state } from '../state.js';
import { getT } from '../i18n.js';
import { showToast, downloadBlob, degToDmsRational, parseRational } from '../utils.js';
import { piexif } from '../parsers/jpeg.js';

export function saveExif() {
  if (state.fileFormat !== 'jpeg') { showToast("Only JPEG supports EXIF", "normal"); return; }

  const reader = new FileReader();
  reader.onload = function (e) {
    const binStr = e.target.result;
    try {
      let piexifObj = piexif.load(binStr);
      piexifObj["0th"] = piexifObj["0th"] || {};
      piexifObj["Exif"] = piexifObj["Exif"] || {};
      piexifObj["GPS"] = piexifObj["GPS"] || {};
      const set = (l, t, v) => { if (v) l[t] = v; else delete l[t]; };

      set(piexifObj["0th"], piexif.ImageIFD.Make, document.getElementById('exifMake').value);
      set(piexifObj["0th"], piexif.ImageIFD.Model, document.getElementById('exifModel').value);
      set(piexifObj["0th"], piexif.ImageIFD.Software, document.getElementById('exifSoftware').value);
      set(piexifObj["0th"], piexif.ImageIFD.DateTime, document.getElementById('exifDateTime').value);

      const exposure = parseRational(document.getElementById('exifExposure').value, 1000000);
      if (exposure) piexifObj["Exif"][piexif.ExifIFD.ExposureTime] = exposure; else delete piexifObj["Exif"][piexif.ExifIFD.ExposureTime];
      const fnumVal = parseFloat(document.getElementById('exifFNumber').value);
      if (!isNaN(fnumVal)) piexifObj["Exif"][piexif.ExifIFD.FNumber] = [Math.round(fnumVal * 10), 10]; else delete piexifObj["Exif"][piexif.ExifIFD.FNumber];
      const isoVal = parseInt(document.getElementById('exifISO').value, 10);
      if (!isNaN(isoVal)) piexifObj["Exif"][piexif.ExifIFD.ISOSpeedRatings] = isoVal; else delete piexifObj["Exif"][piexif.ExifIFD.ISOSpeedRatings];
      const focalVal = parseFloat(document.getElementById('exifFocal').value);
      if (!isNaN(focalVal)) piexifObj["Exif"][piexif.ExifIFD.FocalLength] = [Math.round(focalVal * 10), 10]; else delete piexifObj["Exif"][piexif.ExifIFD.FocalLength];
      const uc = document.getElementById('exifUserComment').value;
      if (uc) {
        piexifObj["Exif"][piexif.ExifIFD.UserComment] = [85, 78, 73, 67, 79, 68, 69, 0, ...uc.split('').map(c => c.charCodeAt(0))];
      } else {
        delete piexifObj["Exif"][piexif.ExifIFD.UserComment];
      }

      const lat = parseFloat(document.getElementById('exifLat').value);
      const lon = parseFloat(document.getElementById('exifLong').value);
      if (!isNaN(lat) && !isNaN(lon)) {
        piexifObj["GPS"][piexif.GPSIFD.GPSLatitudeRef] = lat >= 0 ? "N" : "S";
        piexifObj["GPS"][piexif.GPSIFD.GPSLatitude] = degToDmsRational(lat);
        piexifObj["GPS"][piexif.GPSIFD.GPSLongitudeRef] = lon >= 0 ? "E" : "W";
        piexifObj["GPS"][piexif.GPSIFD.GPSLongitude] = degToDmsRational(lon);
      } else {
        delete piexifObj["GPS"][piexif.GPSIFD.GPSLatitude];
        delete piexifObj["GPS"][piexif.GPSIFD.GPSLongitude];
      }
      const altVal = parseFloat(document.getElementById('exifAlt').value);
      if (!isNaN(altVal)) {
        piexifObj["GPS"][piexif.GPSIFD.GPSAltitudeRef] = altVal >= 0 ? 0 : 1;
        piexifObj["GPS"][piexif.GPSIFD.GPSAltitude] = [Math.abs(Math.round(altVal * 100)), 100];
      } else {
        delete piexifObj["GPS"][piexif.GPSIFD.GPSAltitude];
      }

      const newBytes = piexif.dump(piexifObj);
      const newBin = piexif.insert(newBytes, binStr);
      const arr = new Uint8Array(newBin.length);
      for (let i = 0; i < newBin.length; i++) arr[i] = newBin.charCodeAt(i);
      downloadBlob(new Blob([arr], { type: "image/jpeg" }), "exif_edited.jpg");
      showToast(getT('toastExifSaved'), 'success');
    } catch (err) { console.error(err); showToast("JPEG Error", "error"); }
  };
  reader.readAsBinaryString(new Blob([state.fileBuffer]));
}

export function clearExif() {
  if (state.fileFormat !== 'jpeg') { showToast("Only JPEG supports EXIF", "normal"); return; }
  ['exifMake', 'exifModel', 'exifSoftware', 'exifDateTime', 'exifExposure', 'exifFNumber', 'exifISO', 'exifFocal', 'exifUserComment', 'exifLat', 'exifLong', 'exifAlt'].forEach(id => document.getElementById(id).value = '');
  const reader = new FileReader();
  reader.onload = function (e) {
    const binStr = e.target.result;
    try {
      const emptyExif = { "0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "thumbnail": null };
      const newBytes = piexif.dump(emptyExif);
      const newBin = piexif.insert(newBytes, binStr);
      const arr = new Uint8Array(newBin.length);
      for (let i = 0; i < newBin.length; i++) arr[i] = newBin.charCodeAt(i);
      downloadBlob(new Blob([arr], { type: "image/jpeg" }), "exif_clean.jpg");
      showToast(getT('toastCleaned'), "success");
    } catch (err) { console.error(err); showToast("JPEG Error", "error"); }
  };
  reader.readAsBinaryString(new Blob([state.fileBuffer]));
}

export function applyDateFromPicker(picker, fieldId) {
  if (!picker.value) return;
  const d = new Date(picker.value);
  const exifDate = `${d.getFullYear()}:${String(d.getMonth() + 1).padStart(2, '0')}:${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
  document.getElementById(fieldId).value = exifDate;
  showToast('✅ 已应用', 'success');
}
