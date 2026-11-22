import { toJpeg, toPng } from 'html-to-image';

/**
 * Save each sheet as a picture.
 *
 * Print gives a PDF, which is right for the photocopier, but a teacher
 * sharing a syllabus on WhatsApp or pasting it into a message needs an
 * image. Each page comes out as its own file at print resolution.
 *
 * The capture is of the live DOM, so the editing chrome -- guides, handles,
 * selection outlines, hover tints -- has to go first. `body.exporting`
 * turns off exactly what `@media print` turns off, then it goes back.
 */

/** 2 is ~190dpi for A4, which prints cleanly and still mails. */
export const DEFAULT_SCALE = 2;

export async function exportSheets({
  format = 'jpeg',
  scale = DEFAULT_SCALE,
  name = 'sheet',
  onProgress,
} = {}) {
  const sheets = [...document.querySelectorAll('.print-root .sheet')];
  if (!sheets.length) throw new Error('Nothing to save yet.');

  document.body.classList.add('exporting');
  // Let the style change paint before anything is measured.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    const draw = format === 'png' ? toPng : toJpeg;
    for (let i = 0; i < sheets.length; i += 1) {
      onProgress?.(i + 1, sheets.length);
      const url = await draw(sheets[i], {
        pixelRatio: scale,
        quality: 0.95,
        // JPEG has no transparency; without this the paper comes out black.
        backgroundColor: '#ffffff',
        // Fonts and pictures are same-origin, but a stale cached copy
        // without CORS headers would taint the canvas.
        cacheBust: true,
      });
      save(url, sheets.length === 1
        ? `${name}.${ext(format)}`
        : `${name}-page-${i + 1}.${ext(format)}`);
      // Browsers drop downloads fired in the same tick as each other.
      if (i < sheets.length - 1) await new Promise((r) => setTimeout(r, 350));
    }
  } finally {
    document.body.classList.remove('exporting');
  }
}

const ext = (f) => (f === 'png' ? 'png' : 'jpg');

function save(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
