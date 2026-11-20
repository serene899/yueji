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
import { processCover } from '../lib/image';
import { todayStr } from '../lib/time';
import { Cover, DeleteButton, Field, Segmented, Sheet, inputCls } from './ui';

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
  const [category, setCategory] = useState(initial?.category ?? '');
  const [subcategory, setSubcategory] = useState(initial?.subcategory ?? '');
  const [year, setYear] = useState(initial?.year ? String(initial.year) : '');
  const [totalPages, setTotalPages] = useState(initial?.totalPages ? String(initial.totalPages) : '');
  const [durationMin, setDurationMin] = useState(initial?.durationMin ? String(initial.durationMin) : '');
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
    const w: Work = {
      id: initial?.id ?? newId(),
      type,
      title: title.trim(),
      creator: creator.trim(),
      category: type === 'other' ? subcategory || '其他' : category.trim() || '其他',
      subcategory: type === 'other' ? subcategory || undefined : undefined,
      year: year ? Number(year) : undefined,
      totalPages: type === 'book' && totalPages ? Number(totalPages) : undefined,
      durationMin: type === 'movie' && durationMin ? Number(durationMin) : undefined,
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
            从相册选一张海报或书封，压缩后只存这台手机里。没有图就用左边这张素封面。
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
      <Field label={CREATOR_LABEL[type]}>
        <input aria-label="创作者" className={inputCls} value={creator} onChange={(e) => setCreator(e.target.value)} placeholder={type === 'book' ? '例如 余华' : type === 'tv' ? '例如 辛爽 / 范伟' : type === 'movie' ? '例如 王家卫' : ''} />
      </Field>
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
          <Field label="片长（分钟）">
            <input aria-label="片长" className={inputCls} inputMode="numeric" value={durationMin} onChange={(e) => setDurationMin(e.target.value.replace(/\D/g, ''))} placeholder="例如 102" />
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
  const [feeling, setFeeling] = useState(initial?.feeling ?? '');
  const [quote, setQuote] = useState(initial?.quote ?? '');
  // 感受/句子默认收起：只记进度时不用面对一堆输入框；编辑已有内容时自动展开
  const [more, setMore] = useState(Boolean(initial?.feeling || initial?.quote));

  async function save() {
    const now = Date.now();
    const e: Entry = {
      id: initial?.id ?? newId(),
      workId: work.id,
      date: date || todayStr(),
      page: work.type === 'book' && page ? Number(page) : undefined,
      episode: work.type === 'tv' && episode ? Number(episode) : undefined,
      minutes: minutes ? Number(minutes) : undefined,
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
        {work.type === 'movie' && (
          <Field label="时长（分钟）">
            <input aria-label="时长分钟" className={inputCls} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} placeholder={work.durationMin ? String(work.durationMin) : '例如 102'} />
          </Field>
        )}
      </div>
      {work.type !== 'movie' && (
        <Field label={work.type === 'book' ? '这次读了多久（分钟，可不填）' : '这次看了多久（分钟，可不填）'}>
          <input aria-label="时长分钟" className={inputCls} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} placeholder="例如 40" />
        </Field>
      )}
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
