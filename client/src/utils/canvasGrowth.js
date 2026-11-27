const rgbToHsv = (r, g, b) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = 60 * (((gn - bn) / delta) % 6);
    } else if (max === gn) {
      h = 60 * ((bn - rn) / delta + 2);
    } else {
      h = 60 * ((rn - gn) / delta + 4);
    }
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;
  return { h, s, v };
};

const isFoliageGreenPixel = (r, g, b, a) => {
  if (a < 128) return false;
  const { h, s, v } = rgbToHsv(r, g, b);
  const inGreenHue = h >= 62 && h <= 168;
  const hasColorfulness = s >= 0.15 && v >= 0.14;
  const greenDominant = g >= r * 1.02 && g >= b * 1.02;
  return inGreenHue && hasColorfulness && greenDominant;
};

const loadImageElement = (fileOrUrl) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let objectUrl = null;
    if (fileOrUrl instanceof Blob) {
      objectUrl = URL.createObjectURL(fileOrUrl);
    }

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to load selected plant image onto canvas.'));
    };

    img.src = objectUrl || fileOrUrl;
  });

export const analyzePlantCanopy = async (
  fileOrUrl,
  { canvas = null, highlightFoliage = true, maxDimension = 360 } = {}
) => {
  const img = await loadImageElement(fileOrUrl);

  const scale = Math.min(1, maxDimension / Math.max(img.width || 1, img.height || 1));
  const width = Math.max(1, Math.round((img.width || 300) * scale));
  const height = Math.max(1, Math.round((img.height || 300) * scale));

  const targetCanvas = canvas || document.createElement('canvas');
  targetCanvas.width = width;
  targetCanvas.height = height;

  const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;
  const totalPixels = width * height;
  let greenPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (isFoliageGreenPixel(r, g, b, a)) {
      greenPixels += 1;
      if (highlightFoliage) {
        data[i] = Math.min(255, Math.round(r * 0.55));
        data[i + 1] = Math.min(255, Math.round(g * 1.15 + 35));
        data[i + 2] = Math.min(255, Math.round(b * 0.65));
      }
    }
  }

  if (highlightFoliage) {
    ctx.putImageData(imageData, 0, 0);
  }

  const canopyCoveragePct = Number(((greenPixels / Math.max(1, totalPixels)) * 100).toFixed(2));
  const previewDataUrl = targetCanvas.toDataURL('image/png');

  return {
    greenPixels,
    totalPixels,
    canopyCoveragePct,
    width,
    height,
    previewDataUrl
  };
};

export default analyzePlantCanopy;
