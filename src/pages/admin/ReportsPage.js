import React, { useState, useEffect, useCallback } from 'react';
import ReactApexChart from 'react-apexcharts';
import Header from '../../components/layout/Header';
import { getOverview, getTrend } from '../../api/dashboard';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getScoreColor, getScoreLabel } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import { getDepartments } from '../../api/departments';
import Spinner from '../../components/common/Spinner';
import './ReportsPage.scss';

/* ─── constants — đồng bộ 100% với DashboardPage ─────────── */
const RANK_META = {
  A: { color: '#00D4A0', bg: 'rgba(0,212,160,0.15)',   label: 'Xuất sắc'   },
  B: { color: '#E8192C', bg: 'rgba(232,25,44,0.15)',   label: 'Tốt'        },
  C: { color: '#F4A623', bg: 'rgba(244,166,35,0.15)',  label: 'Khá'        },
  D: { color: '#F472B6', bg: 'rgba(244,114,182,0.15)', label: 'Trung bình' },
  E: { color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', label: 'Kém'        },
};

const DEPT_COLORS = [
  '#E8192C', '#7C8FFF', '#00D4A0', '#F4A623',
  '#F472B6', '#FF6B7A', '#38BDF8', '#A78BFA',
];

const PIE_COLORS = ['#00D4A0', '#E8192C', '#F4A623', '#F472B6', '#A78BFA'];
const WORKFLOW_COLORS = ['#7C8FFF', '#00D4A0', '#F4A623', '#E8192C', '#F472B6'];

const generateMonthOptions = () => {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    opts.push({ value: `${year}-${month}`, label: `Tháng ${month}/${year}` });
  }
  return opts;
};
const MONTH_OPTIONS = generateMonthOptions();

const toDbPeriod = (iso) => {
  if (!iso) return '';
  const [y, m] = iso.split('-');
  return `${parseInt(m)}/${y}`;
};

/* ─── sub-components ─────────────────────────────────────── */
function PeriodChip({ label, onClear }) {
  return (
    <span className="rp-period-chip">
      {label}
      <button className="rp-period-chip__clear" onClick={onClear} aria-label="Xóa lọc">
        <X size={10} />
      </button>
    </span>
  );
}

function EmptyChart({ label = 'Chưa có dữ liệu' }) {
  return <div className="rp-chart-empty">{label}</div>;
}

