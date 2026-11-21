// 日期小工具：全应用统一使用本地时区的 YYYY-MM-DD 字符串。

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function yearOf(dateStr: string): number {
  return Number(dateStr.slice(0, 4));
}

export function monthOf(dateStr: string): number {
  return Number(dateStr.slice(5, 7));
}

/** "2026-11-19" → "11月19日"；同年省略年份 */
export function fmtDate(dateStr?: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const now = new Date();
  const md = `${m}月${d}日`;
  return y === now.getFullYear() ? md : `${y}年${md}`;
}

export function fmtMinutes(min?: number): string {
  if (!min) return '';
  const t = Math.round(min); // 含秒折算的小数分钟在汇总展示时取整
  if (t < 60) return `${t} 分钟`;
  const h = Math.floor(t / 60);
  const rest = t % 60;
  return rest ? `${h} 小时 ${rest} 分` : `${h} 小时`;
}

/**
 * 单次时长展示（v0.4.3）：记了秒就精确到秒（143 分 16 秒 / 45 秒），
 * 没记秒沿用 fmtMinutes 的「X 小时 Y 分」口径。
 */
export function fmtDuration(minutes?: number, seconds?: number): string {
  const m = minutes ?? 0;
  const s = seconds ?? 0;
  if (!m && !s) return '';
  if (!s) return fmtMinutes(m);
  if (!m) return `${s} 秒`;
  return `${m} 分 ${s} 秒`;
}
