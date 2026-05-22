import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getOverview, getTrend, getMyStats } from '../../api/dashboard';
import Header from '../../components/layout/Header';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Users, CheckCircle, Clock, TrendingUp, Award, Star, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import { getDepartments } from '../../api/departments';
import Spinner from '../../components/common/Spinner';
import './DashboardPage.scss';
import { formatDate, getScoreLabel, getScoreColor } from '../../utils/helpers';

const RANK_META = {
  A: { color: '#10b981', bg: '#ecfdf5', label: 'Xuất sắc' },
  B: { color: '#3b82f6', bg: '#eff6ff', label: 'Tốt' },
  C: { color: '#f59e0b', bg: '#fffbeb', label: 'Khá' },
  D: { color: '#f97316', bg: '#fff7ed', label: 'Trung bình' },
  E: { color: '#ef4444', bg: '#fef2f2', label: 'Kém' },
};

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];

// Sinh danh sách 12 tháng gần nhất để chọn
const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const value = `${year}-${month}`;
    const label = `Tháng ${month}/${year}`;
    options.push({ value, label });
  }
  return options;
};

const MONTH_OPTIONS = generateMonthOptions();

/* ── RankBadge ── */
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

/* ── ScoreCell ── */
function ScoreCell({ score }) {
  if (score == null || score === '' || parseFloat(score) === 0) return <span className="no-score">—</span>;
  return (
    <span className="score-cell">
      <span className="score-num" style={{ color: getScoreColor(score) }}>
        {parseFloat(score).toFixed(0)}
      </span>
      <RankBadge score={score} />
    </span>
  );
}

