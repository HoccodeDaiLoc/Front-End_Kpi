import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactApexChart from 'react-apexcharts';
import { useAuth } from '../../context/AuthContext';
import { getOverview, getTrend, getMyStats } from '../../api/dashboard';
import Header from '../../components/layout/Header';
import { getDepartments } from '../../api/departments';
import Spinner from '../../components/common/Spinner';
import {
  Users, CheckCircle, Clock, Award,
  TrendingUp, Star, Target, ChevronLeft,
  ChevronRight, X
} from 'lucide-react';
import './DashboardPage.scss';
import { formatDate, getScoreLabel, getScoreColor } from '../../utils/helpers';

/* ─── constants ─────────────────────────────────────────── */
const RANK_META = {
  A: { color: '#00D4A0', bg: 'rgba(0,212,160,0.15)',   label: 'Xuất sắc'  },
  B: { color: '#E8192C', bg: 'rgba(232,25,44,0.15)',   label: 'Tốt'       },
  C: { color: '#F4A623', bg: 'rgba(244,166,35,0.15)',  label: 'Khá'       },
  D: { color: '#F472B6', bg: 'rgba(244,114,182,0.15)', label: 'Trung bình'},
  E: { color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', label: 'Kém'       },
};

const DEPT_COLORS = [
  '#E8192C', '#7C8FFF', '#00D4A0', '#F4A623',
  '#F472B6', '#FF6B7A', '#38BDF8', '#A78BFA',
];

const PIE_COLORS = [
  '#00D4A0', '#E8192C', '#F4A623', '#F472B6', '#A78BFA',
];

const generateMonthOptions = () => {
  const opts = [];
  const now  = new Date();
  for (let i = 0; i < 12; i++) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year  = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    opts.push({ value: `${year}-${month}`, label: `Tháng ${month}/${year}` });
  }
  return opts;
};
const MONTH_OPTIONS = generateMonthOptions();

/* ─── tiny helpers ───────────────────────────────────────── */
function RankBadge({ score }) {
  const rank = getScoreLabel(score);
  const meta = RANK_META[rank];
  if (!meta) return null;
  return (
    <span className="rank-badge" style={{ color: meta.color, background: meta.bg }}>
      {rank}
    </span>
  );
}

function ScoreCell({ score }) {
  if (score == null || score === '' || parseFloat(score) === 0)
    return <span className="no-score">—</span>;
  return (
    <span className="score-cell">
      <span className="score-num" style={{ color: getScoreColor(score) }}>
        {parseFloat(score).toFixed(0)}
      </span>
      <RankBadge score={score} />
    </span>
  );
}

