import { describe, expect, it } from 'vitest';
import { buildBackup, parseBackup } from '../../src/lib/backup';
import type { Entry, Work } from '../../src/lib/types';

const works: Work[] = [
  { id: 'b1', type: 'book', title: '活着', creator: '余华', category: '文学', status: 'doing', highlight: false, createdAt: 1, updatedAt: 1 },
];
const entries: Entry[] = [
  { id: 'e1', workId: 'b1', date: '2026-11-02', page: 50, feeling: '好', quote: '', createdAt: 1, updatedAt: 1 },
];

describe('parseBackup', () => {
  it('自己导出的备份能通过校验（往返）', () => {
    const b = buildBackup(works, entries);
    const r = parseBackup(JSON.parse(JSON.stringify(b)));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.works).toHaveLength(1);
      expect(r.data.entries).toHaveLength(1);
    }
  });
  it('拒绝非阅迹文件', () => {
    expect(parseBackup({ app: 'shengxi', schemaVersion: 1, works: [], entries: [] }).ok).toBe(false);
    expect(parseBackup(null).ok).toBe(false);
    expect(parseBackup('x').ok).toBe(false);
  });
  it('拒绝未知版本', () => {
    expect(parseBackup({ app: 'yueji', schemaVersion: 99, works: [], entries: [] }).ok).toBe(false);
  });
  it('拒绝字段缺失的作品', () => {
    const bad = buildBackup([{ ...works[0], title: undefined as unknown as string }], []);
    expect(parseBackup(JSON.parse(JSON.stringify(bad))).ok).toBe(false);
  });
  it('拒绝指向不存在作品的记录', () => {
    const bad = buildBackup(works, [{ ...entries[0], workId: 'nope' }]);
    expect(parseBackup(bad).ok).toBe(false);
  });
  it('拒绝日期格式不对的记录', () => {
    const bad = buildBackup(works, [{ ...entries[0], date: '2026/11/02' }]);
    expect(parseBackup(bad).ok).toBe(false);
  });
});
