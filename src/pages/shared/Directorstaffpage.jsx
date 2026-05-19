import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { getEvaluations } from '../../api/kpiEvaluations';
import { getUsers, getSubordinates } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import { getScoreColor } from '../../utils/helpers';
import {
  Search, ChevronRight, Users, TrendingUp, Award,
  BarChart2, ChevronDown, ChevronUp
} from 'lucide-react';
import { getDirectorStaff } from '../../api/users';
// ── helpers ───────────────────────────────────────────────────────────────────
function calcRank(score) {
  const t = parseFloat(score) || 0;
  if (t >= 95) return { label: 'A', color: '#16a34a', bg: '#f0fdf4' };
  if (t >= 86) return { label: 'B', color: '#2563eb', bg: '#eff6ff' };
  if (t >= 76) return { label: 'C', color: '#d97706', bg: '#fffbeb' };
  if (t >= 66) return { label: 'D', color: '#dc2626', bg: '#fef2f2' };
  if (t >  0)  return { label: 'E', color: '#6b7280', bg: '#f3f4f6' };
  return null;
}

function RankBadge({ score }) {
  const r = calcRank(score);
  if (!r) return <span style={{ color: 'var(--text-3)', fontSize: 12 }}>Chưa có</span>;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: r.bg, color: r.color,
      fontSize: 11, fontWeight: 700,
      padding: '2px 10px', borderRadius: 999,
      border: `1px solid ${r.color}33`,
    }}>
      {r.label}
    </span>
  );
}

function ScoreBar({ value }) {
  const pct   = Math.min(100, Math.max(0, value));
  const color = value > 0 ? getScoreColor(value) : '#e5e7eb';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 999, background: '#e5e7eb', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .4s' }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: value > 0 ? color : 'var(--text-3)', minWidth: 32, textAlign: 'right' }}>
        {value > 0 ? value.toFixed(1) : '—'}
      </span>
    </div>
  );
}

function StatCard({ icon, label, value, color = 'var(--primary)' }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)',
      borderRadius: 12, padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 160,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: color + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {React.cloneElement(icon, { size: 18, color })}
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  );
}

