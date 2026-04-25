import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getOverview, getTrend, getMyStats } from '../../api/dashboard';
import Header from '../../components/layout/Header';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, CheckCircle, Clock, TrendingUp, Award, Star, Target } from 'lucide-react';
import { getScoreColor, getScoreLabel, formatDate } from '../../utils/helpers';
import Spinner from '../../components/common/Spinner';

export default function DashboardPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (['admin', 'director', 'manager'].includes(user?.role)) {
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
  }, [user]);

  if (loading) return <><Header title="Dashboard" /><div className="page-content"><Spinner center /></div></>;

  const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];
  const distData = overview ? [
    { name: 'Xuất sắc', value: overview.scoreDistribution?.excellent || 0 },
    { name: 'Tốt', value: overview.scoreDistribution?.good || 0 },
    { name: 'Khá', value: overview.scoreDistribution?.fair || 0 },
    { name: 'Trung bình', value: overview.scoreDistribution?.average || 0 },
    { name: 'Kém', value: overview.scoreDistribution?.poor || 0 },
  ].filter(d => d.value > 0) : [];

  return (
    <>
      <Header title="Dashboard" subtitle={`Xin chào, ${user?.fullName || user?.email} 👋`} />
      <div className="page-content">

        {/* My personal stats */}
        {myStats && (
          <div className="card mb-4">
            <div className="card-header">
              <div><div className="card-title">Thống kê của tôi</div></div>
            </div>
            <div className="card-body">
              <div className="grid-4">
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#eff6ff' }}><Target size={22} color="var(--primary)" /></div>
                  <div>
                    <div className="stat-value">{myStats.totalEvaluations}</div>
                    <div className="stat-label">Đánh giá đã làm</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#f0fdf4' }}><Award size={22} color="var(--success)" /></div>
                  <div>
                    <div className="stat-value" style={{ color: getScoreColor(myStats.avgScore) }}>{myStats.avgScore?.toFixed(1) || '—'}</div>
                    <div className="stat-label">Điểm TB của tôi</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#fffbeb' }}><Star size={22} color="var(--warning)" /></div>
                  <div>
                    <div className="stat-value">
                      {myStats.latestScore != null ? Number(myStats.latestScore).toFixed(1) : '—'}
                    </div>
                    <div className="stat-label">Điểm gần nhất</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#fdf4ff' }}><TrendingUp size={22} color="#a855f7" /></div>
                  <div>
                    <div className="stat-value">
                      {myStats.latestScore ? getScoreLabel(Number(myStats.latestScore)) : '—'}
                    </div>
                    <div className="stat-label">Xếp loại</div>
                  </div>
                </div>
              </div>
              {myStats.trend?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div className="card-title" style={{ marginBottom: 12 }}>Xu hướng điểm KPI</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={myStats.trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [v?.toFixed(2), 'Điểm']} />
                      <Line type="monotone" dataKey="finalScore" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4 }} name="Điểm cuối" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin/Director/Manager overview */}
        {overview && (
          <>
            <div className="grid-4 mb-4">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#eff6ff' }}><Users size={22} color="var(--primary)" /></div>
                <div><div className="stat-value">{overview.summary?.totalUsers}</div><div className="stat-label">Tổng nhân viên</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#f0fdf4' }}><CheckCircle size={22} color="var(--success)" /></div>
                <div><div className="stat-value">{overview.summary?.approvedEvals}</div><div className="stat-label">KPI đã duyệt</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#fffbeb' }}><Clock size={22} color="var(--warning)" /></div>
                <div><div className="stat-value">{overview.summary?.pendingEvals}</div><div className="stat-label">Chờ xử lý</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#fdf4ff' }}><Award size={22} color="#a855f7" /></div>
                <div><div className="stat-value" style={{ color: getScoreColor(overview.summary?.avgScore) }}>{overview.summary?.avgScore?.toFixed(1)}</div><div className="stat-label">Điểm TB toàn công ty</div></div>
              </div>
            </div>

            <div className="grid-2 mb-4">
              {/* Dept stats */}
              <div className="card">
                <div className="card-header"><div className="card-title">KPI theo phòng ban</div></div>
                <div className="card-body" style={{ padding: '16px 8px' }}>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={overview.departmentStats?.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="department" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [v?.toFixed(2), 'Điểm TB']} />
                      <Bar dataKey="avgScore" fill="var(--primary-light)" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Score distribution */}
              <div className="card">
                <div className="card-header"><div className="card-title">Phân bố xếp loại</div></div>
                <div className="card-body" style={{ padding: '16px 0' }}>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={distData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                        {distData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Trend */}
            {trend.length > 0 && (
              <div className="card mb-4">
                <div className="card-header"><div className="card-title">Xu hướng KPI theo tháng</div></div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [v?.toFixed(2), 'Điểm TB']} />
                      <Line type="monotone" dataKey="avgScore" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Top employees */}
            {overview.topEmployees?.length > 0 && (
              <div className="card">
                <div className="card-header"><div className="card-title">🏆 Top nhân viên</div></div>
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>#</th><th>Nhân viên</th><th>Phòng ban</th><th>Kỳ</th><th>Điểm</th></tr></thead>
                    <tbody>
                      {overview.topEmployees.map((e, i) => (
                        <tr key={i}>
                          <td><span style={{ fontWeight: 700, color: i < 3 ? 'var(--warning)' : 'var(--text-3)' }}>{i + 1}</span></td>
                          <td><div style={{ fontWeight: 600 }}>{e.fullName}</div><div className="text-sm text-muted">{e.position}</div></td>
                          <td>{e.department || '—'}</td>
                          <td>{e.period}</td>
                          <td>
                            <span style={{ fontWeight: 700, color: getScoreColor(e.finalTotalScore) }}>{parseFloat(e.finalTotalScore).toFixed(2)}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 6 }}>{getScoreLabel(e.finalTotalScore)}</span>
                          </td>
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
