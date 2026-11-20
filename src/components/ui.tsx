import { useEffect, useState, type ReactNode } from 'react';
import { TYPE_ICON, type Work } from '../lib/types';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-end justify-between px-1 first:mt-0">
      <h2 className="font-serif text-[17px] font-semibold tracking-wide">{children}</h2>
      {right}
    </div>
  );
}

/** 底部弹出层：表单和详情里的操作都用它，iPhone 上单手可达 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="关闭" className="absolute inset-0 bg-black/35" onClick={onClose} />
      <div className="sheet-panel absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-[24px] bg-paper pb-safe shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-paper/95 px-5 pb-2 pt-4 backdrop-blur">
          <h3 className="font-serif text-[18px] font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/5 text-[15px] text-ink/60"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        <div className="px-5 pb-8">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  // 用 div 而非 label 包裹：字段里常有按钮组（分类 chips / 分段选择），
  // 套 label 会污染它们的无障碍名称，也会让点按误触输入框聚焦。
  return (
    <div className="mb-4">
      <span className="mb-1.5 block text-[13px] font-medium text-ink/55">{label}</span>
      {children}
    </div>
  );
}

export const inputCls =
  'w-full rounded-xl border border-ink/10 bg-card px-3.5 py-2.5 text-ink outline-none focus:border-cinnabar-500/60';

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  ariaLabel?: string;
}) {
  return (
    <div className="flex rounded-xl bg-ink/[0.06] p-1" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-[9px] py-1.5 text-[14px] transition ${
            value === o.value ? 'bg-card font-semibold shadow-sm' : 'text-ink/55'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({ value, tone = 'book' }: { value: number; tone?: 'book' | 'movie' | 'tv' }) {
  const color = tone === 'book' ? 'bg-cinnabar-500' : tone === 'tv' ? 'bg-iris-500' : 'bg-indigo2-500';
  return (
    <div className="h-[6px] w-full overflow-hidden rounded-full bg-ink/[0.08]">
      <div
        className={`progress-fill h-full rounded-full ${color}`}
        style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
      />
    </div>
  );
}

/** 无封面时的占位色：书暖（朱砂）、剧蓝紫、电影冷蓝、其他灰褐，低饱和 */
const COVER_HUES: Record<Work['type'], string> = {
  book: 'linear-gradient(150deg,#b6502f,#8c331b)',
  tv: 'linear-gradient(150deg,#7a76cf,#4c49a0)',
  movie: 'linear-gradient(150deg,#4a6ca8,#2f4a7d)',
  other: 'linear-gradient(150deg,#7a6a53,#57492f)',
};

/**
 * 作品封面：有图显示图；没图显示一本「素封面」——类型色打底、宋体标题、
 * 让书架不再只有一行行文字。variant: thumb 小图 / detail 详情大图。
 */
export function Cover({ work, variant = 'thumb' }: { work: Work; variant?: 'thumb' | 'detail' | 'grid' }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!work.cover) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(work.cover);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [work.cover]);

  const size =
    variant === 'detail'
      ? 'h-[184px] w-[138px] rounded-[12px]'
      : variant === 'grid'
        ? 'aspect-[2/3] w-full rounded-[10px]'
        : 'h-[68px] w-[50px] shrink-0 rounded-[6px]';

  if (url) {
    return <img src={url} alt={`《${work.title}》封面`} loading="lazy" className={`cover-img ${size} border border-ink/10 object-cover shadow-sm`} />;
  }
  return (
    <div
      aria-hidden
      className={`${size} flex flex-col items-center justify-between border border-black/10 shadow-sm`}
      style={{ background: COVER_HUES[work.type] }}
    >
      <span className={`${variant === 'thumb' ? 'mt-1.5 text-[10px]' : 'mt-3 text-[15px]'} text-white/85`}>
        {TYPE_ICON[work.type]}
      </span>
      <span
        className={`px-1.5 text-center font-serif font-semibold leading-tight text-white ${
          variant === 'thumb' ? 'text-[10.5px]' : 'text-[16px]'
        }`}
        style={{
          display: '-webkit-box',
          WebkitLineClamp: variant === 'thumb' ? 3 : 4,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {work.title}
      </span>
      <span className={`${variant === 'thumb' ? 'mb-1.5 text-[8px]' : 'mb-3 text-[11px]'} max-w-full truncate px-1 text-white/70`}>
        {work.creator}
      </span>
    </div>
  );
}

export function Empty({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="font-serif text-[15px] text-ink/60">{text}</p>
      {hint && <p className="mt-1 text-[13px] text-ink/40">{hint}</p>}
    </div>
  );
}

/** 两段式删除按钮：点一次变确认，再点才真删，避免误删 */
export function DeleteButton({ onDelete, label = '删除' }: { onDelete: () => void; label?: string }) {
  return (
    <button
      onClick={(e) => {
        const btn = e.currentTarget;
        if (btn.dataset.armed === '1') {
          onDelete();
        } else {
          btn.dataset.armed = '1';
          btn.textContent = '再点一次确认删除';
          setTimeout(() => {
            btn.dataset.armed = '';
            btn.textContent = label;
          }, 2600);
        }
      }}
      className="w-full rounded-xl border border-red-500/25 bg-red-500/[0.06] py-2.5 text-[15px] font-medium text-red-600"
    >
      {label}
    </button>
  );
}