function RankCircle({ index }) {
  const classes = ['rp-rank-1', 'rp-rank-2', 'rp-rank-3', 'rp-rank-n'];
  return (
    <div className={`rp-rank-circle ${classes[Math.min(index, 3)]}`}>
      {index + 1}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function ReportsPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [depts, setDepts] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');

  const isTopAdmin = ['admin', 'chairman', 'executive'].includes(user?.role);
  const isDirector = user?.role === 'director';

  const loadOverview = useCallback(async (month = '') => {
    setOverviewLoading(true);
    try {
      const params = month ? { period: toDbPeriod(month) } : {};
      const o = await getOverview(params);
      setOverview(o.data.data);
    } catch {
      toast.error('Lỗi tải báo cáo');
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadTrend = useCallback(async () => {
    try {
      const t = await getTrend({ year });
      setTrend(t.data.data);
    } catch {}
  }, [year]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadOverview(''), loadTrend()]);
      setLoading(false);
    };
    init();
    getDepartments().then(r => setDepts(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => { loadTrend(); }, [year]);

  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    loadOverview(month);
  };

  const navigateMonth = (dir) => {
    const idx = MONTH_OPTIONS.findIndex(m => m.value === selectedMonth);
    if (dir === 'prev') {
      const next = idx < MONTH_OPTIONS.length - 1 ? idx + 1 : idx;
      handleMonthChange(MONTH_OPTIONS[next].value);
    } else {
      if (idx <= 0) handleMonthChange('');
      else handleMonthChange(MONTH_OPTIONS[idx - 1].value);
    }
  };

  const selectedLabel = MONTH_OPTIONS.find(m => m.value === selectedMonth)?.label || 'Tất cả';

  /* ── group/filter helpers ── */
  const groupByParent = (stats) => {
    if (!stats?.length || !depts.length) return stats || [];
    const res = {};
    stats.forEach(s => {
      const dept = depts.find(d => d.name?.trim() === s.department?.trim());
      const parentId = dept?.parentId;
      const parent = parentId ? depts.find(d => d.id === parentId) : dept;
      const name = parent?.name || s.department;
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

  const filterChildOnly = (stats) => {
    if (!stats?.length || !depts.length) return stats || [];
    return stats.filter(s => {
      const dept = depts.find(d => d.name?.trim() === s.department?.trim());
      return dept?.parentId != null;
    });
  };

  const deptStats = overview
    ? (isTopAdmin
        ? groupByParent(overview.departmentStats)
        : isDirector
          ? filterChildOnly(overview.departmentStats)
          : overview.departmentStats
      )?.slice(0, 8)
    : [];

  /* ─── ApexCharts configs — LIGHT MODE ───────────────────── */

  /* 1. Horizontal Bar — KPI phòng ban */
  const barOpts = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      animations: { enabled: true, speed: 600 },
      background: 'transparent',
    },
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
      labels: { style: { colors: '#9ca3af', fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: '#6b7280', fontSize: '11px' }, maxWidth: 130 },
    },
    grid: {
      borderColor: 'rgba(0,0,0,0.06)',
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (v, { dataPointIndex }) => {
          const count = deptStats?.[dataPointIndex]?.count;
          return `${v} điểm${count != null ? ` (${count} đánh giá)` : ''}`;
        },
      },
    },
    legend: { show: false },
  };

  /* 2. Donut — phân bố xếp loại */
  const distData = overview ? [
    overview.scoreDistribution?.excellent || 0,
    overview.scoreDistribution?.good      || 0,
    overview.scoreDistribution?.fair      || 0,
    overview.scoreDistribution?.average   || 0,
    overview.scoreDistribution?.poor      || 0,
  ] : [];

  const donutOpts = {
    chart: {
      type: 'donut',
      animations: { enabled: true, speed: 700 },
      background: 'transparent',
      width: '100%',
    },
    colors: PIE_COLORS,
    labels: ['A – Xuất sắc', 'B – Tốt', 'C – Khá', 'D – Trung bình', 'E – Kém'],
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Tổng',
              color: '#9ca3af',
              fontSize: '12px',
              formatter: (w) => w.globals.seriesTotals.reduce((a, b) => a + b, 0),
            },
            value: { color: '#111827', fontSize: '20px', fontWeight: 500 },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    legend: {
      position: 'bottom',
      fontSize: '11px',
      labels: { colors: '#6b7280' },
      markers: { width: 8, height: 8, radius: 4 },
      itemMargin: { horizontal: 6, vertical: 4 },
    },
    stroke: { width: 0 },
    tooltip: { theme: 'light' },
  };

  /* 3. Bar — trạng thái duyệt */
  const workflowRaw = overview
    ? Object.entries(overview.workflowStats || {}).map(([status, count]) => ({
        name: status === 'draft'             ? 'Nháp'
            : status === 'submitted'         ? 'Đã nộp'
            : status === 'manager_reviewed'  ? 'QL duyệt'
            : status === 'director_approved' ? 'Phê duyệt'
            : 'Từ chối',
        count,
      }))
    : [];

  const workflowOpts = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      animations: { enabled: true, speed: 600 },
      background: 'transparent',
      width: '100%',
    },
    plotOptions: {
      bar: { borderRadius: 6, columnWidth: '50%', distributed: true },
    },
    colors: WORKFLOW_COLORS,
    dataLabels: {
      enabled: true,
      offsetY: -4,
      style: { fontSize: '11px', colors: ['#fff'], fontWeight: 600 },
    },
    xaxis: {
      categories: workflowRaw.map(w => w.name),
      labels: {
        style: { colors: '#9ca3af', fontSize: '11px' },
        trim: true,
        maxHeight: 40,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: '#9ca3af', fontSize: '11px' } },
      tickAmount: 5,
    },
    grid: {
      borderColor: 'rgba(0,0,0,0.06)',
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
      padding: { left: 0, right: 0 },
    },
    tooltip: { theme: 'light', y: { formatter: v => `${v} đánh giá` } },
    legend: { show: false },
  };

  /* 4. Area — xu hướng KPI */
  const trendOpts = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      animations: { enabled: true, speed: 800 },
      background: 'transparent',
    },
    stroke: { curve: 'smooth', width: 2.5 },
    fill: {
      type: 'gradient',
      gradient: {
        colorStops: [
          { offset: 0,  color: '#E8192C', opacity: 0.20 },
          { offset: 90, color: '#E8192C', opacity: 0.02 },
        ],
      },
    },
    colors: ['#E8192C'],
    markers: { size: 4, colors: ['#E8192C'], strokeColors: '#ffffff', strokeWidth: 2 },
    xaxis: {
      categories: trend.map(t => t.period),
      labels: { style: { colors: '#9ca3af', fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: 0, max: 100, tickAmount: 5,
      labels: { style: { colors: '#9ca3af', fontSize: '11px' } },
    },
    grid: { borderColor: 'rgba(0,0,0,0.06)', strokeDashArray: 4 },
    tooltip: { theme: 'light', y: { formatter: v => `${parseFloat(v).toFixed(2)} điểm` } },
    dataLabels: { enabled: false },
    legend: { show: false },
  };

  /* ─── helpers ─────────────────────────────────────────── */
  const avatarInitials = (name) =>
    name ? name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() : '??';

  /* ─── render ─────────────────────────────────────────── */
  if (loading) return (
    <>
      <Header title="Báo cáo & Thống kê" />
      <div className="page-content"><Spinner center /></div>
    </>
  );

  return (
    <div className="rp-root">
      <Header
        title="Báo cáo & Thống kê"
        subtitle="Tổng hợp hiệu suất toàn công ty"
        actions={
          <div className="rp-header-actions">
            <div className="rp-period-controls">
              <button
                className="rp-period-nav"
                disabled={MONTH_OPTIONS.findIndex(m => m.value === selectedMonth) >= MONTH_OPTIONS.length - 1}
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft size={14} />
              </button>
              <select
                className="rp-period-select"
                value={selectedMonth}
                onChange={e => handleMonthChange(e.target.value)}
              >
                <option value="">Tất cả tháng</option>
                {MONTH_OPTIONS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <button
                className="rp-period-nav"
                disabled={!selectedMonth}
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <select
              className="rp-period-select rp-year-select"
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
            >
              {[2022, 2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        }
      />

      <div className="rp-page">
        {overviewLoading && (
          <div className="rp-overlay">
            <Spinner />
          </div>
        )}

        {overview && (
          <>
            {/* ══ KPI phòng ban ══ */}
            <section className="rp-section">
              <div className="rp-glass-card">
                <div className="rp-card-head flex-wrap">
                  <span className="rp-card-title">Điểm KPI trung bình theo phòng ban</span>
                  {selectedMonth && (
                    <PeriodChip label={selectedLabel} onClear={() => handleMonthChange('')} />
                  )}
                </div>
                {deptStats?.length > 0 ? (
                  <div className="rp-chart-wrap">
                    <ReactApexChart
                      type="bar"
                      options={barOpts}
                      series={[{ name: 'Điểm TB', data: deptStats.map(d => d.avgScore) }]}
                      height={Math.max(220, deptStats.length * 46 + 60)}
                    />
                  </div>
                ) : (
                  <EmptyChart label={selectedMonth ? `Không có dữ liệu cho ${selectedLabel}` : undefined} />
                )}
              </div>
            </section>

            {/* ══ Donut + Workflow ══ */}
            <section className="rp-section">
              <div className="rp-cards-row-2">
                <div className="rp-glass-card">
                  <div className="rp-card-head">
                    <span className="rp-card-title">Phân bố xếp loại</span>
                    {selectedMonth && (
                      <PeriodChip label={selectedLabel} onClear={() => handleMonthChange('')} />
                    )}
                  </div>
                  {distData.some(v => v > 0) ? (
                    <div className="rp-chart-wrap">
                      <ReactApexChart
                        type="donut"
                        options={donutOpts}
                        series={distData}
                        height={260}
                      />
                    </div>
                  ) : (
                    <EmptyChart />
                  )}
                </div>

                <div className="rp-glass-card">
                  <div className="rp-card-head">
                    <span className="rp-card-title">Trạng thái duyệt</span>
                    {selectedMonth && (
                      <PeriodChip label={selectedLabel} onClear={() => handleMonthChange('')} />
                    )}
                  </div>
                  {workflowRaw.length > 0 ? (
                    <div className="rp-chart-wrap">
                      <ReactApexChart
                        type="bar"
                        options={workflowOpts}
                        series={[{ name: 'Số đánh giá', data: workflowRaw.map(w => w.count) }]}
                        height={240}
                      />
                    </div>
                  ) : (
                    <EmptyChart />
                  )}
                </div>
              </div>
            </section>

            {/* ══ Xu hướng KPI ══ */}
            {trend.length > 0 && (
              <section className="rp-section">
                <div className="rp-glass-card">
                  <div className="rp-card-head">
                    <span className="rp-card-title">Xu hướng KPI toàn công ty — Năm {year}</span>
                    <span className="rp-note">* Không áp dụng lọc tháng</span>
                  </div>
                  <div className="rp-chart-wrap">
                    <ReactApexChart
                      type="area"
                      options={trendOpts}
                      series={[{ name: 'Điểm TB', data: trend.map(t => t.avgScore) }]}
                      height={220}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* ══ Top nhân viên ══ */}
            {overview.topEmployees?.length > 0 && (
              <section className="rp-section">
                <div className="rp-glass-card">
                  <div className="rp-card-head">
                    <span className="rp-card-title">🏆 Top nhân viên xuất sắc</span>
                    {selectedMonth && (
                      <PeriodChip label={selectedLabel} onClear={() => handleMonthChange('')} />
                    )}
                  </div>

                  {/* Desktop table */}
                  <div className="rp-table-wrap">
                    <table className="rp-table">
                      <thead>
                        <tr>
                          <th>Hạng</th>
                          <th>Nhân viên</th>
                          <th>Phòng ban</th>
                          <th>Chức vụ</th>
                          <th>Kỳ</th>
                          <th>Điểm</th>
                          <th>Xếp loại</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.topEmployees.slice(0, 3).map((e, i) => {
                          const score = parseFloat(e.finalTotalScore || 0);
                          const rank = getScoreLabel(score);
                          const meta = RANK_META[rank] || {};
                          return (
                            <tr key={i} className={i < 3 ? `rp-top-row--${i + 1}` : ''}>
                              <td><RankCircle index={i} /></td>
                              <td>
                                <div className="rp-emp-row">
                                  <div
                                    className="rp-emp-avatar"
                                    style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }}
                                  >
                                    {avatarInitials(e.fullName)}
                                  </div>
                                  <span className="rp-emp-name">{e.fullName}</span>
                                </div>
                              </td>
                              <td className="rp-td-muted">{e.department || '—'}</td>
                              <td className="rp-td-muted">{e.position || '—'}</td>
                              <td><span className="rp-mono">{e.period}</span></td>
                              <td>
                                <span className="rp-score" style={{ color: getScoreColor(score) }}>
                                  {score.toFixed(2)}
                                </span>
                              </td>
                              <td>
                                {meta.color && (
                                  <span
                                    className="rp-badge"
                                    style={{ color: meta.color, background: meta.bg }}
                                  >
                                    {rank} — {meta.label}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile card list */}
                  <div className="rp-top-mobile">
                    {overview.topEmployees.slice(0, 3).map((e, i) => {
                      const score = parseFloat(e.finalTotalScore || 0);
                      return (
                        <div key={i} className={`rp-top-mobile-row ${i < 3 ? `rp-top-mobile-row--${i + 1}` : ''}`}>
                          <RankCircle index={i} />
                          <div
                            className="rp-emp-avatar"
                            style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }}
                          >
                            {avatarInitials(e.fullName)}
                          </div>
                          <div className="rp-emp-info">
                            <div className="rp-emp-name">{e.fullName}</div>
                            <div className="rp-emp-meta">{e.department || '—'} · {e.period}</div>
                          </div>
                          <span className="rp-score" style={{ color: getScoreColor(score) }}>
                            {score.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
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