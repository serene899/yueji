import type { Entry, Work } from './types';
import { readAll, replaceAll } from './db';
import { blobToDataUrl, dataUrlToBlob } from './image';

// 备份文件格式：{ app:'yueji', schemaVersion, exportedAt, works, entries }
// v1（0.1.0）：无封面。v2（0.2.0）：作品可带 coverData（封面图的 base64 data URL）。
// 导入兼容 v1 与 v2；导入时先完整校验，校验不过什么都不动；通过后整库替换（界面上有二次确认）。

/** 备份文件里的作品：封面 Blob 转成 coverData 字符串存放 */
export type BackupWork = Omit<Work, 'cover'> & { coverData?: string };

export interface YuejiBackup {
  app: 'yueji';
  schemaVersion: 1 | 2;
  exportedAt: string;
  works: BackupWork[];
  entries: Entry[];
}

export async function buildBackup(works: Work[], entries: Entry[]): Promise<YuejiBackup> {
  const out: BackupWork[] = [];
  for (const w of works) {
    const { cover, ...rest } = w;
    out.push(cover ? { ...rest, coverData: await blobToDataUrl(cover) } : rest);
  }
  return {
    app: 'yueji',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    works: out,
    entries,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function validWork(v: unknown): v is BackupWork {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === 'string' &&
    (v.type === 'book' || v.type === 'movie' || v.type === 'tv' || v.type === 'other') &&
    typeof v.title === 'string' &&
    typeof v.creator === 'string' &&
    typeof v.category === 'string' &&
    (v.status === 'planned' || v.status === 'doing' || v.status === 'done' || v.status === 'paused' || v.status === 'dropped') &&
    (v.subcategory === undefined || typeof v.subcategory === 'string') &&
    (v.statusLocked === undefined || typeof v.statusLocked === 'boolean') &&
    typeof v.highlight === 'boolean' &&
    typeof v.createdAt === 'number' &&
    typeof v.updatedAt === 'number' &&
    (v.coverData === undefined || (typeof v.coverData === 'string' && v.coverData.startsWith('data:image/')))
  );
}

function validEntry(v: unknown): v is Entry {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === 'string' &&
    typeof v.workId === 'string' &&
    typeof v.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.date) &&
    typeof v.feeling === 'string' &&
    typeof v.quote === 'string' &&
    typeof v.createdAt === 'number' &&
    typeof v.updatedAt === 'number'
  );
}

/** 校验一份备份 JSON；返回 {ok:true, data} 或 {ok:false, error}。 */
export function parseBackup(json: unknown): { ok: true; data: YuejiBackup } | { ok: false; error: string } {
  if (!isRecord(json)) return { ok: false, error: '文件不是有效的备份（不是 JSON 对象）' };
  if (json.app !== 'yueji') return { ok: false, error: '这不是阅迹的备份文件' };
  if (json.schemaVersion !== 1 && json.schemaVersion !== 2) {
    return { ok: false, error: `备份版本不受支持：${String(json.schemaVersion)}` };
  }
  if (!Array.isArray(json.works) || !Array.isArray(json.entries)) {
    return { ok: false, error: '备份缺少 works / entries 数据' };
  }
  for (const w of json.works) if (!validWork(w)) return { ok: false, error: '备份里有一条作品数据不完整' };
  for (const e of json.entries) if (!validEntry(e)) return { ok: false, error: '备份里有一条记录数据不完整' };
  const workIds = new Set((json.works as BackupWork[]).map((w) => w.id));
  for (const e of json.entries as Entry[]) {
    if (!workIds.has(e.workId)) return { ok: false, error: '备份里有记录找不到对应的作品' };
  }
  return { ok: true, data: json as unknown as YuejiBackup };
}

/** 备份作品 → 本地作品（coverData 解码回 Blob；解不出来就当没封面，不让整份恢复失败） */
export function backupWorkToWork(w: BackupWork): Work {
  const { coverData, ...rest } = w;
  const cover = coverData ? (dataUrlToBlob(coverData) ?? undefined) : undefined;
  return { ...rest, cover };
}

/** 导出：生成 JSON 文件并触发下载（iPhone 上会走系统分享/存储）。 */
export async function exportBackup(): Promise<string> {
  const { works, entries } = await readAll();
  const backup = await buildBackup(works, entries);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const day = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const name = `yueji-backup-${day}.json`;
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return name;
}

/** 导入：读取文件 → 校验 → 整库替换。返回恢复的条数。 */
export async function importBackup(file: File): Promise<{ works: number; entries: number }> {
  const text = await file.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('文件不是有效的 JSON');
  }
  const parsed = parseBackup(json);
  if (!parsed.ok) throw new Error(parsed.error);
  const works = parsed.data.works.map(backupWorkToWork);
  await replaceAll(works, parsed.data.entries);
  return { works: works.length, entries: parsed.data.entries.length };
}
