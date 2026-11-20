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
  await syncWorkStatus(e.workId);
}

export async function deleteEntry(id: string): Promise<void> {
  const e = await db.entries.get(id);
  await db.entries.delete(id);
  if (e) await syncWorkStatus(e.workId);
}

/**
 * 状态联动（v0.4.0 重做）：记录增删改后，按「当前全部记录」重新推导作品状态。
 * 规则：
 * - 用户手动锁定的状态（statusLocked）或暂停/搁置，永不自动改动；
 * - 没有记录 → 回到计划中，并清掉自动产生的完成日期；
 * - 书/剧：记录达到总页数/总集数 → 完成（完成日期取首次达标的那条记录日期）；
 *   有记录但没达标 → 进行中（完成日期清除）；若一条带页码/集数的记录都没有，
 *   则无从判断，不动已完成状态（例如只记感受就读完的书）；
 * - 电影：有记录即视为看完，完成日期取最早一条记录；
 * - 其他：有记录 → 进行中；已手动标完成的保持完成（表单保存时会锁定）。
 * 进度本身不存字段，永远由记录现算（见 stats），所以删记录后进度自动回退。
 */
export async function syncWorkStatus(workId: string): Promise<void> {
  const work = await db.works.get(workId);
  if (!work || work.statusLocked) return;
  if (work.status === 'paused' || work.status === 'dropped') return;

  const entries = (await db.entries.where('workId').equals(workId).toArray()).sort((a, b) =>
    a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1,
  );

  let status = work.status;
  let startDate = work.startDate;
  let finishDate = work.finishDate;

  if (entries.length === 0) {
    status = 'planned';
    finishDate = undefined;
  } else {
    const first = entries[0];
    if (work.type === 'movie') {
      status = 'done';
      startDate = startDate ?? first.date;
      finishDate = first.date;
    } else if (work.type === 'other') {
      if (status !== 'done') {
        status = 'doing';
        startDate = startDate ?? first.date;
        finishDate = undefined;
      }
    } else {
      // book / tv：按页码或集数推导
      const total = work.type === 'book' ? work.totalPages : work.totalEpisodes;
      const val = (e: Entry) => (work.type === 'book' ? e.page : e.episode) ?? 0;
      const hasProgressData = entries.some((e) => val(e) > 0);
      let reachedDate: string | undefined;
      if (total) {
        let max = 0;
        for (const e of entries) {
          max = Math.max(max, val(e));
          if (max >= total) {
            reachedDate = e.date;
            break;
          }
        }
      }
      if (reachedDate) {
        status = 'done';
        startDate = startDate ?? first.date;
        finishDate = reachedDate;
      } else if (hasProgressData || status !== 'done') {
        status = 'doing';
        startDate = startDate ?? first.date;
        finishDate = undefined;
      }
      // 已完成且没有任何页码/集数可判断 → 保持完成不动
    }
  }

  if (status !== work.status || startDate !== work.startDate || finishDate !== work.finishDate) {
    await db.works.put({ ...work, status, startDate, finishDate, updatedAt: Date.now() });
  }
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
