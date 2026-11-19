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
  if (min < 60) return `${min} 分钟`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest ? `${h} 小时 ${rest} 分` : `${h} 小时`;
}
