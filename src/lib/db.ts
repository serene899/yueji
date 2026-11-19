import Dexie, { type Table } from 'dexie';
import type { Entry, Work } from './types';

// 本地数据库：数据只存在这台设备的浏览器里（IndexedDB），没有服务器。
// v0.1.0 只有一张版本定义；以后加字段走「可选加键」，不升版本、不动旧数据（与生息同规矩）。
export class YuejiDB extends Dexie {
  works!: Table<Work, string>;
  entries!: Table<Entry, string>;

  constructor() {
    super('yueji-db');
    this.version(1).stores({
      works: 'id, type, status, finishDate, updatedAt',
      entries: 'id, workId, date',
    });
  }
}

export const db = new YuejiDB();

export async function putWork(w: Work): Promise<void> {
  await db.works.put({ ...w, updatedAt: Date.now() });
}

export async function deleteWork(id: string): Promise<void> {
  await db.transaction('rw', db.works, db.entries, async () => {
    await db.works.delete(id);
    await db.entries.where('workId').equals(id).delete();
  });
}

export async function putEntry(e: Entry): Promise<void> {
  await db.entries.put({ ...e, updatedAt: Date.now() });
}

export async function deleteEntry(id: string): Promise<void> {
  await db.entries.delete(id);
}

/** 导出/导入用：读出全部数据 */
export async function readAll(): Promise<{ works: Work[]; entries: Entry[] }> {
  const [works, entries] = await Promise.all([db.works.toArray(), db.entries.toArray()]);
  return { works, entries };
}

/** 导入恢复：整库替换（调用前已在界面上向用户确认） */
export async function replaceAll(works: Work[], entries: Entry[]): Promise<void> {
  await db.transaction('rw', db.works, db.entries, async () => {
    await db.works.clear();
    await db.entries.clear();
    await db.works.bulkPut(works);
    await db.entries.bulkPut(entries);
  });
}
