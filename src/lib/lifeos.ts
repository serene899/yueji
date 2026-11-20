/**
 * 阅迹 → LIFEOS 数据交换导出（协议草案 v0.1.2，与钱在哪 / 生息同一套 lifeos-exchange 格式）。
 *
 * 所有者 2026-11-19 确认接入：人生K线图的「学习」「精神生活」两维从阅迹取数。
 * 只送事实，绝不送评分（manifest.scoringPolicy = 'facts-never-produce-scores'）：
 * - x-reading-minutes：按日汇总的读书时长（分钟）——只统计书籍类记录的 minutes。
 * - x-culture-activity：按日的文化活动（记录条数 + 是否写了感受 / 摘句 / 当天读完看完），
 *   供人生K线图计算「精神生活」自动分时参考；感受原文、摘句原文一律不进交换文件。
 * 文件只在本机生成、由用户自己保存，再到人生K线图「数据」页汇入；阅迹不联网发送任何数据。
 */
import type { Entry, Work } from './types';
import { readAll } from './db';

export const LIFEOS_SOURCE = 'lifeos.yueji' as const;
export const EXCHANGE_FORMAT = 'lifeos-exchange' as const;
export const PROTOCOL_VERSION = '0.1.2' as const;
export const YUEJI_APP_VERSION = '0.3.0';

function canonicalize(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map(canonicalize).join(',')}]`;
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o).filter((k) => o[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(o[k])}`).join(',')}}`;
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function uuid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface YuejiExchangeRecord {
  sourceApp: typeof LIFEOS_SOURCE;
  sourceDeviceId: string;
  sourceRecordId: string;
  sourceRecordType: string;
  sourceUpdatedAt: string;
  op: 'write';
  occurredAt: string;
  tz: string;
  layer: 'fact';
  dimensionHint: 'study' | 'spirit';
  sensitivity: 'sensitive';
  data: {
    metricKey: 'x-reading-minutes' | 'x-culture-activity';
    value: number;
    unit: 'min' | 'count';
    attributes: Record<string, string | number | boolean>;
  };
  contentHash: string;
}

export interface YuejiExchangeFile {
  container: 'plain';
  manifest: {
    format: typeof EXCHANGE_FORMAT;
    protocolVersion: typeof PROTOCOL_VERSION;
    sourceApp: typeof LIFEOS_SOURCE;
    appVersion: string;
    exportId: string;
    exportedAt: string;
    exportDeviceId: string;
    timezone: string;
    synthetic: boolean;
    scoringPolicy: 'facts-never-produce-scores';
    consent: { grantedBy: 'user'; grantedAt: string; transport: 'file'; layers: ['fact'] };
    counts: { records: number; writes: number; voids: number };
    checksum: { alg: 'SHA-256'; canonicalization: 'RFC8785-JCS'; value: string };
  };
  records: YuejiExchangeRecord[];
}

const DEVICE_KEY = 'yueji-lifeos-device-id';
function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) { id = uuid(); localStorage.setItem(DEVICE_KEY, id); }
    return id;
  } catch {
    return uuid();
  }
}

/** 纯函数：由作品与记录聚合出交换文件（校验和异步补齐）。 */
export async function buildExchange(works: Work[], entries: Entry[], now = new Date()): Promise<YuejiExchangeFile> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
  const dev = deviceId();
  const workById = new Map(works.map((w) => [w.id, w]));

  interface DayAgg {
    readingMinutes: number;
    sessions: number;
    hasFeeling: boolean;
    hasQuote: boolean;
    finished: boolean;
  }
  const byDate = new Map<string, DayAgg>();
  const agg = (date: string): DayAgg => {
    let a = byDate.get(date);
    if (!a) { a = { readingMinutes: 0, sessions: 0, hasFeeling: false, hasQuote: false, finished: false }; byDate.set(date, a); }
    return a;
  };
  for (const e of entries) {
    const a = agg(e.date);
    a.sessions += 1;
    if (e.feeling.trim()) a.hasFeeling = true;
    if (e.quote.trim()) a.hasQuote = true;
    const w = workById.get(e.workId);
    if (w?.type === 'book' && e.minutes && e.minutes > 0) a.readingMinutes += e.minutes;
  }
  for (const w of works) {
    if (w.finishDate) agg(w.finishDate).finished = true;
  }

  const records: YuejiExchangeRecord[] = [];
  const stamp = now.toISOString();
  for (const date of [...byDate.keys()].sort()) {
    const a = byDate.get(date)!;
    const occurredAt = new Date(`${date}T12:00:00+08:00`).toISOString();
    if (a.readingMinutes > 0) {
      const base = {
        sourceApp: LIFEOS_SOURCE, sourceDeviceId: dev, sourceRecordId: `yueji:${date}:reading`,
        sourceRecordType: 'readingDay', sourceUpdatedAt: stamp, op: 'write' as const, occurredAt, tz,
        layer: 'fact' as const, dimensionHint: 'study' as const, sensitivity: 'sensitive' as const,
        data: { metricKey: 'x-reading-minutes' as const, value: a.readingMinutes, unit: 'min' as const, attributes: { localDate: date } },
      };
      records.push({ ...base, contentHash: await sha256Hex(canonicalize(base)) });
    }
    if (a.sessions > 0 || a.finished) {
      const base = {
        sourceApp: LIFEOS_SOURCE, sourceDeviceId: dev, sourceRecordId: `yueji:${date}:culture`,
        sourceRecordType: 'cultureDay', sourceUpdatedAt: stamp, op: 'write' as const, occurredAt, tz,
        layer: 'fact' as const, dimensionHint: 'spirit' as const, sensitivity: 'sensitive' as const,
        data: {
          metricKey: 'x-culture-activity' as const, value: Math.max(a.sessions, a.finished ? 1 : 0), unit: 'count' as const,
          attributes: { localDate: date, hasFeeling: a.hasFeeling, hasQuote: a.hasQuote, finished: a.finished },
        },
      };
      records.push({ ...base, contentHash: await sha256Hex(canonicalize(base)) });
    }
  }

  const file: YuejiExchangeFile = {
    container: 'plain',
    manifest: {
      format: EXCHANGE_FORMAT, protocolVersion: PROTOCOL_VERSION, sourceApp: LIFEOS_SOURCE,
      appVersion: YUEJI_APP_VERSION, exportId: uuid(), exportedAt: stamp, exportDeviceId: dev,
      timezone: tz, synthetic: false, scoringPolicy: 'facts-never-produce-scores',
      consent: { grantedBy: 'user', grantedAt: stamp, transport: 'file', layers: ['fact'] },
      counts: { records: records.length, writes: records.length, voids: 0 },
      checksum: { alg: 'SHA-256', canonicalization: 'RFC8785-JCS', value: '' },
    },
    records,
  };
  file.manifest.checksum.value = await sha256Hex(canonicalize({ ...file, manifest: { ...file.manifest, checksum: undefined } }));
  return file;
}

/** 生成交换文件并触发下载（iPhone 上走系统分享/存储到「文件」）。返回文件名与天数。 */
export async function exportExchange(): Promise<{ name: string; days: number; records: number }> {
  const { works, entries } = await readAll();
  const file = await buildExchange(works, entries);
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const day = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const name = `lifeos-exchange_lifeos.yueji_${day}.json`;
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  const dates = new Set(file.records.map((r) => r.data.attributes.localDate));
  return { name, days: dates.size, records: file.records.length };
}
