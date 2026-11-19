import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './lib/db';
import { Home } from './screens/Home';
import { Shelf } from './screens/Shelf';
import { Detail } from './screens/Detail';
import { Year } from './screens/Year';
import { Me } from './screens/Me';
import { WorkForm } from './components/forms';

type Tab = 'home' | 'shelf' | 'year' | 'me';

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
  { key: 'year', label: '年度' },
  { key: 'me', label: '我的' },
];

const TITLES: Record<Tab, string> = { home: '阅迹', shelf: '书架', year: '年度回顾', me: '我的' };

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

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col">
      <header className="pt-safe sticky top-0 z-30 bg-paper/95 backdrop-blur">
        <div className="flex items-baseline justify-between px-5 pb-2 pt-3">
          <span className="font-serif text-[21px] font-bold tracking-wide">
            {detailWork ? '作品详情' : TITLES[tab]}
          </span>
          <span className="font-serif text-[13px] text-cinnabar-600">阅迹 · LIFEOS</span>
        </div>
        <div className="h-px bg-ink/[0.06]" />
      </header>

      <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+92px)] pt-3">
        {detailWork ? (
          <Detail work={detailWork} entries={entryList} onBack={() => setDetailId(null)} />
        ) : tab === 'home' ? (
          <Home works={workList} entries={entryList} onOpenWork={openWork} onAddWork={() => setAddWork(true)} />
        ) : tab === 'shelf' ? (
          <Shelf works={workList} entries={entryList} onOpenWork={openWork} onAddWork={() => setAddWork(true)} />
        ) : tab === 'year' ? (
          <Year works={workList} entries={entryList} onOpenWork={openWork} />
        ) : (
          <Me worksCount={workList.length} entriesCount={entryList.length} />
        )}
      </main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40" aria-label="主导航">
        <div className="mx-auto max-w-[520px] px-4 pb-2">
          <div className="flex rounded-[26px] border border-ink/[0.07] bg-card/90 shadow-[0_10px_30px_rgb(60_40_20/0.12)] backdrop-blur-xl">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => switchTab(t.key)}
                aria-current={tab === t.key && !detailWork ? 'page' : undefined}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 ${tab === t.key && !detailWork ? 'text-cinnabar-600' : 'text-ink/45'}`}
              >
                <TabIcon tab={t.key} active={tab === t.key && !detailWork} />
                <span className={`text-[11.5px] ${tab === t.key && !detailWork ? 'font-semibold' : ''}`}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {addWork && <WorkForm key="add" open onClose={() => setAddWork(false)} />}
    </div>
  );
}
