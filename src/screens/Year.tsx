import { useMemo, useState } from 'react';
import { TYPE_ICON, type Entry, type Work } from '../lib/types';
import { yearReview } from '../lib/stats';
import { fmtMinutes } from '../lib/time';
import { Card, Cover, Empty, SectionTitle } from '../components/ui';

function WorkRows({ list, onOpenWork }: { list: Work[]; onOpenWork: (id: string) => void }) {
  return (
    <Card className="divide-y divide-ink/[0.05]">
      {list.map((w) => (
        <button key={w.id} onClick={() => onOpenWork(w.id)} className="pressable block w-full px-3.5 py-2.5 text-left">
          <div className="flex items-center gap-3">
            <Cover work={w} />
            <div className="min-w-0">
              <div className="font-serif text-[15px] font-semibold leading-snug">
                {TYPE_ICON[w.type]} 《{w.title}》
              </div>
              <div className="mt-0.5 text-[12.5px] text-ink/50">{w.creator}</div>
            </div>
          </div>
        </button>
      ))}
    </Card>
  );
}

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
  const finishedTotal = r.finishedBooks.length + r.finishedMovies.length + r.finishedTvs.length;

  return (
    <div className="px-4">
      <div className="mb-1 mt-2 text-center">
        <div className="flex items-center justify-center gap-5">
          <button aria-label="上一年" onClick={() => setYear(year - 1)} className="px-2 py-1 text-[20px] text-ink/50">‹</button>
          <span className="font-serif text-[30px] font-bold tracking-wide">{year}</span>
          <button
            aria-label="下一年"
            onClick={() => setYear(year + 1)}
            disabled={year >= thisYear}
            className="px-2 py-1 text-[20px] text-ink/50 disabled:opacity-25"
          >
            ›
          </button>
        </div>
        <p className="mt-1 font-serif text-[14px] text-ink/55">这一年的精神生活，都在这里了</p>
      </div>

      <SectionTitle>这一年完成的作品</SectionTitle>
      <Card className="grid grid-cols-3 px-1 py-4 text-center">
        {[
          [r.finishedBooks.length, '本读完的书'],
          [r.finishedTvs.length, '部看完的剧'],
          [r.finishedMovies.length, '部看完的电影'],
        ].map(([n, label]) => (
          <div key={label}>
            <div className="font-serif text-[21px] font-bold">{n}</div>
            <div className="mt-0.5 text-[12px] text-ink/50">{label}</div>
          </div>
        ))}
      </Card>

      <SectionTitle>这一年的文化活动</SectionTitle>
      <Card className="grid grid-cols-3 gap-y-4 px-1 py-4 text-center">
        {[
          [r.reading.count, '次阅读活动'],
          [r.watching.count, '次观看活动'],
          [r.other.count, '次其他活动'],
          [r.activeDays, '个有记录的日子'],
          [r.quotesCount, '句收藏'],
          [fmtMinutes(r.totalMinutes) || '0 分钟', '总时长'],
        ].map(([n, label]) => (
          <div key={label}>
            <div className="font-serif text-[19px] font-bold">{n}</div>
            <div className="mt-0.5 text-[12px] text-ink/50">{label}</div>
          </div>
        ))}
      </Card>
      {r.other.bySubcategory.length > 0 && (
        <p className="mt-2 px-1 text-[13px] leading-relaxed text-ink/55">
          其他活动里：{r.other.bySubcategory.map((s) => `${s.name} ${s.count} 次`).join(' · ')}
        </p>
      )}

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
            <button key={w.id} onClick={() => onOpenWork(w.id)} className="card pressable block w-full px-3.5 py-2.5 text-left">
              <div className="flex items-center gap-3">
                <Cover work={w} />
                <div className="min-w-0">
                  <div className="font-serif text-[15.5px] font-semibold leading-snug">
                    {TYPE_ICON[w.type]} 《{w.title}》
                  </div>
                  <div className="mt-0.5 text-[13px] text-ink/50">{w.creator}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <SectionTitle>这一年读完的书</SectionTitle>
      {r.finishedBooks.length === 0 ? (
        <Card><Empty text="暂无" /></Card>
      ) : (
        <WorkRows list={r.finishedBooks} onOpenWork={onOpenWork} />
      )}

      <SectionTitle>这一年看完的剧</SectionTitle>
      {r.finishedTvs.length === 0 ? (
        <Card><Empty text="暂无" /></Card>
      ) : (
        <WorkRows list={r.finishedTvs} onOpenWork={onOpenWork} />
      )}

      <SectionTitle>这一年看完的电影</SectionTitle>
      {r.finishedMovies.length === 0 ? (
        <Card><Empty text="暂无" /></Card>
      ) : (
        <WorkRows list={r.finishedMovies} onOpenWork={onOpenWork} />
      )}

      <Card className="mt-6 px-4 py-4">
        <p className="font-serif text-[15px] leading-relaxed text-ink/75">
          {year} 年，你完成了 {finishedTotal} 部作品
          {finishedTotal > 0 &&
            `（${[
              r.finishedBooks.length > 0 && `${r.finishedBooks.length} 本书`,
              r.finishedTvs.length > 0 && `${r.finishedTvs.length} 部剧`,
              r.finishedMovies.length > 0 && `${r.finishedMovies.length} 部电影`,
            ]
              .filter(Boolean)
              .join('、')}）`}
          ，在 {r.activeDays} 个日子里留下了 {r.entriesCount} 条记录，收藏了 {r.quotesCount} 句话。
          这些就是这一年精神生活的样子。
        </p>
      </Card>
    </div>
  );
}
