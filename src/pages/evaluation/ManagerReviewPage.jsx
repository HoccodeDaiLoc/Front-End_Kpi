import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { getEvaluationById, managerReview } from '../../api/kpiEvaluations';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import '../shared/EvaluationDetailPage.scss';
import './Managerreviewpage.scss';

const RATINGS = [
  { range: '95 - 100', rank: 'A' },
  { range: '86 - 94',  rank: 'B' },
  { range: '76 - 85',  rank: 'C' },
  { range: '66 - 75',  rank: 'D' },
  { range: '< 65',     rank: 'E' },
];

function calcRank(total) {
  const t = parseFloat(total) || 0;
  if (t >= 95) return 'A';
  if (t >= 86) return 'B';
  if (t >= 76) return 'C';
  if (t >= 66) return 'D';
  if (t > 0)   return 'E';
  return '—';
}

function fmtDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ManagerReviewPage() {
  const { id }   = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ev,              setEv]             = useState(null);
  const [loading,         setLoading]        = useState(true);
  const [saving,          setSaving]         = useState(false);
  const [mode,            setMode]           = useState('review'); // 'review' | 'reject'

  const [mgrScores,       setMgrScores]      = useState({});
  const [mgrComment,      setMgrComment]     = useState('');
  const [mgrRejectReason, setMgrRejectReason]= useState('');

  useEffect(() => { loadEval(); }, [id]); // eslint-disable-line

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
        rs[sc.criteriaId] = {
          score: sc.managerScore ?? '',
          note:  sc.managerNote  || '',
        };
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

  /* ── Computed ── */
  const criteria  = ev?.template?.criteria || [];

  const totalSelf = criteria.reduce((s, c) => {
    const sc = ev?.scores?.find(x => x.criteriaId === c.id);
    return s + (parseFloat(sc?.selfScore) || 0);
  }, 0);

  const totalMgr = criteria.reduce(
    (s, c) => s + (parseFloat(mgrScores[c.id]?.score) || 0), 0
  );

  // Số tiêu chí chưa điền điểm
  const missingScores = criteria.filter(
    c => mgrScores[c.id]?.score === '' || mgrScores[c.id]?.score == null
  ).length;

  // Kiểm tra ô điểm đã có giá trị chưa
  const isScoreFilled = (cid) =>
    mgrScores[cid]?.score !== '' && mgrScores[cid]?.score != null;

  /* ── Handlers ── */
  const handleApprove = async () => {
    // Validate: điểm + nhận xét tổng quát
    if (missingScores > 0)
      return toast.error(`Còn ${missingScores} tiêu chí chưa chấm điểm`);
    if (!mgrComment.trim())
      return toast.error('Vui lòng nhập nhận xét tổng quát');

    setSaving(true);
    try {
      const scoreArr = Object.entries(mgrScores).map(([criteriaId, v]) => ({
        criteriaId,
        score: parseFloat(v.score) || 0,
        note:  v.note,
      }));
      await managerReview(id, { managerComment: mgrComment, scores: scoreArr });
      toast.success('Đã duyệt KPI!');
      navigate(`/evaluation/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi duyệt');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!mgrRejectReason.trim())
      return toast.error('Vui lòng nhập lý do từ chối');
    setSaving(true);
    try {
      await managerReview(id, {
        action:          'reject',
        managerComment:  mgrComment,
        rejectionReason: mgrRejectReason,
      });
      toast.success('Đã từ chối KPI, trả về cho nhân viên');
      navigate(`/evaluation/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi từ chối');
    } finally {
      setSaving(false);
    }
  };

  /* ── Loading ── */
  if (loading) return (
    <>
      <Header title="Duyệt KPI" />
      <div className="page-content"><Spinner center /></div>
    </>
  );

  // Nhận xét tổng quát đã điền chưa
  const commentFilled = mgrComment.trim().length > 0;

  return (
    <>
      {/* ── Header ── */}
      <Header
        title={mode === 'review' ? 'Chấm điểm KPI' : 'Từ chối KPI'}
        actions={<>
          <button className="btn btn-ghost btn-sm"
            onClick={() => navigate(`/evaluation/${id}`)}>
            <ArrowLeft size={14} /> Quay lại
          </button>

          {mode === 'review' ? (<>
            <button className="btn btn-danger btn-sm" onClick={() => setMode('reject')}>
              <XCircle size={13} /> Từ chối KPI
            </button>
            <button className="btn btn-warning btn-sm" onClick={handleApprove} disabled={saving}>
              <CheckCircle size={13} />
              {saving ? 'Đang lưu...' : 'Xác nhận duyệt KPI'}
            </button>
          </>) : (<>
            <button className="btn btn-ghost btn-sm" onClick={() => setMode('review')}>
              Quay lại chấm điểm
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleReject} disabled={saving}>
              <XCircle size={13} />
              {saving ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </button>
          </>)}
        </>}
      />

      <div className="page-content">
        <div className="eval-document">

          {/* ── Doc header ── */}
          <div className="eval-doc-header">
            <div className="logo-left">
              <img src="/logo_viet_huong.png" alt="Viet Huong" />
            </div>
            <div className="title-center">
              <div className="main-title">Bảng đánh giá KPI</div>
              <div className="subtitle">Công ty cổ phần xây dựng Gốm sứ Việt Hương</div>
              <div className="company-en">(VIET HUONG CERAMICS)</div>
              <div className="period-input">Tháng: <strong>{ev?.period}</strong></div>
            </div>
            <div className="logo-right">
              <img src="/fast_500.png"   alt="Fast500" />
              <img src="/chatluong1.png" alt="Chat luong VN" />
              <img src="/chatluong2.png" alt="Gold Star" />
            </div>
          </div>
          <hr className="eval-divider" />

          {/* ── Thông tin nhân viên ── */}
          <table className="eval-info-table">
            <tbody>
              <tr>
                <td className="label-cell">Họ và tên nhân sự:</td>
                <td className="data-cell" colSpan={3}>{ev?.employee?.fullName || '—'}</td>
              </tr>
              <tr>
                <td className="label-cell">Phòng ban:</td>
                <td className="data-cell">{ev?.employee?.department || '—'}</td>
                <td className="label-cell">Chức danh:</td>
                <td className="data-cell">{ev?.employee?.position || '—'}</td>
              </tr>
              <tr>
                <td className="label-cell">Ngày nộp:</td>
                <td className="data-cell" colSpan={3}>{fmtDateTime(ev?.submittedAt)}</td>
              </tr>
              <tr>
                <td className="label-cell">Mẫu KPI:</td>
                <td className="data-cell" colSpan={3}>{ev?.template?.name || '—'}</td>
              </tr>
            </tbody>
          </table>

          {/* ── Bảng xếp loại ── */}
          <div className="rating-table-container">
            <div className="rating-title">Tiêu chí xếp loại KPI:</div>
            <table className="rating-table rating-table--full">
              <thead>
                <tr><th>Tổng điểm</th><th>Xếp loại</th></tr>
              </thead>
              <tbody>
                {RATINGS.map(r => (
                  <tr key={r.rank}><td>{r.range}</td><td>{r.rank}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ══ Bảng chấm điểm (mode = review) ══ */}
          {mode === 'review' && (
            <>
              {/* Live preview row */}
              <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0 4px' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1f2937' }}>
                  Chấm điểm quản lý
                </span>

                <span className="live-score-preview">
                  Tổng: <span className="score-val">{totalMgr.toFixed(0)}</span>
                  {totalMgr > 0 && (
                    <span className="rank-badge">{calcRank(totalMgr)}</span>
                  )}
                </span>

                {missingScores > 0 && (
                  <span className="missing-badge">
                    ⚠ {missingScores} tiêu chí chưa điền
                  </span>
                )}
              </div>

              <table className="kpi-score-table full-scores">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Tiêu chí đánh giá</th>
                    <th>Điểm tối đa</th>
                    <th>Cá nhân tự đánh</th>
                    <th className="mgr-input-col">Quản lý chấm</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((c, i) => {
                    const s      = ev?.scores?.find(sc => sc.criteriaId === c.id);
                    const filled = isScoreFilled(c.id);

                    return (
                      <tr key={c.id}>
                        <td className="stt-cell">{i + 1}</td>
                        <td className="criteria-cell">
                          <div className="criteria-name">{c.name}</div>
                          {c.description && (
                            <div className="criteria-desc">{c.description}</div>
                          )}
                          {s?.achievement && (
                            <div className="achievement-value">↳ {s.achievement}</div>
                          )}
                        </td>
                        <td className="max-score-cell">{c.maxScore}</td>
                        <td className="self-score-value">
                          {s?.selfScore != null
                            ? parseFloat(s.selfScore).toFixed(1) : '—'}
                        </td>

                        {/* Ô điểm quản lý: vàng khi trống, xanh khi điền */}
                        <td className="mgr-score-cell">
                          <input
                            type="number"
                            min={0}
                            max={c.maxScore}
                            step={1}
                            className={`score-number-input${filled ? ' score-filled' : ''}`}
                            value={mgrScores[c.id]?.score ?? ''}
                            placeholder="—"
                            onWheel={e => e.target.blur()}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '' || parseFloat(val) <= c.maxScore)
                                setMgrScores(rs => ({
                                  ...rs,
                                  [c.id]: { ...rs[c.id], score: val },
                                }));
                            }}
                            onBlur={e => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                const clamped = Math.min(Math.max(val, 0), c.maxScore);
                                setMgrScores(rs => ({
                                  ...rs,
                                  [c.id]: { ...rs[c.id], score: clamped },
                                }));
                              }
                            }}
                          />
                          <span className="score-max-hint">/ {c.maxScore}</span>
                        </td>

                        {/* Ghi chú — không validate */}
                        <td className="mgr-note-cell">
                          <input
                            type="text"
                            className="note-text-input"
                            value={mgrScores[c.id]?.note || ''}
                            placeholder="Nhận xét tiêu chí..."
                            onChange={e =>
                              setMgrScores(rs => ({
                                ...rs,
                                [c.id]: { ...rs[c.id], note: e.target.value },
                              }))
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}

                  <tr className="total-row">
                    <td colSpan={2} className="total-label">TỔNG ĐIỂM:</td>
                    <td className="total-max">100</td>
                    <td className="total-self">
                      {totalSelf > 0 ? totalSelf.toFixed(0) : '—'}
                    </td>
                    <td className="total-mgr">
                      {totalMgr > 0 ? totalMgr.toFixed(0) : '—'}
                    </td>
                    <td></td>
                  </tr>
                  <tr className="rank-row">
                    <td colSpan={2} className="rank-label">XẾP HẠNG</td>
                    <td></td>
                    <td className="rank-value">
                      {totalSelf > 0 ? calcRank(totalSelf) : '—'}
                    </td>
                    <td className="rank-value">
                      {totalMgr > 0 ? calcRank(totalMgr) : '—'}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          {/* ── Nhận xét nhân viên (read-only) ── */}
          <table className="comment-table full-comments">
            <tbody>
              <tr>
                <td colSpan={2} className="comment-cell">
                  <div className="comment-title">Nhận xét của nhân viên:</div>
                  <div className="comment-content">{ev?.selfComment || '(chưa có)'}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Nhận xét tổng quát: vàng khi trống, xanh khi điền ── */}
          <div className="manager-review-comment">
            <label className="review-label">
              {mode === 'review'
                ? 'Nhận xét tổng quát của quản lý:'
                : 'Nhận xét thêm (tùy chọn):'}
            </label>
            <textarea
              className={`form-textarea${commentFilled ? ' textarea-filled' : ''}`}
              rows={3}
              value={mgrComment}
              placeholder="Nhận xét chung về kết quả KPI của nhân viên..."
              onChange={e => setMgrComment(e.target.value)}
            />
          </div>

          {/* ── Form từ chối ── */}
          {mode === 'reject' && (
            <div className="reject-form-box">
              <div className="alert-warning">
                ⚠️ KPI sẽ bị trả về để nhân viên chỉnh sửa lại.
              </div>
              <label className="form-label">
                Lý do từ chối <span style={{ color: 'red' }}>*</span>
              </label>
              <textarea
                className="form-textarea"
                rows={4}
                value={mgrRejectReason}
                onChange={e => setMgrRejectReason(e.target.value)}
                placeholder="Giải thích lý do từ chối để nhân viên biết cần chỉnh sửa gì..."
              />
            </div>
          )}

          {/* ── Action bar cuối trang ── */}
          <div className="review-action-bar no-print">
            <button className="btn btn-ghost"
              onClick={() => navigate(`/evaluation/${id}`)}>
              <ArrowLeft size={14} /> Quay lại
            </button>

            {mode === 'review' ? (<>
              <button className="btn btn-danger" onClick={() => setMode('reject')}>
                <XCircle size={13} /> Từ chối KPI
              </button>
              <button className="btn btn-warning" onClick={handleApprove} disabled={saving}>
                <CheckCircle size={13} />
                {saving ? 'Đang lưu...' : 'Xác nhận duyệt KPI'}
              </button>
            </>) : (<>
              <button className="btn btn-ghost" onClick={() => setMode('review')}>
                Quay lại chấm điểm
              </button>
              <button className="btn btn-danger" onClick={handleReject} disabled={saving}>
                <XCircle size={13} />
                {saving ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </>)}
          </div>

        </div>
      </div>
    </>
  );
}