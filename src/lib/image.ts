// 封面图片处理：用户从相册选图 → 等比压缩到最长边 800px、转 JPEG（约几十 KB），
// 只存本机 IndexedDB；备份导出时转 base64 随 JSON 走，导入时再转回来。

const MAX_EDGE = 800;
const QUALITY = 0.82;

/** 把用户选择的图片文件压缩为 JPEG Blob。失败时抛错，由界面提示。 */
export async function processCover(file: File): Promise<Blob> {
  return processCoverBlob(file);
}

/** 把任意图片 Blob（相册文件或联网下载的海报）压缩为 JPEG Blob（v0.5.0 起联网封面共用）。 */
export async function processCoverBlob(blob: Blob): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('这张图片读不出来，换一张试试'));
      el.src = url;
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('当前浏览器不支持图片处理');
    ctx.fillStyle = '#f7f2e9';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
    if (!blob) throw new Error('图片压缩失败，换一张试试');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Blob → data URL（base64）。分块编码，避免大图爆栈。 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) {
    binary += String.fromCharCode(...buf.subarray(i, i + CHUNK));
  }
  return `data:${blob.type || 'image/jpeg'};base64,${btoa(binary)}`;
}

/** data URL → Blob（导入恢复时用）。格式不对返回 null。 */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!m) return null;
  const mime = m[1] || 'application/octet-stream';
  try {
    if (m[2]) {
      const binary = atob(m[3]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    }
    return new Blob([decodeURIComponent(m[3])], { type: mime });
  } catch {
    return null;
  }
}
