import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { getEvaluationById, managerReview } from '../../api/kpiEvaluations';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import { CheckCircle, XCircle, ArrowLeft, AlertTriangle, User, Building2, Briefcase, Calendar } from 'lucide-react';
import './ManagerReviewPage.scss';

const RATINGS = [
  { range: '95–100', rank: 'A', color: 'green' },
  { range: '86–94',  rank: 'B', color: 'teal' },
  { range: '76–85',  rank: 'C', color: 'blue' },
  { range: '66–75',  rank: 'D', color: 'orange' },
  { range: '< 65',   rank: 'E', color: 'red' },
];

function calcRank(total) {
  const t = parseFloat(total) || 0;
  if (t >= 95) return { rank: 'A', color: 'green' };
  if (t >= 86) return { rank: 'B', color: 'teal' };
  if (t >= 76) return { rank: 'C', color: 'blue' };
  if (t >= 66) return { rank: 'D', color: 'orange' };
  if (t > 0)   return { rank: 'E', color: 'red' };
  return null;
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ManagerReviewPage() {
  const { id }   = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ev,              setEv]              = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [mode,            setMode]            = useState('review');
  const [mgrScores,       setMgrScores]       = useState({});
  const [mgrComment,      setMgrComment]      = useState('');
  const [mgrRejectReason, setMgrRejectReason] = useState('');

  useEffect(() => { loadEval(); }, [id]);

  const loadEval = async () => {
    setLoading(true);
    try {
      const res  = await getEvaluationById(id);
      const data = res.data.data;
      if (!['manager', 'director'].includes(user?.role) || data.status !== 'submitted') {
        toast.error('Không có quyền truy cập');
        navigate(`/evaluation/${id}`);
        return;
      }
      setEv(data);
      const rs = {};
      (data.scores || []).forEach(sc => {
        rs[sc.criteriaId] = { score: sc.managerScore ?? '', note: sc.managerNote || '' };
      });
      setMgrScores(rs);
      setMgrComment(data.managerComment || '');
    } catch {
      toast.error('Lỗi tải đánh giá');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const criteria  = ev?.template?.criteria || [];
  const totalSelf = criteria.reduce((s, c) => {
    const sc = ev?.scores?.find(x => x.criteriaId === c.id);
    return s + (parseFloat(sc?.selfScore) || 0);
  }, 0);
  const totalMgr = criteria.reduce(
    (s, c) => s + (parseFloat(mgrScores[c.id]?.score) || 0), 0
  );
  const missingScores = criteria.filter(
    c => mgrScores[c.id]?.score === '' || mgrScores[c.id]?.score == null
  ).length;

  const handleApprove = async () => {
    if (missingScores > 0) return toast.error(`Còn ${missingScores} tiêu chí chưa chấm điểm`);
    if (!mgrComment.trim()) return toast.error('Vui lòng nhập nhận xét tổng quát');
    setSaving(true);
    try {
      const scoreArr = Object.entries(mgrScores).map(([criteriaId, v]) => ({
        criteriaId, score: parseFloat(v.score) || 0, note: v.note,
      }));
      await managerReview(id, { managerComment: mgrComment, scores: scoreArr });
      toast.success('Đã duyệt KPI!');
      navigate(`/evaluation/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi duyệt');
    } finally { setSaving(false); }
  };

  const handleReject = async () => {
    if (!mgrRejectReason.trim()) return toast.error('Vui lòng nhập lý do từ chối');
    setSaving(true);
    try {
      await managerReview(id, { action: 'reject', managerComment: mgrComment, rejectionReason: mgrRejectReason });
      toast.success('Đã từ chối KPI');
      navigate(`/evaluation/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi từ chối');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <>
      <Header title="Duyệt KPI" />
      <div className="page-content"><Spinner center /></div>
    </>
  );

  const rankInfo = calcRank(totalMgr);

  return (
    <>
      <Header
        title={mode === 'review' ? 'Chấm điểm KPI' : 'Từ chối KPI'}
        actions={
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/evaluation/${id}`)}>
            <ArrowLeft size={14} /> Quay lại
          </button>
        }
      />

      <div className="page-content review-page">

        {/* ── Thông tin nhân viên ── */}
        <div className="emp-card">
          <div className="emp-avatar">
            {(ev?.employee?.fullName || '?').charAt(0).toUpperCase()}
          </div>
          <div className="emp-info">
            <div className="emp-name">{ev?.employee?.fullName || '—'}</div>
            <div className="emp-meta">
              <span><Building2 size={12} /> {ev?.employee?.department || '—'}</span>
              <span><Briefcase size={12} /> {ev?.employee?.position || '—'}</span>
              <span><Calendar size={12} /> Nộp: {fmtDateTime(ev?.submittedAt)}</span>
            </div>
          </div>
          <div className="emp-period">
            <div className="period-label">Kỳ đánh giá</div>
            <div className="period-val">{ev?.period || '—'}</div>
          </div>
        </div>

        {/* ── Score summary bar ── */}
        {mode === 'review' && (
          <div className="score-summary-bar">
            <div className="ss-item">
              <span className="ss-label">Tự đánh giá</span>
              <span className="ss-val self">{totalSelf > 0 ? totalSelf.toFixed(0) : '—'}</span>
              {totalSelf > 0 && <span className={`ss-rank rank-${calcRank(totalSelf)?.color}`}>{calcRank(totalSelf)?.rank}</span>}
            </div>
            <div className="ss-divider" />
            <div className="ss-item">
              <span className="ss-label">Quản lý chấm</span>
              <span className="ss-val mgr">{totalMgr > 0 ? totalMgr.toFixed(0) : '—'}</span>
              {rankInfo && <span className={`ss-rank rank-${rankInfo.color}`}>{rankInfo.rank}</span>}
            </div>
            {missingScores > 0 && (
              <div className="ss-missing">
                <AlertTriangle size={13} />
                {missingScores} chưa điền
              </div>
            )}
          </div>
        )}

        {/* ── Bảng chấm điểm ── */}
        {mode === 'review' && (
          <div className="score-section">
            <div className="section-title">Chấm điểm từng tiêu chí</div>
            <div className="score-list">
              {criteria.map((c, i) => {
                const s = ev?.scores?.find(sc => sc.criteriaId === c.id);
                const val = mgrScores[c.id]?.score;
                const filled = val !== '' && val != null;
                return (
                  <div key={c.id} className={`score-row ${filled ? 'filled' : 'empty'}`}>
                    <div className="row-index">{i + 1}</div>
                    <div className="row-body">
                      <div className="row-name">{c.name}</div>
                      {c.description && <div className="row-desc">{c.description}</div>}
                      {s?.achievement && <div className="row-achievement">↳ {s.achievement}</div>}
                      <input
                        type="text"
                        className="note-input"
                        value={mgrScores[c.id]?.note || ''}
                        placeholder="Ghi chú tiêu chí..."
                        onChange={e => setMgrScores(rs => ({ ...rs, [c.id]: { ...rs[c.id], note: e.target.value } }))}
                      />
                    </div>
                    <div className="row-scores">
                      <div className="self-score-badge">{s?.selfScore != null ? parseFloat(s.selfScore).toFixed(1) : '—'}</div>
                      <div className="score-input-wrap">
                        <input
                          type="number"
                          min={0}
                          max={c.maxScore}
                          step={1}
                          className={`score-input ${filled ? 'score-filled' : ''}`}
                          value={val ?? ''}
                          placeholder="—"
                          onWheel={e => e.target.blur()}
                          onChange={e => {
                            const v = e.target.value;
                            if (v === '' || parseFloat(v) <= c.maxScore)
                              setMgrScores(rs => ({ ...rs, [c.id]: { ...rs[c.id], score: v } }));
                          }}
                          onBlur={e => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v)) {
                              const clamped = Math.min(Math.max(v, 0), c.maxScore);
                              setMgrScores(rs => ({ ...rs, [c.id]: { ...rs[c.id], score: clamped } }));
                            }
                          }}
                        />
                        <span className="score-max">/{c.maxScore}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Nhận xét nhân viên (read-only) ── */}
        <div className="comment-section">
          <div className="section-title">Nhận xét của nhân viên</div>
          <div className="comment-readonly">{ev?.selfComment || '(chưa có nhận xét)'}</div>
        </div>

        {/* ── Nhận xét quản lý ── */}
        <div className="comment-section">
          <div className="section-title">
            {mode === 'review' ? 'Nhận xét của quản lý' : 'Nhận xét thêm (tùy chọn)'}
          </div>
          <textarea
            className={`mgr-textarea ${mgrComment.trim() ? 'is-filled' : ''}`}
            rows={3}
            value={mgrComment}
            placeholder="Nhận xét chung về kết quả KPI của nhân viên..."
            onChange={e => setMgrComment(e.target.value)}
          />
        </div>

        {/* ── Form từ chối ── */}
        {mode === 'reject' && (
          <div className="reject-section">
            <div className="reject-warning">
              <AlertTriangle size={15} />
              KPI sẽ bị trả về để nhân viên chỉnh sửa lại.
            </div>
            <div className="section-title">
              Lý do từ chối <span className="required">*</span>
            </div>
            <textarea
              className={`mgr-textarea reject ${mgrRejectReason.trim() ? 'is-filled' : ''}`}
              rows={4}
              value={mgrRejectReason}
              onChange={e => setMgrRejectReason(e.target.value)}
              placeholder="Giải thích lý do để nhân viên biết cần chỉnh sửa gì..."
            />
          </div>
        )}

        {/* ── Action bar ── */}
        <div className="action-bar">
          <button className="btn-action ghost" onClick={() => mode === 'reject' ? setMode('review') : navigate(`/evaluation/${id}`)}>
            <ArrowLeft size={14} />
            {mode === 'reject' ? 'Quay lại chấm điểm' : 'Quay lại'}
          </button>
          <div className="action-right">
            {mode === 'review' ? (
              <>
                <button className="btn-action danger" onClick={() => setMode('reject')}>
                  <XCircle size={14} /> Từ chối
                </button>
                <button className="btn-action approve" onClick={handleApprove} disabled={saving}>
                  <CheckCircle size={14} />
                  {saving ? 'Đang lưu...' : 'Duyệt KPI'}
                </button>
              </>
            ) : (
              <button className="btn-action danger" onClick={handleReject} disabled={saving}>
                <XCircle size={14} />
                {saving ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            )}
          </div>
        </div>

      </div>
    </>
  );
}