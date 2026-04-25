import React, { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import { getOverview, getTrend } from '../../api/dashboard';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getScoreColor } from '../../utils/helpers';
import toast from 'react-hot-toast';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];

export default function ReportsPage() {
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [o, t] = await Promise.all([getOverview(), getTrend({ year })]);
      setOverview(o.data.data);
      setTrend(t.data.data);
    } catch { toast.error('Lỗi tải báo cáo'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [year]);

  const distData = overview ? [
    { name: 'Xuất sắc (≥9)', value: overview.scoreDistribution?.excellent || 0 },
    { name: 'Tốt (≥7)', value: overview.scoreDistribution?.good || 0 },
    { name: 'Khá (≥5)', value: overview.scoreDistribution?.fair || 0 },
    { name: 'TB (≥3)', value: overview.scoreDistribution?.average || 0 },
    { name: 'Kém (<3)', value: overview.scoreDistribution?.poor || 0 },
  ].filter(d => d.value > 0) : [];

  const workflowData = overview ? Object.entries(overview.workflowStats || {}).map(([status, count]) => ({
    name: status === 'draft' ? 'Nháp' : status === 'submitted' ? 'Đã nộp' : status === 'manager_reviewed' ? 'QL duyệt' : status === 'director_approved' ? 'Phê duyệt' : 'Từ chối',
    count
  })) : [];

  return (
    <>
      <Header title="Báo cáo & Thống kê" subtitle="Tổng hợp hiệu suất toàn công ty"
        actions={
          <select className="form-select" style={{ width: 120 }} value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {[2022, 2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        } />
      <div className="page-content">
        {loading ? <div className="loading-page"><div className="spinner spinner-lg" /></div> : !overview ? null : (
          <>
            {/* KPI by department */}
            <div className="card mb-4">
              <div className="card-header"><div className="card-title">Điểm KPI trung bình theo phòng ban</div></div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={overview.departmentStats} margin={{ left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v, n, p) => [parseFloat(v).toFixed(2), 'Điểm TB']}
                      content={({ active, payload }) => active && payload?.length ? (
                        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
                          <div style={{ fontWeight: 700 }}>{payload[0]?.payload?.department}</div>
                          <div style={{ color: getScoreColor(payload[0]?.value) }}>Điểm TB: {parseFloat(payload[0]?.value || 0).toFixed(2)}</div>
                          <div style={{ color: 'var(--text-3)', fontSize: 12 }}>Số đánh giá: {payload[0]?.payload?.count}</div>
                        </div>
                      ) : null} />
                    <Bar dataKey="avgScore" radius={[6, 6, 0, 0]}>
                      {overview.departmentStats?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid-2 mb-4">
              {/* Score distribution pie */}
              <div className="card">
                <div className="card-header"><div className="card-title">Phân bố xếp loại</div></div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={distData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                        {distData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Workflow status */}
              <div className="card">
                <div className="card-header"><div className="card-title">Trạng thái workflow</div></div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={workflowData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="var(--primary-light)" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            {trend.length > 0 && (
              <div className="card mb-4">
                <div className="card-header"><div className="card-title">Xu hướng điểm KPI — Năm {year}</div></div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [parseFloat(v).toFixed(2), 'Điểm TB']} />
                      <Line type="monotone" dataKey="avgScore" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 5, fill: 'var(--accent)' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Top employees */}
            {overview.topEmployees?.length > 0 && (
              <div className="card">
                <div className="card-header"><div className="card-title">🏆 Top 10 Nhân viên xuất sắc</div></div>
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Hạng</th><th>Nhân viên</th><th>Phòng ban</th><th>Chức vụ</th><th>Kỳ</th><th>Điểm</th><th>Xếp loại</th></tr></thead>
                    <tbody>
                      {overview.topEmployees.map((e, i) => (
                        <tr key={i}>
                          <td>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7c2f' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: i < 3 ? 'white' : 'var(--text-3)' }}>{i + 1}</div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{e.fullName}</td>
                          <td className="text-sm">{e.department || '—'}</td>
                          <td className="text-sm text-muted">{e.position || '—'}</td>
                          <td><span className="mono" style={{ fontSize: 12 }}>{e.period}</span></td>
                          <td><span style={{ fontWeight: 800, fontSize: 16, color: getScoreColor(e.finalTotalScore) }}>{parseFloat(e.finalTotalScore).toFixed(2)}</span></td>
                          <td><span className="badge" style={{ background: getScoreColor(e.finalTotalScore) + '1a', color: getScoreColor(e.finalTotalScore) }}>{getScoreColor(e.finalTotalScore) && require('../../utils/helpers').getScoreLabel(e.finalTotalScore)}</span></td>
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
