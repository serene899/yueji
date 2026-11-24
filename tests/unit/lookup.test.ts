import { describe, expect, it } from 'vitest';
import { bgmTypesFor, mapBgmSubjects, mapOlDocs, pickWikiEntity } from '../../src/lib/lookup';

describe('mapOlDocs（Open Library 书封候选）', () => {
  it('只保留有封面的结果，作者/年份/封面地址正确映射', () => {
    const list = mapOlDocs({
      docs: [
        { title: '活着', author_name: ['余华'], first_publish_year: 1993, cover_i: 10242514 },
        { title: '活着', author_name: ['余华'] },
        { title: '许三观卖血记', author_name: ['余华'], first_publish_year: 1995, cover_i: 123 },
      ],
    });
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ title: '活着', creatorLabel: '余华', year: 1993, source: 'openlibrary' });
    expect(list[0].fullUrl).toContain('/b/id/10242514-L.jpg');
    expect(list[0].thumbUrl).toContain('/b/id/10242514-M.jpg');
  });
  it('坏数据返回空数组', () => {
    expect(mapOlDocs(null)).toEqual([]);
    expect(mapOlDocs({})).toEqual([]);
  });
});

describe('mapBgmSubjects（Bangumi 影视封面候选）', () => {
  it('中文名优先、过滤 nsfw 与无图条目、年份从日期取', () => {
    const list = mapBgmSubjects({
      data: [
        { name: '重慶森林', name_cn: '重庆森林', date: '1994-07-14', nsfw: false, images: { large: 'https://x/l.jpg', medium: 'https://x/m.jpg', common: 'https://x/c.jpg' } },
        { name: '某条目', name_cn: '', date: '2020-01-01', nsfw: true, images: { large: 'https://x/a.jpg' } },
        { name: '无图条目', name_cn: '无图', date: '', nsfw: false, images: {} },
      ],
    });
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ title: '重庆森林', year: 1994, thumbUrl: 'https://x/c.jpg', fullUrl: 'https://x/l.jpg' });
  });
});

describe('bgmTypesFor', () => {
  it('电影/剧查三次元+动画；音乐查音乐；游戏/播客不查；书不用 Bangumi', () => {
    expect(bgmTypesFor('movie')).toEqual([6, 2]);
    expect(bgmTypesFor('tv')).toEqual([6, 2]);
    expect(bgmTypesFor('other', '音乐')).toEqual([3]);
    expect(bgmTypesFor('other', '纪录片')).toEqual([6]);
    expect(bgmTypesFor('other', '游戏')).toBeNull();
    expect(bgmTypesFor('other', '播客')).toBeNull();
    expect(bgmTypesFor('book')).toBeNull();
  });
});

const claim = (id: string) => ({ mainsnak: { datavalue: { value: { id } } } });
const timeClaim = (t: string) => ({ mainsnak: { datavalue: { value: { time: t } } } });

describe('pickWikiEntity（Wikidata 演职员挑选）', () => {
  const entities = {
    Q1: { id: 'Q1', claims: { P31: [claim('Q5')] } }, // 普通人物条目，没有演职员
    Q2: {
      id: 'Q2',
      claims: { P57: [claim('Q100')], P161: [claim('Q101'), claim('Q102')], P577: [timeClaim('+1994-07-14T00:00:00Z')] },
    },
    Q3: {
      id: 'Q3',
      claims: { P57: [claim('Q200')], P161: [claim('Q201')], P577: [timeClaim('+2019-05-01T00:00:00Z')] },
    },
  };
  it('跳过没有导演/主演的条目，取第一条影视条目并解析年份', () => {
    const pick = pickWikiEntity({ entities });
    expect(pick?.entityId).toBe('Q2');
    expect(pick?.directorIds).toEqual(['Q100']);
    expect(pick?.castIds).toEqual(['Q101', 'Q102']);
    expect(pick?.year).toBe(1994);
  });
  it('给了期望年份时优先年份对得上的那条（同名不同年）', () => {
    expect(pickWikiEntity({ entities }, 2019)?.entityId).toBe('Q3');
    expect(pickWikiEntity({ entities }, 1995)?.entityId).toBe('Q2');
  });
  it('没有任何演职员数据时返回 null', () => {
    expect(pickWikiEntity({ entities: { Q1: entities.Q1 } })).toBeNull();
    expect(pickWikiEntity(null)).toBeNull();
  });
});
