import { useMemo, useState } from 'react';
import { TYPE_ICON, type Entry, type Work } from '../lib/types';
import { yearReview } from '../lib/stats';
import { fmtMinutes } from '../lib/time';
import { Card, Empty, SectionTitle } from '../components/ui';

export function Year({
  works,
  entries,
  onOpenWork,
}: {
  works: Work[];
  entries: Entry[];
  onOpenWork: (id: string) => void;
}) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const r = useMemo(() => yearReview(year, works, entries), [year, works, entries]);
  const maxMonth = Math.max(1, ...r.monthlyEntries);

  return (
    <div className="px-4">
      <div className="mb-3 flex items-center justify-center gap-5">
        <button aria-label="上一年" onClick={() => setYear(year - 1)} className="px-2 py-1 text-[20px] text-ink/50">‹</button>
        <span className="font-serif text-[20px] font-bold">{year} 年</span>
        <button
          aria-label="下一年"
          onClick={() => setYear(year + 1)}
          disabled={year >= thisYear}
          className="px-2 py-1 text-[20px] text-ink/50 disabled:opacity-25"
        >
          ›
        </button>
      </div>

      <Card className="grid grid-cols-3 gap-y-4 px-2 py-4 text-center">
        {[
          [r.booksFinished.length, '本读完的书'],
          [r.tvWatched.length, '部追过的剧'],
          [r.moviesWatched.length, '部看过的电影'],
          [r.entriesCount, '条记录'],
          [r.quotesCount, '句收藏'],
          [fmtMinutes(r.totalMinutes) || '0 分钟', '阅读观影时长'],
        ].map(([n, label]) => (
          <div key={label}>
            <div className="font-serif text-[19px] font-bold">{n}</div>
            <div className="mt-0.5 text-[12px] text-ink/50">{label}</div>
          </div>
        ))}
      </Card>

      <SectionTitle>每个月的记录</SectionTitle>
      <Card className="px-4 py-4">
        <div className="flex h-24 items-end gap-1.5" aria-label={`${year}年每月记录数`}>
          {r.monthlyEntries.map((n, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-ink/45">{n > 0 ? n : ''}</span>
              <div
                className={`w-full rounded-t ${n > 0 ? 'bg-cinnabar-500/80' : 'bg-ink/[0.07]'}`}
                style={{ height: `${Math.max(6, (n / maxMonth) * 72)}px` }}
              />
              <span className="text-[10px] text-ink/45">{i + 1}月</span>
            </div>
          ))}
        </div>
      </Card>

      <SectionTitle>印象深刻</SectionTitle>
      {r.highlights.length === 0 ? (
        <Card>
          <Empty text="这一年还没有标「印象深刻」的作品" hint="在作品编辑里打开开关，它会出现在这里" />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {r.highlights.map((w) => (
            <button key={w.id} onClick={() => onOpenWork(w.id)} className="card block w-full px-4 py-3 text-left">
              <span className="font-serif text-[15.5px] font-semibold">
                {TYPE_ICON[w.type]} 《{w.title}》
              </span>
              <span className="ml-2 text-[13px] text-ink/50">{w.creator}</span>
            </button>
          ))}
        </div>
      )}

      <SectionTitle>这一年读完的书</SectionTitle>
      {r.booksFinished.length === 0 ? (
        <Card><Empty text="暂无" /></Card>
      ) : (
        <Card className="divide-y divide-ink/[0.05]">
          {r.booksFinished.map((w) => (
            <button key={w.id} onClick={() => onOpenWork(w.id)} className="block w-full px-4 py-3 text-left font-serif text-[15px]">
              《{w.title}》<span className="ml-2 font-sans text-[13px] text-ink/50">{w.creator}</span>
            </button>
          ))}
        </Card>
      )}

      <SectionTitle>这一年追过的剧</SectionTitle>
      {r.tvWatched.length === 0 ? (
        <Card><Empty text="暂无" /></Card>
      ) : (
        <Card className="divide-y divide-ink/[0.05]">
          {r.tvWatched.map((w) => (
            <button key={w.id} onClick={() => onOpenWork(w.id)} className="block w-full px-4 py-3 text-left font-serif text-[15px]">
              《{w.title}》<span className="ml-2 font-sans text-[13px] text-ink/50">{w.creator}</span>
            </button>
          ))}
        </Card>
      )}

      <SectionTitle>这一年看过的电影</SectionTitle>
      {r.moviesWatched.length === 0 ? (
        <Card><Empty text="暂无" /></Card>
      ) : (
        <Card className="divide-y divide-ink/[0.05]">
          {r.moviesWatched.map((w) => (
            <button key={w.id} onClick={() => onOpenWork(w.id)} className="block w-full px-4 py-3 text-left font-serif text-[15px]">
              《{w.title}》<span className="ml-2 font-sans text-[13px] text-ink/50">{w.creator}</span>
            </button>
          ))}
        </Card>
      )}

      <Card className="mt-6 px-4 py-4">
        <p className="font-serif text-[15px] leading-relaxed text-ink/75">
          {year} 年，你读完了 {r.booksFinished.length} 本书，追了 {r.tvWatched.length} 部剧，看了 {r.moviesWatched.length} 部电影，
          在 {r.activeDays} 个日子里留下了 {r.entriesCount} 条记录，收藏了 {r.quotesCount} 句话。
          这些就是这一年精神生活的样子。
        </p>
      </Card>
    </div>
  );
}
