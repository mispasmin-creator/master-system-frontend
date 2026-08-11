'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useOutletContext } from 'react-router-dom';
import { AuthUser } from '@/lib/auth';
import { AuthProvider } from '@/systems/purchase/context/AuthContext';

// Each system's own dashboard is embedded here behind the system-select
// dropdown below, instead of living as a tab inside that system itself.
const PurchaseDashboard = dynamic(() => import('@/systems/purchase/components/Dashboard'), { ssr: false });

const SYSTEM_VIEWS = [
  { value: 'overview', label: 'Overview' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'rm-sales', label: 'RM Sales' },
  { value: 'freight-payment', label: 'Freight Payment' },
] as const;
type SystemView = (typeof SYSTEM_VIEWS)[number]['value'];

type ActivityItem = {
  id: string;
  date: Date | null;
  firmName: string;
  vendorName: string;
  material: string;
  qty: number;
  pendingQty: number;
  hodApproved: boolean;
  factoryApproved: boolean;
  mgmtApproved: boolean;
};

type DashboardContextType = {
  user: AuthUser;
  searchQuery: string;
  poRows: Record<string, unknown>[];
  poLoading: boolean;
  theme: 'light' | 'dark';
  goToPurchase: (hashPath: string) => void;
  pendingApprovals: number;
};