/* ─── Gauge (pure SVG) ───────────────────────────────────── */
function GaugeChart({ value = 0, max = 100 }) {
  const pct      = Math.min(Math.max(value / max, 0), 1);
  const angleRad = Math.PI * (1 - pct);
  const rank     = getScoreLabel(value);
  const meta     = RANK_META[rank] || {};
  const needleX  = 80 + 58 * Math.cos(angleRad);
  const needleY  = 82 - 58 * Math.sin(angleRad);

  return (
    <div className="gauge-container">
      <svg viewBox="0 0 160 90" className="gauge-svg">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#E8192C" />
            <stop offset="33%"  stopColor="#F4A623" />
            <stop offset="66%"  stopColor="#00D4A0" />
            <stop offset="100%" stopColor="#7C8FFF" />
          </linearGradient>
        </defs>
        <path d="M 14 82 A 66 66 0 0 1 146 82"
          fill="none" stroke="rgba(0,0,0,0.08)"
          strokeWidth="12" strokeLinecap="round" />
        <path d="M 14 82 A 66 66 0 0 1 146 82"
          fill="none" stroke="url(#gaugeGrad)"
          strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${pct * 207} 207`} />
        <line x1="80" y1="82" x2={needleX} y2={needleY}
          stroke="#E8192C" strokeWidth="2.5" strokeLinecap="round" className="gauge-needle-line" />
        <circle cx="80" cy="82" r="5"   fill="rgba(232,25,44,0.15)" stroke="#E8192C" strokeWidth="1.5" />
        <circle cx="80" cy="82" r="2.5" fill="#E8192C" className="gauge-needle-center" />
        <text x="10"  y="90" fill="rgba(0,0,0,0.25)" fontSize="8">0</text>
        <text x="75"  y="16" fill="rgba(0,0,0,0.25)" fontSize="8">50</text>
        <text x="143" y="90" fill="rgba(0,0,0,0.25)" fontSize="8">100</text>
      </svg>
      <div className="gauge-value">{value?.toFixed(1)}</div>
      {meta.color && (
        <span className="gauge-rank"
          style={{ color: meta.color, background: meta.bg, borderColor: `${meta.color}44` }}>
          {rank} — {meta.label}
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { user }   = useAuth();
  const [overview, setOverview] = useState(null);
  const [trend,    setTrend]    = useState([]);
  const [myStats,  setMyStats]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [depts,    setDepts]    = useState([]);

  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [deptLoading,    setDeptLoading]    = useState(false);

  /* detect mobile once at mount (≤480px) */
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth <= 480
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 480);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const isAdmin    = ['admin','director','chairman','executive'].includes(user?.role);
  const isDirector = user?.role === 'director';
  const isTopAdmin = ['admin','chairman','executive'].includes(user?.role);

  const toDbPeriod = (iso) => {
    if (!iso) return '';
    const [y, m] = iso.split('-');
    return `${parseInt(m)}/${y}`;
  };

  const loadOverview = useCallback(async (period = '') => {
    setDeptLoading(true);
    try {
      const params = period ? { period: toDbPeriod(period) } : {};
      const o = await getOverview(params);
      setOverview(o.data.data);
    } catch (e) { console.error(e); }
    finally { setDeptLoading(false); }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (isAdmin) {
          const [o, t] = await Promise.all([getOverview(), getTrend()]);
          setOverview(o.data.data);
          setTrend(t.data.data);
        }
        const ms = await getMyStats();
        setMyStats(ms.data.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
    getDepartments().then(r => setDepts(r.data.data)).catch(() => {});
  }, [user]);

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    loadOverview(period);
  };

  const navigatePeriod = (dir) => {
    const idx = MONTH_OPTIONS.findIndex(m => m.value === selectedPeriod);
    if (dir === 'prev') {
      const next = idx < MONTH_OPTIONS.length - 1 ? idx + 1 : idx;
      handlePeriodChange(MONTH_OPTIONS[next].value);
    } else {
      if (idx <= 0) handlePeriodChange('');
      else handlePeriodChange(MONTH_OPTIONS[idx - 1].value);
    }
  };

  const selectedLabel = MONTH_OPTIONS.find(m => m.value === selectedPeriod)?.label || 'Tất cả';

  /* ── group/filter helpers ── */
  const filterChildOnly = (stats) => {
    if (!stats?.length || !depts.length) return stats || [];
    return stats.filter(s => {
      const dept = depts.find(d => d.name?.trim() === s.department?.trim());
      return dept?.parentId != null;
    });
  };

  const groupByParent = (stats) => {
    if (!stats?.length || !depts.length) return stats || [];
    const res = {};
    stats.forEach(s => {
      const dept     = depts.find(d => d.name?.trim() === s.department?.trim());
      const parentId = dept?.parentId;
      const parent   = parentId ? depts.find(d => d.id === parentId) : dept;
      const name     = parent?.name || s.department;
      if (!res[name]) res[name] = { total: 0, count: 0 };
      res[name].total += s.avgScore * s.count;
      res[name].count += s.count;
    });
    return Object.entries(res).map(([department, v]) => ({
      department,
      avgScore: Math.round((v.total / v.count) * 100) / 100,
      count: v.count,
    })).sort((a, b) => b.avgScore - a.avgScore);
  };

  const deptStats = overview
    ? (isTopAdmin
        ? groupByParent(overview.departmentStats)
        : isDirector
          ? filterChildOnly(overview.departmentStats)
          : overview.departmentStats
      )?.slice(0, 8)
    : [];

  /* ─── ApexCharts configs ─────────────────────────────── */

  /* 1. Area – trend cá nhân */
  const myTrendOpts = {
    chart: { type: 'area', toolbar: { show: false }, animations: { enabled: true, speed: 800 }, background: 'transparent' },
    stroke: { curve: 'smooth', width: 2.5 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.02,
        stops: [0, 95],
        colorStops: [
          { offset: 0,  color: '#E8192C', opacity: 0.45 },
          { offset: 95, color: '#E8192C', opacity: 0.02 },
        ],
      },
    },
    colors: ['#E8192C'],
    markers: { size: 4, colors: ['#E8192C'], strokeColors: '#1e1b4b', strokeWidth: 2 },
    xaxis: {
      categories: myStats?.trend?.map(t => t.period) || [],
      labels: { style: { colors: 'rgba(0,0,0,0.35)', fontSize: '11px' } },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: {
      min: 0, max: 100, tickAmount: 5,
      labels: { style: { colors: 'rgba(0,0,0,0.35)', fontSize: '11px' } },
    },
    grid: { borderColor: 'rgba(0,0,0,0.06)', strokeDashArray: 4 },
    tooltip: { theme: 'light', y: { formatter: v => `${v} điểm` } },
    legend: { show: false },
    dataLabels: { enabled: false },
  };

  /* 2. Horizontal bar – KPI phòng ban */
  const barOpts = {
    chart: { type: 'bar', toolbar: { show: false }, animations: { enabled: true, speed: 600 }, background: 'transparent' },
    plotOptions: {
      bar: { horizontal: true, borderRadius: 6, barHeight: '60%', distributed: true },
    },
    colors: DEPT_COLORS,
    dataLabels: {
      enabled: true,
      formatter: v => v,
      style: { fontSize: '11px', colors: ['#fff'], fontWeight: 500 },
      offsetX: -4,
    },
    xaxis: {
      min: 0, max: 100,
      categories: deptStats?.map(d => d.department) || [],
      labels: { style: { colors: 'rgba(0,0,0,0.35)', fontSize: '11px' } },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: 'rgba(0,0,0,0.55)', fontSize: '11px' }, maxWidth: 110 } },
    grid: { borderColor: 'rgba(0,0,0,0.06)', xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    tooltip: { theme: 'light', y: { formatter: v => `${v} điểm` } },
    legend: { show: false },
  };

  /* 3. Donut – phân bố xếp loại */
  const distData = overview ? [
    overview.scoreDistribution?.excellent || 0,
    overview.scoreDistribution?.good      || 0,
    overview.scoreDistribution?.fair      || 0,
    overview.scoreDistribution?.average   || 0,
    overview.scoreDistribution?.poor      || 0,
  ] : [];

  const donutOpts = {
    chart: { type: 'donut', animations: { enabled: true, speed: 700 }, background: 'transparent' },
    colors: PIE_COLORS,
    labels: ['A – Xuất sắc', 'B – Tốt', 'C – Khá', 'D – Trung bình', 'E – Kém'],
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true, label: 'Tổng',
              color: 'rgba(0,0,0,0.4)', fontSize: '12px',
              formatter: (w) => w.globals.seriesTotals.reduce((a, b) => a + b, 0),
            },
            value: { color: '#111827', fontSize: '22px', fontWeight: 500 },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    legend: {
      show: !isMobile,
      position: 'bottom',
      fontSize: '11px',
      labels: { colors: 'rgba(0,0,0,0.55)' },
      markers: { width: 8, height: 8, radius: 4 },
      itemMargin: { horizontal: 8 },
    },
    stroke: { width: 0 },
    tooltip: { theme: 'light' },
  };

  /* 4. Area – trend toàn công ty */
  const companyTrendOpts = {
    chart: { type: 'area', toolbar: { show: false }, animations: { speed: 800 }, background: 'transparent' },
    stroke: { curve: 'smooth', width: 2.5 },
    fill: {
      type: 'gradient',
      gradient: {
        colorStops: [
          { offset: 0,  color: '#E8192C', opacity: 0.4  },
          { offset: 90, color: '#E8192C', opacity: 0.02 },
        ],
      },
    },
    colors: ['#E8192C'],
    markers: { size: 4, colors: ['#E8192C'], strokeColors: '#0f172a', strokeWidth: 2 },
    xaxis: {
      categories: trend.map(t => t.period),
      labels: { style: { colors: 'rgba(0,0,0,0.35)', fontSize: '11px' } },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: {
      min: 0, max: 100, tickAmount: 5,
      labels: { style: { colors: 'rgba(0,0,0,0.35)', fontSize: '11px' } },
    },
    grid: { borderColor: 'rgba(0,0,0,0.06)', strokeDashArray: 4 },
    tooltip: { theme: 'light', y: { formatter: v => `${v} điểm` } },
    legend: { show: false },
    dataLabels: { enabled: false },
  };

  /* ─── render ─────────────────────────────────────────── */
  if (loading) return (
    <>
      <Header title="Dashboard" />
      <div className="page-content"><Spinner center /></div>
    </>
  );

  const avatarInitials = (name) =>
    name ? name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() : '??';

  return (
    <div className="db-root">
      <Header
        title="Dashboard"
        subtitle={`Xin chào, ${user?.fullName || user?.email} 👋`}
      />

      <div className="db-page">

        {/* ══ MY STATS ══ */}
        {myStats && (
          <section className="db-section">
            <div className="section-label">Thống kê của tôi</div>
            <div className="stat-grid">
              <StatCard icon={<Target size={18} />}    color="red"
                value={myStats.totalEvaluations}        label="Đánh giá đã làm" />
              <StatCard icon={<Award size={18} />}     color="teal"
                value={<>{myStats.avgScore?.toFixed(1) || '—'}{myStats.avgScore > 0 && <RankBadge score={myStats.avgScore} />}</>}
                label="Điểm TB của tôi" />
              <StatCard icon={<Star size={18} />}      color="amber"
                value={<>{myStats.latestScore != null ? Number(myStats.latestScore).toFixed(1) : '—'}{myStats.latestScore > 0 && <RankBadge score={myStats.latestScore} />}</>}
                label="Điểm gần nhất" />
              <StatCard icon={<TrendingUp size={18} />} color="indigo"
                value={myStats.latestScore > 0 ? getScoreLabel(myStats.latestScore) : '—'}
                label={myStats.latestScore > 0 ? RANK_META[getScoreLabel(myStats.latestScore)]?.label : 'Xếp loại'} />
            </div>

            {myStats?.trend?.length > 0 && (
              <div className="glass-card mt-12">
                <div className="card-head">
                  <span className="card-title">Xu hướng điểm KPI của tôi</span>
                </div>
                <div className="chart-wrap">
                  <ReactApexChart
                    type="area"
                    options={myTrendOpts}
                    series={[{ name: 'Điểm cuối', data: myStats.trend.map(t => t.finalScore) }]}
                    height={180}
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {/* ══ ADMIN OVERVIEW ══ */}
        {overview && isAdmin && (
          <>
            {/* Summary stats */}
            <section className="db-section">
              <div className="section-label">Tổng quan</div>
              <div className="stat-grid">
                <StatCard icon={<Users size={18} />}       color="red"
                  value={overview.summary?.totalUsers}      label="Tổng nhân viên" />
                <StatCard icon={<CheckCircle size={18} />} color="teal"
                  value={overview.summary?.approvedEvals}   label="KPI đã duyệt" />
                <StatCard icon={<Clock size={18} />}       color="amber"
                  value={overview.summary?.pendingEvals}    label="Chờ xử lý" />
                <StatCard icon={<Award size={18} />}       color="indigo"
                  value={<>{overview.summary?.avgScore?.toFixed(1)}{overview.summary?.avgScore > 0 && <RankBadge score={overview.summary.avgScore} />}</>}
                  label={isDirector ? 'Điểm TB phòng ban' : 'Điểm TB toàn công ty'} />
              </div>
            </section>

            {/* Gauge + Donut — 2 cột (desktop & mobile) */}
            <section className="db-section">
              <div className="cards-row-2">
                <div className="glass-card glass-card--red">
                  <div className="card-head">
                    <div>
                      <div className="card-title">Điểm trung bình</div>
                      <div className="card-sub">Toàn công ty</div>
                    </div>
                    {selectedPeriod && <PeriodChip label={selectedLabel} onClear={() => handlePeriodChange('')} />}
                  </div>
                  <GaugeChart value={overview.summary?.avgScore || 0} />
                </div>

                <div className="glass-card glass-card--teal">
                  <div className="card-head">
                    <div>
                      <div className="card-title">Phân bố xếp loại</div>
                      <div className="card-sub">Tất cả kỳ</div>
                    </div>
                    {selectedPeriod && <PeriodChip label={selectedLabel} onClear={() => handlePeriodChange('')} />}
                  </div>
                  {distData.some(v => v > 0) ? (
                    <div className="chart-wrap">
                      <ReactApexChart
                        type="donut"
                        options={donutOpts}
                        series={distData}
                        height={isMobile ? 160 : 230}
                      />
                    </div>
                  ) : (
                    <EmptyChart />
                  )}
                </div>
              </div>
            </section>

            {/* KPI Bar + Company trend — 2 cột trên mobile, full width trên desktop */}
            <section className="db-section">
              <div className="cards-row-2 cards-row-2--charts">

                {/* KPI Bar chart */}
                <div className="glass-card glass-card--indigo">
                  <div className="card-head flex-wrap">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="card-head-icon"><TrendingUp size={16} /></div>
                      <span className="card-title">KPI theo phòng ban</span>
                    </div>
                    <div className="period-controls">
                      <button className="period-nav"
                        disabled={MONTH_OPTIONS.findIndex(m => m.value === selectedPeriod) >= MONTH_OPTIONS.length - 1}
                        onClick={() => navigatePeriod('prev')}>
                        <ChevronLeft size={14} />
                      </button>
                      <select className="period-select"
                        value={selectedPeriod}
                        onChange={e => handlePeriodChange(e.target.value)}>
                        <option value="">Tất cả</option>
                        {MONTH_OPTIONS.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                      <button className="period-nav"
                        disabled={!selectedPeriod}
                        onClick={() => navigatePeriod('next')}>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  {deptLoading && <div className="chart-loading"><Spinner /></div>}

                  {deptStats?.length > 0 ? (
                    <div className="chart-wrap" style={{ position: 'relative' }}>
                      {deptLoading && <div className="chart-overlay" />}
                      <ReactApexChart
                        type="bar"
                        options={barOpts}
                        series={[{ name: 'Điểm TB', data: deptStats.map(d => d.avgScore) }]}
                        height={Math.max(220, deptStats.length * 46 + 60)}
                      />
                    </div>
                  ) : !deptLoading && (
                    <EmptyChart label={selectedPeriod ? `Không có dữ liệu cho ${selectedLabel}` : undefined} />
                  )}
                </div>

                {/* Company trend */}
                {trend.length > 0 && (
                  <div className="glass-card">
                    <div className="card-head">
                      <span className="card-title">Xu hướng KPI toàn công ty</span>
                    </div>
                    <div className="chart-wrap">
                      <ReactApexChart
                        type="area"
                        options={companyTrendOpts}
                        series={[{ name: 'Điểm TB', data: trend.map(t => t.avgScore) }]}
                        height={200}
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Top employees */}
            {overview.topEmployees?.length > 0 && (
              <section className="db-section">
                <div className="glass-card glass-card--amber">
                  <div className="card-head">
                    <span className="card-title">🏆 Top nhân viên</span>
                    {selectedPeriod && <PeriodChip label={selectedLabel} onClear={() => handlePeriodChange('')} />}
                  </div>
                  <div className="top-list">

                    {/* Header row — ẩn trên mobile qua CSS */}
                    <div className="top-row top-row--header">
                      <span className="emp-rank" style={{ visibility: 'hidden' }}>0</span>
                      <div className="emp-avatar" style={{ visibility: 'hidden' }} />
                      <div className="emp-info emp-col-header">Tên nhân viên</div>
                      <div className="emp-col-header emp-meta-col">Phòng ban · Kỳ</div>
                      <div className="emp-col-header emp-score-col">Điểm</div>
                    </div>

                    {overview.topEmployees.slice(0, 3).map((e, i) => (
                      <div key={i} className={`top-row ${i < 3 ? `top-row--${i + 1}` : ''}`}>
                        <span className={`emp-rank rank-${i < 3 ? i + 1 : 'n'}`}>{i + 1}</span>
                        <div className="emp-avatar" style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }}>
                          {avatarInitials(e.fullName)}
                        </div>
                        <div className="emp-info">
                          <div className="emp-name">{e.fullName}</div>
                        </div>
                        <div className="emp-meta-col emp-meta">{e.department || '—'} · {e.period}</div>
                        <ScoreCell score={e.finalTotalScore} />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

/* ─── sub-components ─────────────────────────────────────── */
function StatCard({ icon, color, value, label }) {
  return (
    <div className={`stat-card stat-card--${color}`}>
      <div className="stat-icon" aria-hidden="true">{icon}</div>
      <div className="stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function PeriodChip({ label, onClear }) {
  return (
    <span className="period-chip">
      {label}
      <button className="period-chip__clear" onClick={onClear} aria-label="Xóa lọc">
        <X size={10} />
      </button>
    </span>
  );
}

function EmptyChart({ label = 'Chưa có dữ liệu' }) {
  return <div className="chart-empty">{label}</div>;
}