import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BOOK_CATEGORIES,
  MOVIE_CATEGORIES,
  OTHER_CATEGORIES,
  SUBCATEGORIES,
  TV_CATEGORIES,
  newId,
  statusOptionsFor,
  statusText,
  type Entry,
  type Work,
  type WorkStatus,
  type WorkType,
} from '../lib/types';
import { db, deleteEntry, deleteWork, putEntry, putWork } from '../lib/db';
import { processCover, processCoverBlob } from '../lib/image';
import { bgmTypesFor, fetchImageBlob, fetchTmdbCredits, fetchTmdbDetails, fetchWikiCredits, getTmdbKey, searchCovers, searchTmdbCovers, type CoverCandidate } from '../lib/lookup';
import { fmtDuration, todayStr } from '../lib/time';
import { Cover, DeleteButton, Field, Segmented, Sheet, inputCls } from './ui';

/**
 * 时长「分钟 + 秒」双输入（v0.4.3）：电影时长天然带秒（如 143 分 16 秒），
 * 单个分钟框只能填整数、还会把冒号/小数点吞掉，故拆成两个整数框。
 * 保存时合成总秒数再拆回，秒 ≥ 60 自动进位到分钟。
 */
function splitDuration(minStr: string, secStr: string): { minutes?: number; seconds?: number } {
  const total = (minStr ? Number(minStr) : 0) * 60 + (secStr ? Number(secStr) : 0);
  if (!total) return {};
  return { minutes: Math.floor(total / 60) || undefined, seconds: total % 60 || undefined };
}