const STATUS_LABEL = {
  draft:             { text: 'Nháp',      color: '#6b7280', bg: '#f3f4f6' },
  submitted:         { text: 'Đã nộp',    color: '#2563eb', bg: '#eff6ff' },
  manager_reviewed:  { text: 'QL duyệt',  color: '#d97706', bg: '#fffbeb' },
  director_approved: { text: 'Đã duyệt',  color: '#16a34a', bg: '#f0fdf4' },
  rejected:          { text: 'Từ chối',   color: '#dc2626', bg: '#fef2f2' },
};
function StatusPill({ status }) {
  const s = STATUS_LABEL[status];
  if (!s) return null;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px',
      borderRadius: 999, background: s.bg, color: s.color,
      border: `1px solid ${s.color}33`,
    }}>{s.text}</span>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DirectorStaffPage() {
  const navigate = useNavigate();

  const [staffMap,     setStaffMap]     = useState({});
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [expandedDept, setExpandedDept] = useState(null);
  const [sortField,    setSortField]    = useState('name');
  const [sortDir,      setSortDir]      = useState('asc');

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
const [userRes, evalRes] = await Promise.all([
  getDirectorStaff(),
  getEvaluations({ limit: 999 }),
]);

      const allUsers = userRes.data?.data ?? userRes.data ?? [];
      const allEvals = evalRes.data?.data ?? evalRes.data ?? [];

      // Map userId → evaluations[]
      const evalByUser = {};
      allEvals.forEach(ev => {
        const uid = ev.employee?.id ?? ev.employeeId;
        if (!uid) return;
        if (!evalByUser[uid]) evalByUser[uid] = [];
        evalByUser[uid].push(ev);
      });

      // Gom nhân viên theo phòng ban
      const map = {};
      allUsers.forEach(u => {
        if (u.role === 'admin') return;

        const dept = u.department ?? u.departmentName ?? 'Chưa phân phòng';
        if (!map[dept]) map[dept] = [];

        const evals  = evalByUser[u.id] ?? [];
        const scored = evals.filter(e => parseFloat(e.finalTotalScore) > 0);
        const scores = scored.map(e => parseFloat(e.finalTotalScore));
        const avg    = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

        // Kỳ gần nhất
        const sorted = [...evals].sort((a, b) =>
          (b.period ?? '').localeCompare(a.period ?? '')
        );
        const latest = sorted[0] ?? null;

        map[dept].push({
          employeeId:   u.id,
          fullName:     u.fullName ?? u.name ?? '—',
          position:     u.position ?? '',
          email:        u.email ?? '',
          evalCount:    evals.length,
          scoredCount:  scored.length,
          avg,
          latestPeriod: latest?.period ?? '',
          latestScore:  latest ? (parseFloat(latest.finalTotalScore) || 0) : 0,
          latestStatus: latest?.status ?? '',
          evalId:       latest?.id ?? null,
        });
      });

      setStaffMap(map);
    } catch (e) {
      console.error('DirectorStaffPage error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const allStaff     = Object.values(staffMap).flat();
  const totalStaff   = allStaff.length;
  const staffWithKpi = allStaff.filter(s => s.avg > 0);
  const globalAvg    = staffWithKpi.length
    ? staffWithKpi.reduce((s, e) => s + e.avg, 0) / staffWithKpi.length : 0;
  const topCount     = allStaff.filter(s => s.avg >= 86).length;
  const deptCount    = Object.keys(staffMap).length;

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filteredDepts = Object.entries(staffMap)
    .map(([dept, staff]) => {
      const filtered = staff.filter(s =>
        s.fullName.toLowerCase().includes(search.toLowerCase()) ||
        s.position.toLowerCase().includes(search.toLowerCase())
      );
      const withKpi = filtered.filter(s => s.avg > 0);
      const deptAvg = withKpi.length
        ? withKpi.reduce((s, e) => s + e.avg, 0) / withKpi.length : 0;
      return { dept, staff: filtered, avg: deptAvg };
    })
    .filter(d => d.staff.length > 0)
    .sort((a, b) => {
      if (sortField === 'avg')   return sortDir === 'desc' ? b.avg - a.avg : a.avg - b.avg;
      if (sortField === 'count') return sortDir === 'desc'
        ? b.staff.length - a.staff.length : a.staff.length - b.staff.length;
      return sortDir === 'desc'
        ? b.dept.localeCompare(a.dept) : a.dept.localeCompare(b.dept);
    });

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => (
    <span style={{ opacity: sortField === field ? 1 : 0.3, fontSize: 10 }}>
      {sortField !== field ? '↕' : sortDir === 'desc' ? '↓' : '↑'}
    </span>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Header title="Quản lý Nhân viên" subtitle="Tổng hợp KPI theo phòng ban" />

      <div className="page-content">

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <StatCard icon={<Users />}      label="Tổng nhân viên"    value={totalStaff}           color="#3b82f6" />
          <StatCard icon={<BarChart2 />}  label="Phòng ban"          value={deptCount}            color="#8b5cf6" />
          <StatCard icon={<TrendingUp />} label="Điểm KPI TB"        value={globalAvg.toFixed(1)} color="#f59e0b" />
          <StatCard icon={<Award />}      label="Xếp loại B trở lên" value={topCount}             color="#10b981" />
        </div>

        {/* Toolbar */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header" style={{ gap: 12, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
              <Search size={14} style={{
                position: 'absolute', left: 10, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-3)',
              }} />
              <input className="form-input" style={{ paddingLeft: 32, width: '100%' }}
                placeholder="Tìm tên hoặc chức vụ..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--text-3)' }}>
              Sắp xếp:
              {[
                { field: 'name',  label: 'Tên phòng ban' },
                { field: 'avg',   label: 'Điểm TB' },
                { field: 'count', label: 'Số nhân viên' },
              ].map(({ field, label }) => (
                <button key={field} className="btn btn-secondary btn-sm"
                  style={{
                    fontWeight: sortField === field ? 700 : 400,
                    background: sortField === field ? '#eff6ff' : '',
                    color: sortField === field ? 'var(--primary)' : '',
                  }}
                  onClick={() => toggleSort(field)}>
                  {label} <SortIcon field={field} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dept blocks */}
        {loading ? (
          <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>
            Đang tải dữ liệu...
          </div>
        ) : filteredDepts.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>
            Không có dữ liệu
          </div>
        ) : filteredDepts.map(({ dept, staff, avg }) => {
          const isOpen      = expandedDept === dept;
          const sortedStaff = [...staff].sort((a, b) => b.avg - a.avg);
          const hasKpi      = avg > 0;

          return (
            <div key={dept} className="card" style={{ marginBottom: 12 }}>

              {/* Dept header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 20px', cursor: 'pointer',
                borderBottom: isOpen ? '1px solid var(--border)' : 'none',
              }}
                onClick={() => setExpandedDept(isOpen ? null : dept)}>

                <div style={{
                  width: 36, height: 36, borderRadius: 8, background: '#eff6ff', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Users size={16} color="#3b82f6" />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{dept}</div>
                  <ScoreBar value={avg} />
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Nhân viên</div>
                  <div style={{ fontWeight: 700 }}>{staff.length}</div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Điểm TB</div>
                  <div style={{ fontWeight: 700, color: hasKpi ? getScoreColor(avg) : 'var(--text-3)' }}>
                    {hasKpi ? avg.toFixed(1) : '—'}
                  </div>
                </div>

                <RankBadge score={avg} />

                <div style={{ color: 'var(--text-3)', marginLeft: 8 }}>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Staff table */}
              {isOpen && (
                <div className="table-wrap" style={{ margin: 0 }}>
                  <table className="table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}>#</th>
                        <th>Nhân viên</th>
                        <th>Chức vụ</th>
                        <th style={{ minWidth: 160 }}>Điểm TB KPI</th>
                        <th>Xếp loại</th>
                        <th>Số kỳ đánh giá</th>
                        <th>Kỳ gần nhất</th>
                        <th>Điểm kỳ gần nhất</th>
                        <th>Trạng thái</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStaff.map((s, idx) => (
                        <tr key={s.employeeId}
                          style={{ cursor: s.evalId ? 'pointer' : 'default' }}
                          onClick={() => s.evalId && navigate(`/evaluation/${s.evalId}`)}>

                          <td style={{ color: 'var(--text-3)', fontSize: 12 }}>
                            {idx === 0 ? '🥇' : idx === 1 && staff.length > 1 ? '🥈'
                              : idx === 2 && staff.length > 2 ? '🥉' : idx + 1}
                          </td>

                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{s.fullName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.email}</div>
                          </td>

                          <td style={{ fontSize: 12, color: 'var(--text-2)' }}>
                            {s.position || '—'}
                          </td>

                          <td style={{ minWidth: 160 }}>
                            {s.scoredCount > 0
                              ? <ScoreBar value={s.avg} />
                              : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Chưa có điểm</span>
                            }
                          </td>

                          <td><RankBadge score={s.avg} /></td>

                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              background: s.evalCount > 0 ? '#eff6ff' : '#f3f4f6',
                              color: s.evalCount > 0 ? '#2563eb' : 'var(--text-3)',
                              borderRadius: 999, padding: '2px 10px',
                              fontSize: 12, fontWeight: 600,
                            }}>
                              {s.evalCount > 0 ? `${s.scoredCount}/${s.evalCount}` : '0'}
                            </span>
                          </td>

                          <td>
                            <span className="mono" style={{ fontSize: 12 }}>
                              {s.latestPeriod || '—'}
                            </span>
                          </td>

                          <td>
                            {s.latestScore > 0
                              ? <span style={{ fontWeight: 700, color: getScoreColor(s.latestScore) }}>
                                  {s.latestScore.toFixed(1)}
                                </span>
                              : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>
                            }
                          </td>

                          <td>
                            {s.latestStatus
                              ? <StatusPill status={s.latestStatus} />
                              : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>Chưa có</span>
                            }
                          </td>

                          <td>
                            {s.evalId && (
                              <button className="btn btn-ghost btn-sm"
                                onClick={e => { e.stopPropagation(); navigate(`/evaluation/${s.evalId}`); }}>
                                Xem KPI <ChevronRight size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}