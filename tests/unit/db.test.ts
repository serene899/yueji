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