function DurationInputs({
  min,
  sec,
  onMin,
  onSec,
  minLabel,
  secLabel,
}: {
  min: string;
  sec: string;
  onMin: (v: string) => void;
  onSec: (v: string) => void;
  minLabel: string;
  secLabel: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input aria-label={minLabel} className={inputCls} inputMode="numeric" value={min} onChange={(e) => onMin(e.target.value.replace(/\D/g, ''))} placeholder="0" />
      <span className="shrink-0 text-[14px] text-ink/55">分</span>
      <input aria-label={secLabel} className={inputCls} inputMode="numeric" value={sec} onChange={(e) => onSec(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="0" />
      <span className="shrink-0 text-[14px] text-ink/55">秒</span>
    </div>
  );
}

const CATEGORIES: Record<WorkType, string[]> = {
  book: BOOK_CATEGORIES,
  tv: TV_CATEGORIES,
  movie: MOVIE_CATEGORIES,
  other: OTHER_CATEGORIES,
};

const CREATOR_LABEL: Record<WorkType, string> = {
  book: '作者',
  tv: '主创（导演 / 主演）',
  movie: '导演',
  other: '创作者',
};

/* ---------------- 作品表单（添加/编辑） ---------------- */

export function WorkForm({
  open,
  onClose,
  initial,
  defaultType = 'book',
}: {
  open: boolean;
  onClose: () => void;
  initial?: Work | null;
  defaultType?: WorkType;
}) {
  const [type, setType] = useState<WorkType>(initial?.type ?? defaultType);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [creator, setCreator] = useState(initial?.creator ?? '');
  const [cast, setCast] = useState(initial?.cast ?? '');
  // 联网找封面（v0.5.0）：候选列表 + 状态文案；全程尽力而为，失败不挡手动流程
  const [finding, setFinding] = useState(false);
  const [candidates, setCandidates] = useState<CoverCandidate[] | null>(null);
  const [lookupMsg, setLookupMsg] = useState('');
  const [applying, setApplying] = useState(false);
  const [category, setCategory] = useState(initial?.category ?? '');
  const [subcategory, setSubcategory] = useState(initial?.subcategory ?? '');
  const [year, setYear] = useState(initial?.year ? String(initial.year) : '');
  const [totalPages, setTotalPages] = useState(initial?.totalPages ? String(initial.totalPages) : '');
  const [durationMin, setDurationMin] = useState(initial?.durationMin ? String(initial.durationMin) : '');
  const [durationSec, setDurationSec] = useState(initial?.durationSec ? String(initial.durationSec) : '');
  const [totalEpisodes, setTotalEpisodes] = useState(initial?.totalEpisodes ? String(initial.totalEpisodes) : '');
  const [status, setStatus] = useState<WorkStatus>(initial?.status ?? 'planned');
  const [statusLocked, setStatusLocked] = useState(initial?.statusLocked ?? false);
  const [startDate, setStartDate] = useState(initial?.startDate ?? '');
  const [finishDate, setFinishDate] = useState(initial?.finishDate ?? '');
  const [highlight, setHighlight] = useState(initial?.highlight ?? false);
  const [cover, setCover] = useState<Blob | undefined>(initial?.cover);
  const [coverBusy, setCoverBusy] = useState(false);
  const [error, setError] = useState('');
  const [dupWarn, setDupWarn] = useState<Work | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const allWorks = useLiveQuery(() => db.works.toArray(), [], []);

  const cats = CATEGORIES[type];

  // 封面预览对象：给占位封面组件拼一个临时 Work
  const previewWork: Work = {
    id: initial?.id ?? 'preview',
    type,
    title: title || '作品名',
    creator,
    category,
    status,
    highlight,
    cover,
    createdAt: 0,
    updatedAt: 0,
  };

  async function pickCover(file: File) {
    setCoverBusy(true);
    try {
      setCover(await processCover(file));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '封面处理失败');
    }
    setCoverBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  const canLookup = type === 'book' || bgmTypesFor(type, subcategory || undefined) !== null;

  async function findCovers() {
    setFinding(true);
    setLookupMsg('');
    setCandidates(null);
    let note = '';
    try {
      // 填了 TMDB 密钥时影视优先走 TMDB（海报与演职员最全）；没结果或密钥不对再回落 Bangumi
      const key = getTmdbKey();
      if (key && (type === 'movie' || type === 'tv')) {
        try {
          const list = await searchTmdbCovers(type, title, key);
          if (list.length) {
            setCandidates(list);
            setFinding(false);
            return;
          }
        } catch (e) {
          if (e instanceof Error && e.message.includes('401')) note = 'TMDB 密钥好像不对（可以去「我的」里检查），先用 Bangumi 找：';
        }
      }
      const list = await searchCovers(type, subcategory || undefined, title, creator);
      setCandidates(list);
      if (!list.length) setLookupMsg('没搜到这部作品的封面——可以检查一下名字，或用下面的「选择封面」手动上传。');
      else if (note) setLookupMsg(note);
    } catch {
      setLookupMsg('网络没连上，封面没找成。可以手动选图，不影响保存。');
    }
    setFinding(false);
  }

  async function applyCandidate(c: CoverCandidate) {
    setApplying(true);
    try {
      const blob = await fetchImageBlob(c.fullUrl);
      setCover(await processCoverBlob(blob));
      const filled: string[] = ['封面'];
      if (!year && c.year) {
        setYear(String(c.year));
        filled.push('年份');
      }
      if (type === 'book' && !creator.trim() && c.creatorLabel) {
        setCreator(c.creatorLabel);
        filled.push('作者');
      }
      if (type === 'movie' || type === 'tv') {
        // 顺带补导演/主演：TMDB 条目用 TMDB 演职员，Bangumi 条目用 Wikidata；只填空栏，不覆盖已写的
        const credits = c.tmdb
          ? await fetchTmdbCredits(c.tmdb.kind, c.tmdb.id, getTmdbKey())
          : await fetchWikiCredits(c.title, c.year ?? (year ? Number(year) : undefined));
        if (c.tmdb?.genre && !category.trim() && cats.includes(c.tmdb.genre)) {
          setCategory(c.tmdb.genre);
          filled.push('类型');
        }
        if (c.tmdb) {
          // 片长/总集数不在搜索结果里，按 id 再拉一次详情补上（只填空栏）
          const extras = await fetchTmdbDetails(c.tmdb.kind, c.tmdb.id, getTmdbKey());
          if (type === 'movie' && extras.runtimeMin && !durationMin && !durationSec) {
            setDurationMin(String(extras.runtimeMin));
            filled.push('片长');
          }
          if (type === 'tv' && extras.episodes && !totalEpisodes) {
            setTotalEpisodes(String(extras.episodes));
            filled.push('总集数');
          }
        }
        if (credits) {
          if (!creator.trim() && credits.director) {
            setCreator(credits.director);
            filled.push('导演');
          }
          if (!cast.trim() && credits.cast.length) {
            setCast(credits.cast.join('、'));
            filled.push('主演');
          }
          if (!year && !c.year && credits.year) {
            setYear(String(credits.year));
            filled.push('年份');
          }
        }
      }
      setCandidates(null);
      setLookupMsg(`已补上：${filled.join('、')}。海报已下载到这台手机，之后断网也能看。`);
    } catch {
      setLookupMsg('海报没下载下来，网络可能不稳，再点一次这张试试。');
    }
    setApplying(false);
  }

  async function save(force = false) {
    if (!title.trim()) {
      setError('先写下作品的名字');
      return;
    }
    // 重复提醒：同类型、同名作品已存在时先提醒，用户确认后仍可保存（例如同名不同作品）
    if (!force) {
      const norm = (s: string) => s.trim().replace(/\s+/g, '').toLowerCase();
      const dup = (allWorks ?? []).find(
        (w) => w.id !== initial?.id && w.type === type && norm(w.title) === norm(title),
      );
      if (dup) {
        setDupWarn(dup);
        return;
      }
    }
    const now = Date.now();
    const dur = type === 'movie' ? splitDuration(durationMin, durationSec) : {};
    const w: Work = {
      id: initial?.id ?? newId(),
      type,
      title: title.trim(),
      creator: creator.trim(),
      cast: (type === 'movie' || type === 'tv') && cast.trim() ? cast.trim() : undefined,
      category: type === 'other' ? subcategory || '其他' : category.trim() || '其他',
      subcategory: type === 'other' ? subcategory || undefined : undefined,
      year: year ? Number(year) : undefined,
      totalPages: type === 'book' && totalPages ? Number(totalPages) : undefined,
      durationMin: dur.minutes,
      durationSec: dur.seconds,
      totalEpisodes: type === 'tv' && totalEpisodes ? Number(totalEpisodes) : undefined,
      status,
      statusLocked,
      startDate: startDate || undefined,
      // 改回未完成时清掉完成日期，避免年度回顾还按它统计完成
      finishDate: status === 'done' ? finishDate || todayStr() : undefined,
      highlight,
      cover,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    await putWork(w);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial ? '编辑作品' : '添加作品'}>
      <div className="mb-4">
        <Segmented
          ariaLabel="作品类型"
          value={type}
          onChange={(t) => {
            setType(t);
            setCategory('');
            setSubcategory('');
            setDupWarn(null);
            if (!statusOptionsFor(t).includes(status)) setStatus('planned');
          }}
          options={[
            { value: 'book', label: '📖 书' },
            { value: 'tv', label: '📺 剧' },
            { value: 'movie', label: '🎬 电影' },
            { value: 'other', label: '✦ 其他' },
          ]}
        />
      </div>

      {/* 封面 */}
      <div className="mb-4 flex items-center gap-4">
        <Cover work={previewWork} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink/55">封面</p>
          <p className="mb-2 mt-0.5 text-[12.5px] leading-relaxed text-ink/45">
            从相册选一张，或先填好名字、用下面的「联网找封面」。压缩后只存这台手机里。
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-lg bg-cinnabar-600 px-3.5 py-1.5 text-[14px] font-medium text-white disabled:opacity-50"
              disabled={coverBusy}
            >
              {coverBusy ? '处理中…' : cover ? '换一张' : '选择封面'}
            </button>
            {cover && (
              <button onClick={() => setCover(undefined)} className="rounded-lg bg-ink/[0.06] px-3.5 py-1.5 text-[14px] text-ink/70">
                移除
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="选择封面图片"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void pickCover(f);
            }}
          />
        </div>
      </div>

      <Field label={type === 'book' ? '书名 *' : type === 'movie' ? '片名 *' : type === 'tv' ? '剧名 *' : '名称 *'}>
        <input aria-label="作品名" className={inputCls} value={title} onChange={(e) => { setTitle(e.target.value); setDupWarn(null); }} placeholder={type === 'book' ? '例如 活着' : type === 'tv' ? '例如 漫长的季节' : type === 'movie' ? '例如 重庆森林' : '例如 一场演出、一张专辑'} />
      </Field>
      {canLookup && (
        <div className="mb-4 rounded-2xl bg-ink/[0.04] p-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => void findCovers()}
              disabled={!title.trim() || finding || applying}
              className="rounded-lg bg-cinnabar-600 px-3.5 py-1.5 text-[14px] font-medium text-white disabled:opacity-50"
            >
              {finding ? '正在找…' : '联网找封面'}
            </button>
            {candidates !== null && (
              <button onClick={() => setCandidates(null)} className="text-[13px] text-ink/50">
                收起
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink/45">
            {type === 'book'
              ? '按书名从 Open Library 找书封，选中后顺带补作者和年份。'
              : getTmdbKey()
                ? '优先从 TMDB 找海报（演职员最全），同名的都在下面列出来、你点对的那张；选中后顺带补导演、主演和类型。'
                : '按名字从 Bangumi 找海报，同名的都在下面列出来、你点对的那张；选中后还会顺带补导演和主演。想要更全的真人电影海报，可以去「我的」里填一个 TMDB 免费密钥。'}
          </p>
          {lookupMsg && <p className="mt-1.5 text-[12.5px] leading-relaxed text-cinnabar-600">{lookupMsg}</p>}
          {candidates && candidates.length > 0 && (
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {candidates.map((c, i) => (
                <button key={`${c.source}-${i}`} onClick={() => void applyCandidate(c)} disabled={applying} className="text-left disabled:opacity-50">
                  <img src={c.thumbUrl} alt={c.title} className="aspect-[2/3] w-full rounded-lg bg-ink/[0.06] object-cover" loading="lazy" />
                  <span className="mt-1 line-clamp-2 block text-[12px] leading-snug text-ink/80">{c.title}</span>
                  <span className="block text-[11px] text-ink/45">
                    {[c.year, c.creatorLabel, c.sourceLabel].filter(Boolean).join(' · ')}
                  </span>
                </button>
              ))}
            </div>
          )}
          {applying && <p className="mt-1.5 text-[12.5px] text-ink/50">正在下载海报、补资料…</p>}
        </div>
      )}
      <Field label={CREATOR_LABEL[type]}>
        <input aria-label="创作者" className={inputCls} value={creator} onChange={(e) => setCreator(e.target.value)} placeholder={type === 'book' ? '例如 余华' : type === 'tv' ? '例如 辛爽 / 范伟' : type === 'movie' ? '例如 王家卫' : ''} />
      </Field>
      {(type === 'movie' || type === 'tv') && (
        <Field label="主演（可不填）">
          <input aria-label="主演" className={inputCls} value={cast} onChange={(e) => setCast(e.target.value)} placeholder="例如 梁朝伟、林青霞" />
        </Field>
      )}
      {type === 'other' ? (
        <Field label="细分类（可不选）">
          <div className="flex flex-wrap gap-1.5">
            {SUBCATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setSubcategory(subcategory === c ? '' : c)}
                className={`rounded-full px-3 py-1 text-[13px] ${subcategory === c ? 'bg-cinnabar-500 text-white' : 'bg-ink/[0.06] text-ink/70'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>
      ) : (
        <Field label={type === 'book' ? '分类' : '类型'}>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1 text-[13px] ${category === c ? 'bg-cinnabar-500 text-white' : 'bg-ink/[0.06] text-ink/70'}`}
              >
                {c}
              </button>
            ))}
          </div>
          <input aria-label="分类" className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="也可以自己写一个分类" />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label={type === 'book' ? '出版年份' : type === 'tv' ? '播出年份' : type === 'movie' ? '上映年份' : '年份'}>
          <input aria-label="年份" className={inputCls} inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))} placeholder="2023" />
        </Field>
        {type === 'book' && (
          <Field label="总页数">
            <input aria-label="总页数" className={inputCls} inputMode="numeric" value={totalPages} onChange={(e) => setTotalPages(e.target.value.replace(/\D/g, ''))} placeholder="例如 191" />
          </Field>
        )}
        {type === 'movie' && (
          <Field label="片长">
            <DurationInputs min={durationMin} sec={durationSec} onMin={setDurationMin} onSec={setDurationSec} minLabel="片长分钟" secLabel="片长秒" />
          </Field>
        )}
        {type === 'tv' && (
          <Field label="总集数">
            <input aria-label="总集数" className={inputCls} inputMode="numeric" value={totalEpisodes} onChange={(e) => setTotalEpisodes(e.target.value.replace(/\D/g, ''))} placeholder="例如 12" />
          </Field>
        )}
      </div>
      <Field label="状态">
        <Segmented
          ariaLabel="状态"
          value={status}
          onChange={(s) => {
            setStatus(s);
            // 编辑已有作品时手动改了状态 = 以后以手动为准，记记录不再自动改状态（进度照常算）；
            // 新建作品时选的只是起点状态，不锁定，自动联动照常工作。
            if (initial && s !== initial.status) setStatusLocked(true);
          }}
          options={statusOptionsFor(type).map((s) => ({ value: s, label: statusText(type, s) }))}
        />
        {statusLocked ? (
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink/45">
            状态由你手动管理：记记录只会更新进度，不会再自动改状态。
            <button onClick={() => setStatusLocked(false)} className="ml-1 font-medium text-cinnabar-600">恢复自动</button>
          </p>
        ) : (
          initial && (
            <p className="mt-1.5 text-[12.5px] text-ink/45">状态会随记录自动变化（开始、读完/看完都会自动更新）。</p>
          )
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="开始日期">
          <input aria-label="开始日期" type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="完成日期">
          <input aria-label="完成日期" type="date" className={inputCls} value={finishDate} onChange={(e) => setFinishDate(e.target.value)} />
        </Field>
      </div>
      <label className="mb-5 flex items-center justify-between rounded-xl border border-ink/10 bg-card px-3.5 py-3">
        <span className="text-[15px]">印象深刻</span>
        <input aria-label="印象深刻" type="checkbox" className="h-5 w-5 accent-[#a83e21]" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} />
      </label>
      {dupWarn && (
        <div className="mb-3 rounded-xl bg-amber-500/10 px-3.5 py-3 text-[14px] leading-relaxed text-ink/80">
          书架里已经有一部同名的《{dupWarn.title}》（{dupWarn.creator || '未填创作者'}）。记录加错地方会散在两部作品里，确认不是同一部再保存。
          <div className="mt-2 flex gap-2">
            <button onClick={() => void save(true)} className="flex-1 rounded-lg bg-cinnabar-600 py-2 font-semibold text-white">仍要保存</button>
            <button onClick={() => setDupWarn(null)} className="flex-1 rounded-lg bg-ink/[0.06] py-2">先不保存</button>
          </div>
        </div>
      )}
      {error && <p className="mb-3 text-[14px] text-red-600">{error}</p>}
      <button onClick={() => void save()} className="w-full rounded-xl bg-cinnabar-600 py-3 text-[16px] font-semibold text-white active:bg-cinnabar-700">
        保存
      </button>
      {initial && (
        <div className="mt-3">
          <DeleteButton
            label="删除这部作品（连同它的全部记录）"
            onDelete={async () => {
              await deleteWork(initial.id);
              onClose();
            }}
          />
        </div>
      )}
    </Sheet>
  );
}

/* ---------------- 记录表单（一次阅读 / 追剧 / 观影） ---------------- */

const ENTRY_VERB: Record<WorkType, string> = { book: '阅读', tv: '追剧', movie: '观影', other: '记录' };

export function EntryForm({
  open,
  onClose,
  work,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  work: Work;
  initial?: Entry | null;
}) {
  const [date, setDate] = useState(initial?.date ?? todayStr());
  const [page, setPage] = useState(initial?.page ? String(initial.page) : '');
  const [episode, setEpisode] = useState(initial?.episode ? String(initial.episode) : '');
  const [minutes, setMinutes] = useState(initial?.minutes ? String(initial.minutes) : '');
  const [seconds, setSeconds] = useState(initial?.seconds ? String(initial.seconds) : '');
  const [feeling, setFeeling] = useState(initial?.feeling ?? '');
  const [quote, setQuote] = useState(initial?.quote ?? '');
  // 感受/句子默认收起：只记进度时不用面对一堆输入框；编辑已有内容时自动展开
  const [more, setMore] = useState(Boolean(initial?.feeling || initial?.quote));

  async function save() {
    const now = Date.now();
    const dur = splitDuration(minutes, seconds);
    const e: Entry = {
      id: initial?.id ?? newId(),
      workId: work.id,
      date: date || todayStr(),
      page: work.type === 'book' && page ? Number(page) : undefined,
      episode: work.type === 'tv' && episode ? Number(episode) : undefined,
      minutes: dur.minutes,
      seconds: dur.seconds,
      feeling: feeling.trim(),
      quote: quote.trim(),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    // 状态联动统一由 db.syncWorkStatus 按全部记录重新推导，这里只存记录本身
    await putEntry(e);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial ? '编辑记录' : `记一次${ENTRY_VERB[work.type]}`}>
      <p className="mb-4 font-serif text-[15px] text-ink/60">《{work.title}》</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="日期">
          <input aria-label="记录日期" type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {work.type === 'book' && (
          <Field label={`读到第几页${work.totalPages ? `（共 ${work.totalPages} 页）` : ''}`}>
            <input aria-label="读到第几页" className={inputCls} inputMode="numeric" value={page} onChange={(e) => setPage(e.target.value.replace(/\D/g, ''))} placeholder="例如 86" />
          </Field>
        )}
        {work.type === 'tv' && (
          <Field label={`看到第几集${work.totalEpisodes ? `（共 ${work.totalEpisodes} 集）` : ''}`}>
            <input aria-label="看到第几集" className={inputCls} inputMode="numeric" value={episode} onChange={(e) => setEpisode(e.target.value.replace(/\D/g, ''))} placeholder="例如 5" />
          </Field>
        )}
      </div>
      <Field
        label={
          work.type === 'movie'
            ? `时长${work.durationMin || work.durationSec ? `（片长 ${fmtDuration(work.durationMin, work.durationSec)}）` : ''}`
            : work.type === 'book'
              ? '这次读了多久（可不填）'
              : '这次看了多久（可不填）'
        }
      >
        <DurationInputs min={minutes} sec={seconds} onMin={setMinutes} onSec={setSeconds} minLabel="时长分钟" secLabel="时长秒" />
      </Field>
      {more ? (
        <>
          <Field label="当时的想法和感受（可不填）">
            <textarea aria-label="想法和感受" className={`${inputCls} min-h-[96px]`} value={feeling} onChange={(e) => setFeeling(e.target.value)} placeholder="这一段/这一集写了什么、你想到了什么，都可以记下来" />
          </Field>
          <Field label={work.type === 'book' ? '收藏的句子（可不填）' : '喜欢的台词 / 片段（可不填）'}>
            <textarea aria-label="收藏的句子" className={`${inputCls} min-h-[64px]`} value={quote} onChange={(e) => setQuote(e.target.value)} placeholder={work.type === 'book' ? '抄一句打动你的话' : '一句台词，或一个片段的样子'} />
          </Field>
        </>
      ) : (
        <button onClick={() => setMore(true)} className="mb-4 w-full rounded-xl border border-dashed border-ink/15 py-2.5 text-[14px] text-ink/55">
          ＋ 写点感受 / 收藏一句话
        </button>
      )}
      <button onClick={save} className="w-full rounded-xl bg-cinnabar-600 py-3 text-[16px] font-semibold text-white active:bg-cinnabar-700">
        保存记录
      </button>
      {initial && (
        <div className="mt-3">
          <DeleteButton
            label="删除这条记录"
            onDelete={async () => {
              await deleteEntry(initial.id);
              onClose();
            }}
          />
        </div>
      )}
    </Sheet>
  );
}
