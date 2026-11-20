import { beforeEach, describe, expect, it } from 'vitest';
import { db, deleteEntry, deleteWork, putEntry, putWork, readAll, replaceAll } from '../../src/lib/db';
import type { Entry, Work } from '../../src/lib/types';

const book: Work = {
  id: 'b1', type: 'book', title: '活着', creator: '余华', category: '文学',
  totalPages: 200, status: 'planned', highlight: false, createdAt: 1, updatedAt: 1,
};
const entry: Entry = {
  id: 'e1', workId: 'b1', date: '2026-11-02', page: 50, minutes: 30,
  feeling: '开头很稳', quote: '', createdAt: 1, updatedAt: 1,
};

beforeEach(async () => {
  await db.works.clear();
  await db.entries.clear();
});

describe('db CRUD', () => {
  it('新增作品与记录后能读回', async () => {
    await putWork(book);
    await putEntry(entry);
    const all = await readAll();
    expect(all.works).toHaveLength(1);
    expect(all.entries[0].page).toBe(50);
  });
  it('编辑作品覆盖同一 id，不产生副本', async () => {
    await putWork(book);
    await putWork({ ...book, title: '活着（修订版）', status: 'doing' });
    const all = await readAll();
    expect(all.works).toHaveLength(1);
    expect(all.works[0].title).toBe('活着（修订版）');
  });
  it('删除作品连带删除它的记录', async () => {
    await putWork(book);
    await putEntry(entry);
    await deleteWork('b1');
    const all = await readAll();
    expect(all.works).toHaveLength(0);
    expect(all.entries).toHaveLength(0);
  });
  it('删除单条记录不影响作品', async () => {
    await putWork(book);
    await putEntry(entry);
    await deleteEntry('e1');
    const all = await readAll();
    expect(all.works).toHaveLength(1);
    expect(all.entries).toHaveLength(0);
  });
  it('replaceAll 整库替换（导入恢复的底层）', async () => {
    await putWork(book);
    await replaceAll([{ ...book, id: 'b2', title: '新书' }], []);
    const all = await readAll();
    expect(all.works.map((w) => w.id)).toEqual(['b2']);
    expect(all.entries).toHaveLength(0);
  });
});

describe('syncWorkStatus 状态联动（v0.4.0）', () => {
  async function getWork(id: string) {
    return (await readAll()).works.find((w) => w.id === id)!;
  }
  it('第一条记录：计划中 → 在读，并补开始日期', async () => {
    await putWork(book);
    await putEntry(entry);
    const w = await getWork('b1');
    expect(w.status).toBe('doing');
    expect(w.startDate).toBe('2026-11-02');
  });
  it('记到总页数 → 自动读完，完成日期取达标记录的日期', async () => {
    await putWork(book);
    await putEntry(entry);
    await putEntry({ ...entry, id: 'e2', date: '2026-11-10', page: 200 });
    const w = await getWork('b1');
    expect(w.status).toBe('done');
    expect(w.finishDate).toBe('2026-11-10');
  });
  it('删掉达标记录 → 状态退回在读，完成日期清除（进度随记录重算）', async () => {
    await putWork(book);
    await putEntry(entry);
    await putEntry({ ...entry, id: 'e2', date: '2026-11-10', page: 200 });
    await deleteEntry('e2');
    const w = await getWork('b1');
    expect(w.status).toBe('doing');
    expect(w.finishDate).toBeUndefined();
  });
  it('删光记录 → 回到计划中', async () => {
    await putWork(book);
    await putEntry(entry);
    await deleteEntry('e1');
    const w = await getWork('b1');
    expect(w.status).toBe('planned');
  });
  it('手动锁定的状态不被联动覆盖', async () => {
    await putWork({ ...book, status: 'planned', statusLocked: true });
    await putEntry({ ...entry, page: 200 });
    const w = await getWork('b1');
    expect(w.status).toBe('planned');
    expect(w.finishDate).toBeUndefined();
  });
  it('暂停的作品记记录也不改状态', async () => {
    await putWork({ ...book, status: 'paused' });
    await putEntry(entry);
    const w = await getWork('b1');
    expect(w.status).toBe('paused');
  });
  it('已读完但没有任何页码数据时，不因新记录被退回在读', async () => {
    await putWork({ ...book, status: 'done', finishDate: '2026-11-01' });
    await putEntry({ ...entry, page: undefined });
    const w = await getWork('b1');
    expect(w.status).toBe('done');
    expect(w.finishDate).toBe('2026-11-01');
  });
  it('电影第一条记录即看完，完成日期取记录日期', async () => {
    const mv: Work = {
      id: 'm1', type: 'movie', title: '重庆森林', creator: '王家卫', category: '剧情',
      durationMin: 102, status: 'planned', highlight: false, createdAt: 1, updatedAt: 1,
    };
    await putWork(mv);
    await putEntry({ id: 'me1', workId: 'm1', date: '2026-10-03', minutes: 102, feeling: '', quote: '', createdAt: 1, updatedAt: 1 });
    const w = await getWork('m1');
    expect(w.status).toBe('done');
    expect(w.finishDate).toBe('2026-10-03');
  });
});
