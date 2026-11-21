import { describe, expect, it } from 'vitest';
import { backupWorkToWork, buildBackup, parseBackup } from '../../src/lib/backup';
import { blobToDataUrl, dataUrlToBlob } from '../../src/lib/image';
import type { Entry, Work } from '../../src/lib/types';

const works: Work[] = [
  { id: 'b1', type: 'book', title: '活着', creator: '余华', category: '文学', status: 'doing', highlight: false, createdAt: 1, updatedAt: 1 },
];
const entries: Entry[] = [
  { id: 'e1', workId: 'b1', date: '2026-11-02', page: 50, feeling: '好', quote: '', createdAt: 1, updatedAt: 1 },
];

describe('parseBackup', () => {
  it('自己导出的备份能通过校验（往返）', async () => {
    const b = await buildBackup(works, entries);
    expect(b.schemaVersion).toBe(2);
    const r = parseBackup(JSON.parse(JSON.stringify(b)));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.works).toHaveLength(1);
      expect(r.data.entries).toHaveLength(1);
    }
  });
  it('v1 旧备份（0.1.0 导出、无封面）仍然可以恢复', () => {
    const v1 = {
      app: 'yueji', schemaVersion: 1, exportedAt: '2026-11-19T00:00:00.000Z',
      works: [{ id: 'b1', type: 'book', title: '活着', creator: '余华', category: '文学', status: 'doing', highlight: false, createdAt: 1, updatedAt: 1 }],
      entries: [],
    };
    const r = parseBackup(v1);
    expect(r.ok).toBe(true);
    if (r.ok) expect(backupWorkToWork(r.data.works[0]).cover).toBeUndefined();
  });
  it('拒绝非阅迹文件', () => {
    expect(parseBackup({ app: 'shengxi', schemaVersion: 1, works: [], entries: [] }).ok).toBe(false);
    expect(parseBackup(null).ok).toBe(false);
    expect(parseBackup('x').ok).toBe(false);
  });
  it('拒绝未知版本', () => {
    expect(parseBackup({ app: 'yueji', schemaVersion: 99, works: [], entries: [] }).ok).toBe(false);
  });
  it('拒绝字段缺失的作品', async () => {
    const bad = await buildBackup([{ ...works[0], title: undefined as unknown as string }], []);
    expect(parseBackup(JSON.parse(JSON.stringify(bad))).ok).toBe(false);
  });
  it('拒绝指向不存在作品的记录', async () => {
    const bad = await buildBackup(works, [{ ...entries[0], workId: 'nope' }]);
    expect(parseBackup(bad).ok).toBe(false);
  });
  it('拒绝日期格式不对的记录', async () => {
    const bad = await buildBackup(works, [{ ...entries[0], date: '2026/11/02' }]);
    expect(parseBackup(bad).ok).toBe(false);
  });
  it('v0.4.0 新状态（暂停/弃读）与细分类、状态锁定能通过校验并往返', async () => {
    const paused: Work = { ...works[0], status: 'paused', subcategory: undefined, statusLocked: true };
    const b = await buildBackup([paused], entries);
    const r = parseBackup(JSON.parse(JSON.stringify(b)));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.works[0].status).toBe('paused');
      expect(r.data.works[0].statusLocked).toBe(true);
    }
    const other: Work = { id: 'o1', type: 'other', title: '某专辑', creator: '某乐队', category: '音乐', subcategory: '音乐', status: 'doing', highlight: false, createdAt: 1, updatedAt: 1 };
    const b2 = await buildBackup([other], []);
    const r2 = parseBackup(JSON.parse(JSON.stringify(b2)));
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(backupWorkToWork(r2.data.works[0]).subcategory).toBe('音乐');
  });
  it('v0.4.3 片长秒数与记录秒数能通过校验并往返', async () => {
    const m: Work = { id: 'm9', type: 'movie', title: '八仙', creator: '某导演', category: '剧情', durationMin: 143, durationSec: 16, status: 'done', highlight: false, createdAt: 1, updatedAt: 1 };
    const b = await buildBackup([m], [{ id: 'e10', workId: 'm9', date: '2026-11-21', minutes: 143, seconds: 16, feeling: '', quote: '', createdAt: 1, updatedAt: 1 }]);
    const r = parseBackup(JSON.parse(JSON.stringify(b)));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(backupWorkToWork(r.data.works[0]).durationSec).toBe(16);
      expect(r.data.entries[0].seconds).toBe(16);
    }
  });
  it('电视剧类型与集数字段能通过校验', async () => {
    const tv: Work = { id: 't1', type: 'tv', title: '漫长的季节', creator: '辛爽', category: '悬疑', totalEpisodes: 12, status: 'doing', highlight: false, createdAt: 1, updatedAt: 1 };
    const b = await buildBackup([tv], [{ id: 'e9', workId: 't1', date: '2026-11-21', episode: 7, feeling: '', quote: '', createdAt: 1, updatedAt: 1 }]);
    expect(parseBackup(JSON.parse(JSON.stringify(b))).ok).toBe(true);
  });
});

describe('封面随备份往返', () => {
  it('Blob → data URL → Blob 字节不变', async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3, 250, 0, 99]);
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    const url = await blobToDataUrl(blob);
    expect(url.startsWith('data:image/jpeg;base64,')).toBe(true);
    const back = dataUrlToBlob(url);
    expect(back).not.toBeNull();
    expect(new Uint8Array(await back!.arrayBuffer())).toEqual(bytes);
  });
  it('带封面的备份：导出有 coverData，导入能还原封面', async () => {
    const cover = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/jpeg' });
    const b = await buildBackup([{ ...works[0], cover }], entries);
    expect(b.works[0].coverData).toContain('data:image/jpeg;base64,');
    const parsed = parseBackup(JSON.parse(JSON.stringify(b)));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const w = backupWorkToWork(parsed.data.works[0]);
      expect(w.cover).toBeInstanceOf(Blob);
      expect(new Uint8Array(await w.cover!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
    }
  });
  it('坏的 coverData 会被校验拒绝', async () => {
    const b = await buildBackup(works, entries);
    (b.works[0] as { coverData?: string }).coverData = 'not-a-data-url';
    expect(parseBackup(b).ok).toBe(false);
  });
});
