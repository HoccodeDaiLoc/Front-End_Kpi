import React, { useState, useEffect, useCallback } from 'react';
import Header from '../../components/layout/Header';
import { getOverview, getTrend } from '../../api/dashboard';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { getScoreColor, getScoreLabel } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import { getDepartments } from '../../api/departments';
import './ReportsPage.scss';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];

// Sinh 12 tháng gần nhất
const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    options.push({ value: `${year}-${month}`, label: `Tháng ${month}/${year}` });
  }
  return options;
};
const MONTH_OPTIONS = generateMonthOptions();

// Convert ISO "2026-05" → DB format "5/2026"
const toDbPeriod = (isoMonth) => {
  if (!isoMonth) return '';
  const [year, month] = isoMonth.split('-');
  return `${parseInt(month)}/${year}`;
};

export default function ReportsPage() {
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const { user } = useAuth();
  const [depts, setDepts] = useState([]);
  const isTopAdmin = ['admin', 'chairman'].includes(user?.role);
  const isDirector = user?.role === 'director';
  // Bộ lọc tháng
  const [selectedMonth, setSelectedMonth] = useState(''); // '' = tất cả

  // Load overview (có thể lọc theo tháng)
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

  // Load trend (lọc theo năm, không theo tháng)
  const loadTrend = useCallback(async () => {
    try {
      const t = await getTrend({ year });
      setTrend(t.data.data);
    } catch { }
  }, [year]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadOverview(selectedMonth), loadTrend()]);
      setLoading(false);
    };
    init();
    getDepartments().then(r => setDepts(r.data.data)).catch(() => { }); // ← thêm
  }, []);

  // Khi đổi năm → reload trend
  useEffect(() => { loadTrend(); }, [year]);

  // Khi đổi tháng → reload overview
  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    loadOverview(month);
  };

  const navigateMonth = (dir) => {
    const currentIdx = MONTH_OPTIONS.findIndex(m => m.value === selectedMonth);
    if (dir === 'prev') {
      const next = currentIdx < MONTH_OPTIONS.length - 1 ? currentIdx + 1 : currentIdx;
      handleMonthChange(MONTH_OPTIONS[next].value);
    } else {
      if (currentIdx <= 0) handleMonthChange('');
      else handleMonthChange(MONTH_OPTIONS[currentIdx - 1].value);
    }
  };

  const selectedLabel = MONTH_OPTIONS.find(m => m.value === selectedMonth)?.label || 'Tất cả';

  const distData = overview ? [
    { name: 'A', value: overview.scoreDistribution?.excellent || 0 },
    { name: 'B', value: overview.scoreDistribution?.good || 0 },
    { name: 'C', value: overview.scoreDistribution?.fair || 0 },
    { name: 'D', value: overview.scoreDistribution?.average || 0 },
    { name: 'E', value: overview.scoreDistribution?.poor || 0 },
  ].filter(d => d.value > 0) : [];

  const workflowData = overview ? Object.entries(overview.workflowStats || {}).map(([status, count]) => ({
    name: status === 'draft' ? 'Nháp' : status === 'submitted' ? 'Đã nộp' : status === 'manager_reviewed' ? 'QL duyệt' : status === 'director_approved' ? 'Phê duyệt' : 'Từ chối',
    count
  })) : [];

  // UI bộ lọc tháng (giống Dashboard)
  const MonthFilter = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button
        onClick={() => navigateMonth('prev')}
        disabled={MONTH_OPTIONS.findIndex(m => m.value === selectedMonth) >= MONTH_OPTIONS.length - 1}
        style={{
          width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
          background: 'var(--surface-2)', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)',
          opacity: MONTH_OPTIONS.findIndex(m => m.value === selectedMonth) >= MONTH_OPTIONS.length - 1 ? 0.4 : 1
        }}
      >
        <ChevronLeft size={14} />
      </button>

      <select
        value={selectedMonth}
        onChange={e => handleMonthChange(e.target.value)}
        style={{
          fontSize: 12, padding: '4px 8px', borderRadius: 6,
          border: '1px solid var(--border)',
          background: selectedMonth ? '#eff6ff' : 'var(--surface-2)',
          color: selectedMonth ? 'var(--primary)' : 'var(--text-2)',
          fontWeight: selectedMonth ? 700 : 400,
          cursor: 'pointer', outline: 'none', minWidth: 110
        }}
      >
        <option value="">Tất cả tháng</option>
        {MONTH_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>

      <button
        onClick={() => navigateMonth('next')}
        disabled={!selectedMonth}
        style={{
          width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
          background: 'var(--surface-2)', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)',
          opacity: !selectedMonth ? 0.4 : 1
        }}
      >
        <ChevronRight size={14} />
      </button>

      {selectedMonth && (
        <button
          onClick={() => handleMonthChange('')}
          style={{ fontSize: 11, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
        >
          × Xóa lọc
        </button>
      )}
    </div>
  );

  // Badge tháng đang lọc (hiển thị trên từng card)
  const MonthBadge = () => selectedMonth ? (
    <span style={{
      fontSize: 11, background: '#eff6ff', color: 'var(--primary)',
      border: '1px solid #bfdbfe', borderRadius: 20, padding: '2px 10px', fontWeight: 600
    }}>
      {selectedLabel}
    </span>
  ) : null;
  const groupByParent = (stats) => {
    if (!stats?.length || !depts.length) return stats || [];
    const result = {};
    stats.forEach(s => {
      const dept = depts.find(d => d.name?.trim() === s.department?.trim());
      const parentId = dept?.parentId;
      const parent = parentId ? depts.find(d => d.id === parentId) : dept;
      const groupName = parent?.name || s.department;
      if (!result[groupName]) result[groupName] = { total: 0, count: 0 };
      result[groupName].total += s.avgScore * s.count;
      result[groupName].count += s.count;
    });
    return Object.entries(result).map(([department, v]) => ({
      department,
      avgScore: Math.round((v.total / v.count) * 100) / 100,
      count: v.count
    })).sort((a, b) => b.avgScore - a.avgScore);
  };

  const filterChildOnly = (stats) => {
    if (!stats?.length || !depts.length) return stats || [];
    return stats.filter(s => {
      const dept = depts.find(d => d.name?.trim() === s.department?.trim());
      return dept?.parentId != null;
    });
  };

  const chartData = isTopAdmin
    ? groupByParent(overview?.departmentStats)
    : isDirector
      ? filterChildOnly(overview?.departmentStats)
      : overview?.departmentStats || [];
  return (
    <>
      <Header
        title="Báo cáo & Thống kê"
        subtitle="Tổng hợp hiệu suất toàn công ty"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Lọc tháng */}
            <MonthFilter />

            {/* Lọc năm (chỉ ảnh hưởng xu hướng) */}
            <select
              className="form-select"
              style={{ width: 100 }}
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
            >
              {[2022, 2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        }
      />

      <div className="page-content reports-page">
        {loading
          ? <div className="loading-page"><div className="spinner spinner-lg" /></div>
          : !overview ? null : (
            <div style={{ position: 'relative' }}>

              {/* Overlay loading khi đổi tháng */}
              {overviewLoading && (
                <div style={{
                  position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.5)',
                  zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <div className="spinner spinner-lg" />
                </div>
              )}

              {/* KPI theo phòng ban */}
              <div className="card mb-4">
                <div className="card-header">
                  <div className="card-title">Điểm KPI trung bình theo phòng ban</div>
                  <MonthBadge />
                </div>
                <div className="card-body">
                  {chartData?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={chartData} margin={{ left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip content={({ active, payload }) => active && payload?.length ? (
                          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
                            <div style={{ fontWeight: 700 }}>{payload[0]?.payload?.department}</div>
                            <div style={{ color: getScoreColor(payload[0]?.value) }}>Điểm TB: {parseFloat(payload[0]?.value || 0).toFixed(2)}</div>
                            <div style={{ color: 'var(--text-3)', fontSize: 12 }}>Số đánh giá: {payload[0]?.payload?.count}</div>
                          </div>
                        ) : null} />
                        <Bar dataKey="avgScore" radius={[6, 6, 0, 0]}>
                          {chartData?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>
                      {selectedMonth ? `Không có dữ liệu cho ${selectedLabel}` : 'Chưa có dữ liệu'}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid-2 mb-4">
                {/* Phân bố xếp loại */}
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Phân bố xếp loại</div>
                    <MonthBadge />
                  </div>
                  <div className="card-body">
                    {distData.length > 0 ? (
                      <ResponsiveContainer width="80%" height={290}>
                        <PieChart>
                          <Pie data={distData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                            {distData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>Chưa có dữ liệu</div>
                    )}
                  </div>
                </div>

                {/* Trạng thái duyệt */}
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Trạng thái duyệt</div>
                    <MonthBadge />
                  </div>
                  <div className="card-body">
                    {workflowData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={workflowData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="var(--primary-light)" radius={4} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>Chưa có dữ liệu</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Xu hướng — KHÔNG lọc theo tháng, chỉ lọc theo năm */}
              {trend.length > 0 && (
                <div className="card mb-4">
                  <div className="card-header">
                    <div className="card-title">Xu hướng điểm KPI — Năm {year}</div>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>* Không áp dụng lọc tháng</span>
                  </div>
                  <div className="card-body">
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => [parseFloat(v).toFixed(2), 'Điểm TB']} />
                        <Line type="monotone" dataKey="avgScore" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 5, fill: 'var(--accent)' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Top nhân viên */}
              {overview.topEmployees?.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">🏆 Top 3 Nhân viên xuất sắc</div>
                    <MonthBadge />
                  </div>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr><th>Hạng</th><th>Nhân viên</th><th>Phòng ban</th><th>Chức vụ</th><th>Kỳ</th><th>Điểm</th><th>Xếp loại</th></tr>
                      </thead>
                      <tbody>
                        {overview.topEmployees.slice(0, 3).map((e, i) => (
                          <tr key={i}>
                            <td>
                              <div style={{
                                width: 28, height: 28, borderRadius: '50%',
                                background: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7c2f' : 'var(--surface-3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 800, fontSize: 12, color: i < 3 ? 'white' : 'var(--text-3)'
                              }}>{i + 1}</div>
                            </td>
                            <td style={{ fontWeight: 600 }}>{e.fullName}</td>
                            <td className="text-sm">{e.department || '—'}</td>
                            <td className="text-sm text-muted">{e.position || '—'}</td>
                            <td><span className="mono" style={{ fontSize: 12 }}>{e.period}</span></td>
                            <td><span style={{ fontWeight: 800, fontSize: 16, color: getScoreColor(e.finalTotalScore) }}>{parseFloat(e.finalTotalScore).toFixed(2)}</span></td>
                            <td>
                              <span className="badge" style={{ background: getScoreColor(e.finalTotalScore) + '1a', color: getScoreColor(e.finalTotalScore) }}>
                                {getScoreLabel(e.finalTotalScore)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
      </div>
    </>
  );
}