/* ── Custom Tooltip ── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      <div className="tooltip-value" style={{ color: getScoreColor(val) }}>
        {val?.toFixed(1)} <RankBadge score={val} />
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Period filter cho biểu đồ phòng ban
  const [selectedPeriod, setSelectedPeriod] = useState(''); // '' = tất cả
  const [deptLoading, setDeptLoading] = useState(false);

  const isAdmin = ['admin', 'director', 'chairman'].includes(user?.role);
  const isDirector = user?.role === 'director';
  const isTopAdmin = ['admin', 'chairman'].includes(user?.role);
  const [depts, setDepts] = useState([]);
  // Convert ISO month to DB format: "2026-05" → "5/2026"
  const toDbPeriod = (isoMonth) => {
    if (!isoMonth) return "";
    const [year, month] = isoMonth.split("-");
    return `${parseInt(month)}/${year}`;
  };


  // Load overview với period filter
  const loadOverview = useCallback(async (period = '') => {
    setDeptLoading(true);
    try {
      const params = period ? { period: toDbPeriod(period) } : {};
      const o = await getOverview(params);
      setOverview(o.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setDeptLoading(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
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
    };
    load();
    getDepartments().then(r => setDepts(r.data.data)).catch(() => { }); // ← thêm dòng này
  }, [user]);

  // Khi đổi period → reload chỉ overview
  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    loadOverview(period);
  };

  // Navigate tháng trước / sau
  const navigatePeriod = (dir) => {
    const currentIdx = MONTH_OPTIONS.findIndex(m => m.value === selectedPeriod);
    if (dir === 'prev') {
      const next = currentIdx < MONTH_OPTIONS.length - 1 ? currentIdx + 1 : currentIdx;
      handlePeriodChange(MONTH_OPTIONS[next].value);
    } else {
      if (currentIdx <= 0) {
        handlePeriodChange('');
      } else {
        handlePeriodChange(MONTH_OPTIONS[currentIdx - 1].value);
      }
    }
  };

  const selectedLabel = MONTH_OPTIONS.find(m => m.value === selectedPeriod)?.label || 'Tất cả';

  if (loading) return (
    <>
      <Header title="Dashboard" />
      <div className="page-content"><Spinner center /></div>
    </>
  );
  // Thêm hàm này cạnh groupByParent
  const filterChildOnly = (stats) => {
    if (!stats?.length || !depts.length) return stats || [];
    return stats.filter(s => {
      const dept = depts.find(d => d.name?.trim() === s.department?.trim());
      return dept?.parentId != null; // chỉ giữ phòng con
    });
  };

  const distData = overview ? [
    { name: 'A', value: overview.scoreDistribution?.excellent || 0 },
    { name: 'B', value: overview.scoreDistribution?.good || 0 },
    { name: 'C', value: overview.scoreDistribution?.fair || 0 },
    { name: 'D', value: overview.scoreDistribution?.average || 0 },
    { name: 'E', value: overview.scoreDistribution?.poor || 0 },
  ].filter(d => d.value > 0) : [];
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

  console.log('role:', user?.role, 'isTopAdmin:', isTopAdmin, 'isDirector:', isDirector);
  return (
    <>
      <Header title="Dashboard" subtitle={`Xin chào, ${user?.fullName || user?.email} 👋`} />
      <div className="page-content dashboard-page">

        {/* ── Thống kê của tôi ── */}
        {myStats && (
          <div className="card mb-4">
            <div className="card-header">
              <div className="card-title">Thống kê của tôi</div>
            </div>
            <div className="card-body">
              <div className="grid-4">
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#eff6ff' }}>
                    <Target size={22} color="var(--primary)" />
                  </div>
                  <div>
                    <div className="stat-value">{myStats.totalEvaluations}</div>
                    <div className="stat-label">Đánh giá đã làm</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#f0fdf4' }}>
                    <Award size={22} color="#10b981" />
                  </div>
                  <div>
                    <div className="stat-value" style={{ color: getScoreColor(myStats.avgScore) }}>
                      {myStats.avgScore?.toFixed(1) || '—'}
                      {myStats.avgScore > 0 && <RankBadge score={myStats.avgScore} />}
                    </div>
                    <div className="stat-label">Điểm TB của tôi</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#fffbeb' }}>
                    <Star size={22} color="#f59e0b" />
                  </div>
                  <div>
                    <div className="stat-value" style={{ color: getScoreColor(myStats.latestScore) }}>
                      {myStats.latestScore != null ? Number(myStats.latestScore).toFixed(1) : '—'}
                      {myStats.latestScore > 0 && <RankBadge score={myStats.latestScore} />}
                    </div>
                    <div className="stat-label">Điểm gần nhất</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#fdf4ff' }}>
                    <TrendingUp size={22} color="#a855f7" />
                  </div>
                  <div>
                    <div className="stat-value">
                      {myStats.latestScore > 0 ? (
                        <>
                          <span style={{ color: getScoreColor(myStats.latestScore) }}>
                            {getScoreLabel(myStats.latestScore)}
                          </span>
                          <span className="rank-desc">
                            {RANK_META[getScoreLabel(myStats.latestScore)]?.label}
                          </span>
                        </>
                      ) : '—'}
                    </div>
                    <div className="stat-label">Xếp loại gần nhất</div>
                  </div>
                </div>
              </div>

              {myStats.trend?.length > 0 && (
                <div className="chart-section">
                  <div className="chart-title">Xu hướng điểm KPI của tôi</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={myStats.trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickCount={6} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone" dataKey="finalScore"
                        stroke="var(--primary)" strokeWidth={2.5}
                        dot={{ r: 4, fill: 'var(--primary)' }}
                        name="Điểm cuối"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tổng quan Admin/Director/Chairman ── */}
        {overview && isAdmin && (
          <>
            {/* Summary stats */}
            <div className="grid-4 mb-4">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#eff6ff' }}>
                  <Users size={22} color="var(--primary)" />
                </div>
                <div>
                  <div className="stat-value">{overview.summary?.totalUsers}</div>
                  <div className="stat-label">Tổng nhân viên</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#f0fdf4' }}>
                  <CheckCircle size={22} color="#10b981" />
                </div>
                <div>
                  <div className="stat-value">{overview.summary?.approvedEvals}</div>
                  <div className="stat-label">KPI đã duyệt</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#fffbeb' }}>
                  <Clock size={22} color="#f59e0b" />
                </div>
                <div>
                  <div className="stat-value">{overview.summary?.pendingEvals}</div>
                  <div className="stat-label">Chờ xử lý</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#fdf4ff' }}>
                  <Award size={22} color="#a855f7" />
                </div>
                <div>
                  <div className="stat-value" style={{ color: getScoreColor(overview.summary?.avgScore) }}>
                    {overview.summary?.avgScore?.toFixed(1)}
                    {overview.summary?.avgScore > 0 && <RankBadge score={overview.summary.avgScore} />}
                  </div>
                  <div className="stat-label">
                    {user?.role === 'director' ? 'Điểm TB phòng ban' : 'Điểm TB toàn công ty'}
                  </div>
                </div>
              </div>
            </div>

            {/* Charts row */}
            <div className="grid-2 mb-4">

              {/* ── KPI theo phòng ban + bộ lọc tháng ── */}
              <div className="card">
                <div className="card-header" style={{ alignItems: 'center' }}>
                  <div className="card-title" style={{ flex: 1 }}>KPI theo phòng ban</div>

                  {/* Period selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={() => navigatePeriod('prev')}
                      disabled={MONTH_OPTIONS.findIndex(m => m.value === selectedPeriod) >= MONTH_OPTIONS.length - 1}
                      style={{
                        width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
                        background: 'var(--surface-2)', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)',
                        opacity: MONTH_OPTIONS.findIndex(m => m.value === selectedPeriod) >= MONTH_OPTIONS.length - 1 ? 0.4 : 1
                      }}
                    >
                      <ChevronLeft size={14} />
                    </button>

                    <select
                      value={selectedPeriod}
                      onChange={e => handlePeriodChange(e.target.value)}
                      style={{
                        fontSize: 12, padding: '4px 8px', borderRadius: 6,
                        border: '1px solid var(--border)', background: selectedPeriod ? '#eff6ff' : 'var(--surface-2)',
                        color: selectedPeriod ? 'var(--primary)' : 'var(--text-2)',
                        fontWeight: selectedPeriod ? 700 : 400, cursor: 'pointer',
                        outline: 'none', minWidth: 110
                      }}
                    >
                      <option value="">Tất cả</option>
                      {MONTH_OPTIONS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => navigatePeriod('next')}
                      disabled={!selectedPeriod}
                      style={{
                        width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
                        background: 'var(--surface-2)', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)',
                        opacity: !selectedPeriod ? 0.4 : 1
                      }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="card-body chart-body" style={{ position: 'relative', minHeight: 280 }}>
                  {deptLoading && (
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 8, zIndex: 2
                    }}>
                      <Spinner />
                    </div>
                  )}

                  {/* Label tháng đang xem */}
                  {selectedPeriod && (
                    <div style={{
                      fontSize: 11, color: 'var(--primary)', fontWeight: 600,
                      marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4
                    }}>
                      <span style={{
                        background: '#eff6ff', border: '1px solid #bfdbfe',
                        borderRadius: 20, padding: '2px 10px'
                      }}>
                        {selectedLabel}
                      </span>
                      <button
                        onClick={() => handlePeriodChange('')}
                        style={{ fontSize: 11, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        × Xóa lọc
                      </button>
                    </div>
                  )}

                  {overview.departmentStats?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={(
                          isTopAdmin
                            ? groupByParent(overview.departmentStats)
                            : isDirector
                              ? filterChildOnly(overview.departmentStats)  // ← chỉ phòng con
                              : overview.departmentStats
                        )?.slice(0, 8)}
                        layout="vertical"
                        margin={{ left: 10, right: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickCount={6} />
                        <YAxis type="category" dataKey="department" width={110} tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="avgScore" fill="var(--primary-light)" radius={4} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-empty" style={{ paddingTop: 60 }}>
                      {selectedPeriod ? `Không có dữ liệu cho ${selectedLabel}` : 'Chưa có dữ liệu'}
                    </div>
                  )}
                </div>
              </div>

              {/* Phân bố xếp loại */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Phân bố xếp loại</div>
                  {selectedPeriod && (
                    <span style={{
                      fontSize: 11, background: '#eff6ff', color: 'var(--primary)',
                      border: '1px solid #bfdbfe', borderRadius: 20, padding: '2px 10px', fontWeight: 600
                    }}>
                      {selectedLabel}
                    </span>
                  )}
                </div>
                <div className="card-body chart-body">
                  {distData.length > 0 ? (
                    <ResponsiveContainer width="80%" height={290}>
                      <PieChart>
                        <Pie
                          data={distData} dataKey="value" nameKey="name"
                          cx="50%" cy="50%" outerRadius={95}
                          label={({ name, value, percent }) =>
                            `${name}: (${(percent * 100).toFixed(0)}%)`
                          }
                          labelLine={false}
                        >
                          {distData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                        </Pie>
                        <Tooltip formatter={(v, name) => [v, name]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-empty">Chưa có dữ liệu</div>
                  )}
                </div>
              </div>
            </div>

            {/* Xu hướng KPI theo tháng */}
            {trend.length > 0 && (
              <div className="card mb-4">
                <div className="card-header">
                  <div className="card-title">Xu hướng KPI theo tháng</div>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickCount={6} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone" dataKey="avgScore"
                        stroke="var(--accent)" strokeWidth={2.5}
                        dot={{ r: 4, fill: 'var(--accent)' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Top nhân viên */}
            {overview.topEmployees?.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">🏆 Top nhân viên</div>
                  {selectedPeriod && (
                    <span style={{
                      fontSize: 11, background: '#eff6ff', color: 'var(--primary)',
                      border: '1px solid #bfdbfe', borderRadius: 20, padding: '2px 10px', fontWeight: 600
                    }}>
                      {selectedLabel}
                    </span>
                  )}
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th>Nhân viên</th>
                        <th>Phòng ban</th>
                        <th>Kỳ</th>
                        <th>Điểm cuối</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.topEmployees.slice(0, 10).map((e, i) => (
                        <tr key={i} className={i < 3 ? 'top-row' : ''}>
                          <td>
                            <span className={`rank-num rank-num--${i < 3 ? i + 1 : 'default'}`}>
                              {i + 1}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{e.fullName}</div>
                            <div className="text-sm text-muted">{e.position}</div>
                          </td>
                          <td>{e.department || '—'}</td>
                          <td><span className="mono" style={{ fontSize: 12 }}>{e.period}</span></td>
                          <td><ScoreCell score={e.finalTotalScore} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}