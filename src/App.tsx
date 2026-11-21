import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './lib/db';
import { Home } from './screens/Home';
import { Shelf } from './screens/Shelf';
import { Records } from './screens/Records';
import { Detail } from './screens/Detail';
import { Year } from './screens/Year';
import { Me } from './screens/Me';
import { WorkForm } from './components/forms';

type Tab = 'home' | 'shelf' | 'records' | 'year' | 'me';

// 底栏图标用内联 SVG：系统字符图标（⌂ ▤ ◔）在不同系统上渲染差异太大，不可靠。
function TabIcon({ tab, active }: { tab: Tab; active: boolean }) {
  const common = {
    width: 21,
    height: 21,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: active ? 2 : 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (tab) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M4 11.2 12 4l8 7.2" />
          <path d="M6.5 9.8V20h11V9.8" />
        </svg>
      );
    case 'shelf':
      return (
        <svg {...common}>
          <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" />
          <path d="M5 19.5A1.5 1.5 0 0 1 6.5 18H19" />
          <path d="M9 7.5h6" />
        </svg>
      );
    case 'records':
      return (
        <svg {...common}>
          <path d="M8 6h12M8 12h12M8 18h12" />
          <circle cx="4" cy="6" r="0.5" fill="currentColor" />
          <circle cx="4" cy="12" r="0.5" fill="currentColor" />
          <circle cx="4" cy="18" r="0.5" fill="currentColor" />
        </svg>
      );
    case 'year':
      return (
        <svg {...common}>
          <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
          <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
        </svg>
      );
    case 'me':
      return (
        <svg {...common}>
          <circle cx="12" cy="8.2" r="3.6" />
          <path d="M5 20c1.2-3.2 3.8-4.6 7-4.6s5.8 1.4 7 4.6" />
        </svg>
      );
  }
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'home', label: '首页' },
  { key: 'shelf', label: '书架' },
  { key: 'records', label: '记录' },
  { key: 'year', label: '回顾' },
  { key: 'me', label: '我的' },
];