const ACCENT_LIGHT = '#268a59';
const ACCENT_DARK = '#2fa36b';
const FIRM_ACCENTS = [
  { bg: 'bg-[#2fa36b]/10 dark:bg-[#5ec792]/10', text: 'text-[#1b5e41] dark:text-[#a7e3c4]', bar: '#268a59' },
  { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', bar: '#0284c7' },
  { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', bar: '#d97706' },
];
const SAMPLE_WEEK = [3, 2, 4, 7, 5, 4, 3];
const WEEK_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Icons
type IconProps = { className?: string };
const icon = (paths: React.ReactNode) => function Icon({ className }: IconProps) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>; };
const BuildingIcon = icon(<><rect x="4" y="2" width="16" height="20" rx="1" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" /></>);
const ShieldIcon = icon(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />);
const ActivityIcon = icon(<path d="M22 12h-4l-3 9L9 3l-3 9H2" />);
const LogInIcon = icon(<><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></>);
const LayoutIcon = icon(<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></>);
const PackageIcon = icon(<><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73Z" /><path d="M3.3 7 12 12l8.7-5" /><path d="M12 22V12" /></>);
const ClockIcon = icon(<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>);
const TrendUpIcon = icon(<><polyline points="3 17 9 11 13 15 21 7" /><polyline points="14 7 21 7 21 14" /></>);
const TrendDownIcon = icon(<><polyline points="3 7 9 13 13 9 21 17" /><polyline points="21 10 21 17 14 17" /></>);
const ChevronLeftIcon = icon(<path d="m15 18-6-6 6-6" />);
const ChevronRightIcon = icon(<path d="m9 18 6-6-6-6" />);
const ChevronDownIcon = icon(<path d="m6 9 6 6 6-6" />);
const GridIcon = icon(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>);

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
function tokenExpiry(lastLogin: string | null): string {
  if (!lastLogin) return '—';
  const expiry = new Date(new Date(lastLogin).getTime() + 30 * 24 * 60 * 60 * 1000);
  return expiry.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function buildMonthGrid(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const cells: { day: number; inMonth: boolean; isToday: boolean }[] = [];
  for (let i = startOffset - 1; i >= 0; i--) cells.push({ day: daysInPrevMonth - i, inMonth: false, isToday: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, inMonth: true, isToday: d === today.getDate() && month === today.getMonth() && year === today.getFullYear() });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - (startOffset + daysInMonth) + 1, inMonth: false, isToday: false });
  return cells;
}

function WeekActivityChart({ accent, counts, labels = WEEK_LABELS, unitLabel = 'indents' }: { accent: string; counts: number[]; labels?: string[]; unitLabel?: string; }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...counts);
  const peakIndex = counts.reduce((best, v, i) => (v > counts[best] ? i : best), 0);
  return (
    <div className="flex-1 flex justify-between px-1 gap-3 sm:gap-4 h-[130px]">
      {counts.map((v, i) => {
        const isActive = hover === i || (hover === null && i === peakIndex && v > 0);
        const heightPct = Math.max(6, Math.round((v / max) * 100));
        return (
          <div key={i} className="flex flex-col items-center flex-1 gap-3 relative group cursor-pointer" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            {isActive && (
              <div className="absolute -top-9 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] font-bold px-2 py-1 rounded-md whitespace-nowrap">
                {v} {unitLabel}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-100" />
              </div>
            )}
            <div className="w-full max-w-[28px] flex-1 min-h-0 rounded-full flex items-end relative overflow-hidden bg-zinc-100 dark:bg-zinc-800">
              <div className="w-full rounded-full transition-all duration-500" style={{ height: `${heightPct}%`, backgroundColor: isActive ? accent : `${accent}55` }} />
            </div>
            <span className="text-xs font-bold text-zinc-400 shrink-0">{labels[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function GaugeCard({ percent, value, label, sublabel, accent }: { percent: number; value: string; label: string; sublabel: string; accent: string }) {
  const radius = 60;
  const strokeWidth = 12;
  const center = 80;
  const arcLength = Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const dashoffset = arcLength * (1 - clamped / 100);
  return (
    <div className="flex flex-col items-center justify-center relative w-full h-[140px] pt-4">
      <svg width="160" height="100" viewBox="0 0 160 100" className="overflow-visible">
        <path d={`M ${center - radius} 90 A ${radius} ${radius} 0 0 1 ${center + radius} 90`} fill="none" stroke="currentColor" className="text-zinc-100 dark:text-zinc-800" strokeWidth={strokeWidth} strokeLinecap="round" />
        <path d={`M ${center - radius} 90 A ${radius} ${radius} 0 0 1 ${center + radius} 90`} fill="none" stroke={accent} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={arcLength} strokeDashoffset={dashoffset} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div className="absolute top-[52px] flex flex-col items-center">
        <span className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{value}</span>
        <span className="text-[11px] font-medium text-zinc-400 mt-0.5">{label}</span>
      </div>
      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mt-4 text-center px-4">{sublabel}</p>
    </div>
  );
}

function FirmCard({ firm, index, accentSolid }: { firm: any; index: number; accentSolid: string }) {
  const tone = FIRM_ACCENTS[index % FIRM_ACCENTS.length];
  const completedPct = firm.total ? Math.round(((firm.total - firm.pending) / firm.total) * 100) : 0;
  return (
    <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col gap-5 transition-colors duration-500">
      <div className="flex items-start gap-4">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone.bg}`}>
          <BuildingIcon className={`w-5 h-5 ${tone.text}`} />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold tracking-tight text-zinc-900 dark:text-white truncate" title={firm.name}>{firm.name}</h3>
          <p className="text-xs text-zinc-400 font-semibold mt-0.5">{firm.total} indent{firm.total === 1 ? '' : 's'} raised</p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-zinc-700 dark:text-zinc-300 font-bold border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-1.5"><PackageIcon className="w-4 h-4 text-zinc-400" /> {firm.total} total</div>
        <div className="flex items-center gap-1.5"><ClockIcon className="w-4 h-4 text-zinc-400" /> {firm.pending} pending</div>
      </div>
      <div>
        <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 mb-2">
          <span>Completed</span>
          <span className="text-zinc-900 dark:text-white">{completedPct}%</span>
        </div>
        <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${completedPct}%`, backgroundColor: accentSolid }} />
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ item, accentSolid, onAction }: { item: ActivityItem; accentSolid: string; onAction: () => void }) {
  const doneCount = [item.hodApproved, item.factoryApproved, item.mgmtApproved].filter(Boolean).length;
  const pct = Math.round((doneCount / 3) * 100);
  const isComplete = item.pendingQty === 0;
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 p-3 px-4 sm:px-5 flex items-center gap-4 flex-wrap transition-colors duration-500">
      <div className="flex items-center gap-3.5 w-full sm:w-[220px] min-w-0">
        <span className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
          <PackageIcon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">{item.vendorName}</h3>
          <p className="text-xs text-zinc-400 font-semibold mt-0.5 truncate">{item.material}</p>
        </div>
      </div>
      <div className="flex flex-col w-[100px] shrink-0">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Date</span>
        <span className="text-xs font-bold text-zinc-900 dark:text-white">
          {item.date ? item.date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : '—'}
        </span>
      </div>
      <div className="flex flex-col w-[110px] shrink-0">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Firm</span>
        <span className="text-xs font-bold text-zinc-900 dark:text-white truncate" title={item.firmName}>{item.firmName}</span>
      </div>
      <div className="flex items-center gap-2.5 w-[110px] shrink-0">
        <span className="text-xs font-bold text-zinc-900 dark:text-white">{pct}%</span>
        <div className="flex-1 h-[5px] bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: accentSolid }} />
        </div>
      </div>
      <button
        onClick={onAction}
        className={`ml-auto px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 ${
          isComplete ? 'text-zinc-900 dark:text-white border-2 border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700' : 'text-white shadow-sm hover:opacity-90'
        }`}
        style={isComplete ? undefined : { backgroundColor: accentSolid }}
      >
        {isComplete ? 'View' : 'Approve'}
      </button>
    </div>
  );
}

export default function Overview() {
  const context = useOutletContext<DashboardContextType>();

  if (!context) return null;
  const { user, searchQuery, poRows, poLoading, theme, goToPurchase } = context;

  const [calendarCursor, setCalendarCursor] = useState<{ year: number; month: number } | null>(null);
  const [systemView, setSystemView] = useState<SystemView>('overview');
  const [systemMenuOpen, setSystemMenuOpen] = useState(false);

  const accent = theme === 'dark' ? ACCENT_DARK : ACCENT_LIGHT;

  const purchaseRows: ActivityItem[] = poRows.map((row: any) => {
    const ts = row['Timestamp'];
    const date = ts ? new Date(ts) : null;
    return {
      id: row['Indent Id.'] || '',
      date: date && !isNaN(date.getTime()) ? date : null,
      firmName: row['Firm Name'] || 'Unassigned',
      vendorName: row['Vendor'] || row['Vendor name'] || 'Unknown vendor',
      material: row['Material'] || row['Raw Material Name'] || 'Material',
      qty: Number.parseFloat(row['Quantity'] || row['Total Quantity'] || '0') || 0,
      pendingQty: Number.parseFloat(row['Pending PO Qty'] ?? row['Quantity'] ?? row['Total Quantity'] ?? '0') || 0,
      hodApproved: Boolean(row['Actual1']),
      factoryApproved: Boolean(row['Actual7']),
      mgmtApproved: Boolean(row['Actual8']),
    };
  }).filter((r) => r.id && (!user.firm_name || user.firm_name === 'All' || r.firmName === user.firm_name));

  const uniqueIndents = Array.from(new Map(purchaseRows.map((r) => [r.id, r])).values());
  const now = new Date();
  
  const inMonth = (d: Date | null, monthsAgo: number) => {
    if (!d) return false;
    const target = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth();
  };
  const monthOverMonthPct = (predicate: (r: ActivityItem) => boolean) => {
    const cur = uniqueIndents.filter((r) => inMonth(r.date, 0) && predicate(r)).length;
    const prev = uniqueIndents.filter((r) => inMonth(r.date, 1) && predicate(r)).length;
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  };

  const totalIndents = uniqueIndents.length;
  const completedPOs = uniqueIndents.filter((r) => r.pendingQty === 0).length;

  const firmTotals = new Map<string, any>();
  uniqueIndents.forEach((r) => {
    const entry = firmTotals.get(r.firmName) || { name: r.firmName, total: 0, pending: 0 };
    entry.total += 1;
    if (r.pendingQty > 0) entry.pending += 1;
    firmTotals.set(r.firmName, entry);
  });
  const firmBreakdown = Array.from(firmTotals.values()).sort((a, b) => b.total - a.total).slice(0, 3);

  const pipelineStages = [
    { label: 'HOD Approval', done: uniqueIndents.filter((r) => r.hodApproved).length, total: uniqueIndents.length, dot: 'bg-[#2fa36b] dark:bg-[#5ec792]' },
    { label: 'Factory Approval', done: uniqueIndents.filter((r) => r.factoryApproved).length, total: uniqueIndents.length, dot: 'bg-sky-500' },
    { label: 'Management Approval', done: uniqueIndents.filter((r) => r.mgmtApproved).length, total: uniqueIndents.length, dot: 'bg-amber-500' },
  ];

  const approvalRatePct = uniqueIndents.length ? Math.round((uniqueIndents.filter((r) => r.hodApproved && r.factoryApproved && r.mgmtApproved).length / uniqueIndents.length) * 100) : 0;

  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const weekCounts = WEEK_LABELS.map((_, i) => {
    const dayStart = new Date(startOfWeek);
    dayStart.setDate(startOfWeek.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);
    return uniqueIndents.filter((r) => r.date && r.date >= dayStart && r.date < dayEnd).length;
  });
  const hasWeekData = weekCounts.some((v) => v > 0);
  const prevWeekStart = new Date(startOfWeek);
  prevWeekStart.setDate(startOfWeek.getDate() - 7);
  const prevWeekCount = uniqueIndents.filter((r) => r.date && r.date >= prevWeekStart && r.date < startOfWeek).length;
  const thisWeekCount = weekCounts.reduce((a, b) => a + b, 0);
  const weekPct = prevWeekCount === 0 ? (thisWeekCount > 0 ? 100 : 0) : Math.round(((thisWeekCount - prevWeekCount) / prevWeekCount) * 100);

  const recentActivity = uniqueIndents.filter((r) => r.date).sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime()).slice(0, 6);
  const filteredActivity = searchQuery.trim() ? recentActivity.filter((r) => r.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) || r.material.toLowerCase().includes(searchQuery.toLowerCase()) || r.firmName.toLowerCase().includes(searchQuery.toLowerCase())) : recentActivity;

  const cursor = calendarCursor ?? { year: now.getFullYear(), month: now.getMonth() };
  const monthCells = buildMonthGrid(cursor.year, cursor.month);
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const statTiles = [
    { label: 'Role', value: user.role, icon: ShieldIcon },
    { label: 'Access Level', value: user.page_access || 'Standard', icon: LayoutIcon },
    { label: 'Firm', value: user.firm_name || '—', icon: BuildingIcon },
    { label: 'Last Login', value: user.last_login ? new Date(user.last_login).toLocaleString() : 'First login', icon: ActivityIcon },
  ];
  const detailRows = [
    { label: 'User ID', value: `#${user.id}` },
    { label: 'Username', value: user.username },
    { label: 'Session', value: 'Active' },
    { label: 'Token expires', value: tokenExpiry(user.last_login) },
  ];

  return (
    <div>
      {/* System selector — pick which system's dashboard to view here */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
          {systemView === 'overview' ? 'Overview' : 'Purchase Dashboard'}
        </h1>
        <div className="relative shrink-0">
          <button
            onClick={() => setSystemMenuOpen((o) => !o)}
            className="flex items-center gap-2.5 h-10 pl-3.5 pr-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:border-primary/40 transition-colors"
          >
            <GridIcon className="w-4 h-4 text-primary" />
            {SYSTEM_VIEWS.find((s) => s.value === systemView)?.label}
            <ChevronDownIcon className={`w-4 h-4 text-zinc-400 transition-transform ${systemMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {systemMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSystemMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 py-1.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl z-50 overflow-hidden">
                {SYSTEM_VIEWS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => { setSystemView(s.value); setSystemMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium transition-colors ${
                      systemView === s.value
                        ? 'bg-brand-soft text-[#1b5e41] dark:text-[#a7e3c4]'
                        : 'text-zinc-600 dark:text-zinc-300 hover:bg-surface dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {systemView === 'purchase' ? (
        <AuthProvider>
          <PurchaseDashboard />
        </AuthProvider>
      ) : systemView === 'rm-sales' ? (
        <div className="p-4">
          <button
            onClick={() => window.location.assign('/rm-sales')}
            className="px-6 py-3 bg-[#2fa36b] text-white font-bold rounded-2xl shadow-md hover:bg-[#268a59] transition-all"
          >
            Launch RM Sales Portal →
          </button>
        </div>
      ) : systemView === 'freight-payment' ? (
        <div className="p-4">
          <button
            onClick={() => window.location.assign('/freight-payment')}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-md hover:bg-blue-700 transition-all"
          >
            Launch Freight Payment Portal →
          </button>
        </div>
      ) : (
    <div className="flex flex-col xl:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[17px] font-bold text-zinc-900 dark:text-white">Purchasing by firm</h2>
            <button onClick={() => goToPurchase('/po-history')} className="text-zinc-400 text-xs font-semibold flex items-center gap-1 hover:text-[#1b5e41] dark:hover:text-[#a7e3c4]">
              View all <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
          {firmBreakdown.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-8 text-center text-sm text-zinc-400">
              {poLoading ? 'Loading purchase data…' : 'No purchase data yet — raise an indent to get started.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {firmBreakdown.map((firm, i) => <FirmCard key={firm.name} firm={firm} index={i} accentSolid={accent} />)}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 mt-6">
          <section className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 p-6 flex flex-col transition-colors duration-500">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <div>
                <h2 className="text-[17px] font-bold text-zinc-900 dark:text-white">Purchase Activity</h2>
                <div className="flex items-center gap-1 mt-1 text-xs text-zinc-400 font-semibold">
                  {weekPct >= 0 ? <TrendUpIcon className="w-3.5 h-3.5 text-emerald-500" /> : <TrendDownIcon className="w-3.5 h-3.5 text-red-500" />}
                  <span className={weekPct >= 0 ? 'text-emerald-500' : 'text-red-500'}>{Math.abs(weekPct)}%</span>
                  {weekPct >= 0 ? ' increase' : ' decrease'} than last week
                </div>
              </div>
            </div>
            <WeekActivityChart accent={accent} counts={hasWeekData ? weekCounts : SAMPLE_WEEK} />
          </section>
          <section className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 p-6 flex flex-col transition-colors duration-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-bold text-zinc-900 dark:text-white">Approval Rate</h2>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <GaugeCard percent={approvalRatePct} value={`${approvalRatePct}%`} label="Fully cleared" sublabel={`${completedPOs} of ${totalIndents || 0} indents fully processed`} accent={accent} />
            </div>
          </section>
        </div>

        <section className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[17px] font-bold text-zinc-900 dark:text-white">Recent purchase activity</h2>
            <button onClick={() => goToPurchase('/po-history')} className="text-zinc-400 text-xs font-semibold flex items-center gap-1 hover:text-[#1b5e41] dark:hover:text-[#a7e3c4]">
              View all <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
          {filteredActivity.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-8 text-center text-sm text-zinc-400">
              {poLoading ? 'Loading recent activity…' : searchQuery ? 'No activity matches your search.' : 'No recent purchase activity yet.'}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredActivity.map((item) => (
                <ActivityRow key={item.id} item={item} accentSolid={accent} onAction={() => goToPurchase(item.pendingQty === 0 ? '/po-history' : '/stock-approval')} />
              ))}
            </div>
          )}
        </section>

        <h2 className="mt-10 text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Your account</h2>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statTiles.map(({ label, value, icon: TileIcon }) => (
            <div key={label} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] transition-colors duration-500">
              <div className="flex items-center gap-2 text-zinc-400">
                <TileIcon className="w-4 h-4" />
                <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
              </div>
              <p className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50 capitalize truncate">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] transition-colors duration-500">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-4">Details</h3>
            <div className="space-y-3">
              {detailRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">{row.label}</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                    {row.label === 'Session' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] transition-colors duration-500">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-4">Recent activity</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#2fa36b]/10 dark:bg-[#5ec792]/10 text-[#1b5e41] dark:text-[#a7e3c4] flex items-center justify-center shrink-0">
                  <LayoutIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-zinc-700 dark:text-zinc-200">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">{user.username}</span> opened the dashboard
                  </p>
                  <p className="text-xs text-zinc-400">Just now</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#2fa36b]/10 dark:bg-[#5ec792]/10 text-[#1b5e41] dark:text-[#a7e3c4] flex items-center justify-center shrink-0">
                  <LogInIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-zinc-700 dark:text-zinc-200">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">{user.username}</span> signed in
                  </p>
                  <p className="text-xs text-zinc-400">{timeAgo(user.last_login)}</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <aside className="w-full xl:w-[300px] shrink-0 flex flex-col gap-6">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-5 transition-colors duration-500">
          <div className="flex items-center justify-between mb-6 px-1">
            <button onClick={() => setCalendarCursor({ year: cursor.month === 0 ? cursor.year - 1 : cursor.year, month: cursor.month === 0 ? 11 : cursor.month - 1 })} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-zinc-900 dark:text-white">{monthLabel}</span>
            <button onClick={() => setCalendarCursor({ year: cursor.month === 11 ? cursor.year + 1 : cursor.year, month: cursor.month === 11 ? 0 : cursor.month + 1 })} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-bold text-zinc-400 mb-4">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-3 text-center text-xs font-bold text-zinc-900 dark:text-white">
            {monthCells.map((cell, i) => (
              <div key={i} className={!cell.inMonth ? 'text-zinc-300 dark:text-zinc-700' : ''}>
                {cell.isToday ? <span className="relative z-10 flex items-center justify-center w-6 h-6 mx-auto bg-[#2fa36b] dark:bg-[#5ec792] text-white dark:text-zinc-900 rounded-full">{cell.day}</span> : cell.day}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-5 transition-colors duration-500">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[17px] font-bold text-zinc-900 dark:text-white">Approval pipeline</h2>
          </div>
          <div className="flex flex-col gap-5">
            {pipelineStages.map((s) => {
              const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
              return (
                <div key={s.label} className="flex gap-4">
                  <div className="relative mt-1.5 shrink-0">
                    <div className={`w-[9px] h-[9px] rounded-full ${s.dot}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight mb-1">{s.label}</h4>
                    <p className="text-xs text-zinc-400 font-semibold">{s.done}/{s.total} cleared · {pct}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
      )}
    </div>
  );
}
