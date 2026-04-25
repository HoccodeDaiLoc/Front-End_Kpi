import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { getSubordinates } from '../../api/users';
import { getEvaluations } from '../../api/kpiEvaluations';
import { getUserStats } from '../../api/dashboard';
import { RoleBadge, StatusBadge } from '../../components/common/Badge';
import { getScoreColor, getScoreLabel } from '../../utils/helpers';
import Modal from '../../components/common/Modal';
import { Users, BarChart2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TeamPage() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsModal, setStatsModal] = useState(null);
  const [stats, setStats] = useState(null);
  const [teamEvals, setTeamEvals] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      getSubordinates(),
      getEvaluations({ limit: 100, status: 'submitted' })
    ]).then(([teamRes, evalsRes]) => {
      setTeam(teamRes.data.data);
      setTeamEvals(evalsRes.data.data);
    }).catch(() => toast.error('Lỗi tải dữ liệu')).finally(() => setLoading(false));
  }, []);

  const openStats = async (member) => {
    setStatsModal(member);
    setStats(null);
    try {
      const res = await getUserStats(member.id);
      setStats(res.data.data);
    } catch {}
  };

  const pendingCount = (memberId) => teamEvals.filter(e => e.employee?.id === memberId).length;

  return (
    <>
      <Header title="Nhân viên của tôi" subtitle={`${team.length} nhân viên`} />
      <div className="page-content">
        {loading ? <div className="loading-page"><div className="spinner spinner-lg" /></div> : (
          team.length === 0 ? (
            <div className="card"><div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>
              <Users size={40} style={{ opacity: .2, marginBottom: 12 }} /><br />Bạn chưa quản lý nhân viên nào
            </div></div>
          ) : (
            <div className="grid-auto">
              {team.map(m => {
                const pending = pendingCount(m.id);
                return (
                  <div key={m.id} className="card" style={{ overflow: 'visible' }}>
                    <div className="card-body">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                          {(m.fullName || m.email).slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700 }} className="truncate">{m.fullName || m.email}</div>
                          <div className="text-sm text-muted">{m.position || '—'}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>{m.department || 'Chưa có phòng ban'}</div>
                      {pending > 0 && (
                        <div className="alert alert-warning" style={{ padding: '6px 10px', marginBottom: 12, fontSize: 12 }}>
                          ⏳ {pending} KPI đang chờ bạn duyệt
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openStats(m)}>
                          <BarChart2 size={13} /> Thống kê
                        </button>
                        <button className="btn btn-primary btn-sm" style={{ flex: 1 }}
                          onClick={() => navigate(`/manager/evaluations?employeeId=${m.id}`)}>
                          <Eye size={13} /> KPI
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      <Modal open={!!statsModal} onClose={() => setStatsModal(null)} title={`Thống kê: ${statsModal?.fullName}`}>
        {!stats ? <div className="loading-page"><div className="spinner" /></div> : (
          <div>
            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--primary)' }}>{stats.totalEvaluations}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Tổng đánh giá</div>
              </div>
              <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: getScoreColor(stats.avgScore) }}>{stats.avgScore?.toFixed(2) || '—'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Điểm trung bình</div>
              </div>
            </div>
            {stats.latestScore && (
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 14, textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: getScoreColor(stats.latestScore) }}>{parseFloat(stats.latestScore).toFixed(2)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Điểm kỳ gần nhất — {getScoreLabel(stats.latestScore)}</div>
              </div>
            )}
            {stats.trend?.length > 0 && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Lịch sử điểm</div>
                {stats.trend.map((t, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--surface-3)', fontSize: 13 }}>
                    <span className="mono">{t.period}</span>
                    <span style={{ fontWeight: 700, color: getScoreColor(t.finalScore) }}>{t.finalScore ? parseFloat(t.finalScore).toFixed(2) : '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