const TITLES: Record<Tab, string> = { home: '阅迹', shelf: '书架', records: '记录', year: '年度回顾', me: '我的' };

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [addWork, setAddWork] = useState(false);

  const works = useLiveQuery(() => db.works.toArray(), [], []);
  const entries = useLiveQuery(() => db.entries.toArray(), [], []);
  const workList = useMemo(() => works ?? [], [works]);
  const entryList = useMemo(() => entries ?? [], [entries]);

  const detailWork = detailId ? workList.find((w) => w.id === detailId) : undefined;

  function openWork(id: string) {
    setDetailId(id);
  }
  function switchTab(t: Tab) {
    setTab(t);
    setDetailId(null);
  }

  // ---- 底栏 3D 液态玻璃滑动选择（v0.4.1，沿用生息 v0.4.4 机制）：指针拖动跟随、松手就近吸附、
  // 拖动时指示块按距离拉伸、按速度倾斜，松手由弹簧曲线回弹归位；拖后吞掉紧随的 click ----
  const NAV_PAD = 6;
  const NAV_GAP = 4;
  const DRAG_THRESHOLD = 6;
  const barRef = useRef<HTMLDivElement>(null);
  const [segW, setSegW] = useState(0);
  const [drag, setDragState] = useState<{ x: number; stretch: number; skew: number } | null>(null);
  const dragRef = useRef<{ x: number; stretch: number; skew: number } | null>(null);
  const [pressed, setPressed] = useState(false);
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const suppressClickAt = useRef(0);

  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const measure = () => setSegW(Math.max(0, (el.clientWidth - NAV_PAD * 2 - NAV_GAP * (TABS.length - 1)) / TABS.length));
    measure();
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const step = segW + NAV_GAP;
  const activeIdx = TABS.findIndex((t) => t.key === tab);
  const dragging = drag !== null;
  const pillX = drag ? drag.x : activeIdx * step;
  const pillStretch = drag ? drag.stretch : 1;
  const pillSkew = drag ? drag.skew : 0;

  function setDrag(v: { x: number; stretch: number; skew: number } | null) {
    dragRef.current = v;
    setDragState(v);
  }

  function onNavPointerDown(e: React.PointerEvent) {
    if (!segW || e.button > 0) return;
    setPressed(true);
    const idx = TABS.findIndex((t) => t.key === tabRef.current);
    const d = { startX: e.clientX, baseX: idx * step, moved: false, lastX: e.clientX, lastT: performance.now(), skew: 0 };
    const maxX = (TABS.length - 1) * step;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - d.startX;
      if (Math.abs(dx) > DRAG_THRESHOLD) d.moved = true;
      const now = performance.now();
      const vel = (ev.clientX - d.lastX) / Math.max(1, now - d.lastT); // px/ms
      d.lastX = ev.clientX;
      d.lastT = now;
      // 倾斜跟随速度（平滑后限幅 ±7°）；拉伸跟随已拖距离（上限 +20%）
      d.skew = d.skew * 0.55 + Math.min(7, Math.max(-7, vel * 5)) * 0.45;
      const stretch = 1 + Math.min(1.5, Math.abs(dx) / step) * 0.13;
      setDrag({ x: Math.min(Math.max(d.baseX + dx, 0), maxX), stretch, skew: d.skew });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setPressed(false);
      const cur = dragRef.current;
      setDrag(null);
      if (d.moved && cur && step > 0) {
        suppressClickAt.current = Date.now();
        const target = Math.min(TABS.length - 1, Math.max(0, Math.round(cur.x / step)));
        if (TABS[target].key !== tabRef.current) switchTab(TABS[target].key);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  function onTabClick(t: Tab) {
    if (Date.now() - suppressClickAt.current < 350) return; // 刚拖动过，这次 click 是拖动的尾巴
    switchTab(t);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col">
      <header className="pt-safe sticky top-0 z-30 bg-paper/90 backdrop-blur-xl">
        <div className="flex items-baseline justify-between px-5 pb-2 pt-3">
          <span className="font-serif text-[21px] font-bold tracking-wide">
            {detailWork ? '作品详情' : TITLES[tab]}
          </span>
          <span className="font-serif text-[13px] text-cinnabar-600">阅迹 · LIFEOS</span>
        </div>
        <div className="h-px bg-ink/[0.06]" />
      </header>

      <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+92px)] pt-3">
        <div key={detailWork ? `detail-${detailWork.id}` : tab} className="view-enter">
          {detailWork ? (
            <Detail work={detailWork} entries={entryList} onBack={() => setDetailId(null)} />
          ) : tab === 'home' ? (
            <Home works={workList} entries={entryList} onOpenWork={openWork} onAddWork={() => setAddWork(true)} />
          ) : tab === 'shelf' ? (
            <Shelf works={workList} entries={entryList} onOpenWork={openWork} onAddWork={() => setAddWork(true)} />
          ) : tab === 'records' ? (
            <Records works={workList} entries={entryList} onOpenWork={openWork} />
          ) : tab === 'year' ? (
            <Year works={workList} entries={entryList} onOpenWork={openWork} />
          ) : (
            <Me worksCount={workList.length} entriesCount={entryList.length} />
          )}
        </div>
      </main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40" aria-label="主导航">
        <div className="mx-auto max-w-[520px] px-4 pb-2">
          <div
            ref={barRef}
            className="relative flex gap-1 rounded-[28px] border border-ink/[0.07] bg-card/85 p-1.5 shadow-[0_10px_30px_rgb(60_40_20/0.12)] backdrop-blur-xl"
            style={{ touchAction: 'none' }}
            onPointerDown={onNavPointerDown}
          >
            {/* 3D 液态玻璃指示块：跟随手指（含拉伸/倾斜的液体变形），松手弹簧回弹吸附到选中页 */}
            <div
              aria-hidden
              data-testid="nav-pill"
              className="nav-pill-3d pointer-events-none absolute bottom-1.5 left-1.5 top-1.5 rounded-[22px]"
              style={{
                width: segW ? segW : undefined,
                opacity: segW ? 1 : 0,
                transform: `translateX(${pillX}px) scaleX(${dragging ? pillStretch : pressed ? 1.05 : 1}) scaleY(${dragging ? 1 - (pillStretch - 1) * 0.35 : pressed ? 1.03 : 1}) skewX(${pillSkew}deg)`,
                filter: dragging || pressed ? 'brightness(1.05)' : undefined,
                transition: dragging
                  ? 'none'
                  : pressed
                    ? 'transform 0.18s ease-out, filter 0.18s ease-out'
                    : 'transform 0.5s cubic-bezier(0.34, 1.35, 0.64, 1), filter 0.25s ease-out',
              }}
            >
              <span className="nav-pill-gloss" />
              <span className="nav-pill-caustic" />
            </div>
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => onTabClick(t.key)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative z-10 flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[22px] transition-colors ${active ? 'text-cinnabar-600' : 'text-ink/45'}`}
                >
                  <TabIcon tab={t.key} active={active} />
                  <span className={`text-[11.5px] ${active ? 'font-semibold' : ''}`}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {addWork && <WorkForm key="add" open onClose={() => setAddWork(false)} />}
    </div>
  );
}
