import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import {
  getEvaluationById, submitEvaluation, managerReview,
  directorApprove, updateEvaluation, createEvaluation
} from '../../api/kpiEvaluations';
import { getTemplates } from '../../api/kpiTemplates';
import { StatusBadge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import Spinner from '../../components/common/Spinner';
import { Send, CheckCircle, XCircle, ArrowLeft, Save, Printer } from 'lucide-react';
import './EvaluationDetailPage.scss';

const PRINT_STYLE = `
  @media print {
    .no-print { display: none !important; }
    @page {
      margin: 0;
      size: A4 portrait;
    }
    body, html {
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-content {
      padding: 12mm 15mm !important;
      margin: 0 !important;
      box-sizing: border-box;
      width: 100% !important;
    }
    .eval-document {
      box-shadow: none !important;
      margin: 0 !important;
      padding: 0 !important;
      max-width: 100% !important;
      width: 100% !important;
    }
  }
`;

const RATINGS = [
  { range: '95 - 100', rank: 'A' },
  { range: '86 - 94', rank: 'B' },
  { range: '76 - 85', rank: 'C' },
  { range: '66 - 75', rank: 'D' },
  { range: '< 65', rank: 'E' },
];

function calcRank(total) {
  const t = parseFloat(total) || 0;
  if (t >= 95) return 'A';
  if (t >= 86) return 'B';
  if (t >= 76) return 'C';
  if (t >= 66) return 'D';
  if (t > 0) return 'E';
  return '';
}
function getTodayFormatted() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function fmtDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function DocHeader({ period, onPeriodChange, readOnly, highlightPeriod }) {
  return (
    <>
      <div className="eval-doc-header">
        <div className="logo-left">
          <img src="/logo_viet_huong.png" alt="Viet Huong" />
        </div>
        <div className="title-center">
          <div className="main-title">Bảng đánh giá KPI</div>
          <div className="subtitle">Công ty cổ phần xây dựng Gốm sứ Việt Hương</div>
          <div className="company-en">(VIET HUONG CERAMICS)</div>
          <div className="period-input">
            Tháng:&nbsp;
            {readOnly
              ? <strong>{period}</strong>
              : <input
              className={highlightPeriod ? 'field-required' : ''}
  value={period}
  onChange={e => {
    let val = e.target.value.replace(/[^\d/]/g, ''); // chỉ cho nhập số và /
    // Auto-insert / sau 2 ký tự số
    if (/^\d{2}$/.test(val) && !val.includes('/')) val = val + '/';
    // Giới hạn độ dài mm/yyyy = 7 ký tự
    if (val.length > 7) return;
    onPeriodChange(val);
  }}
  placeholder="mm/yyyy"
  maxLength={7}
/>
            }
          </div>
        </div>
        <div className="logo-right">
          <img src="/fast_500.png" alt="Fast500" />
          <img src="/chatluong1.png" alt="Chat luong VN" />
          <img src="/chatluong2.png" alt="Gold Star" />
        </div>
      </div>
      <hr className="eval-divider" />
      <p className="eval-note">KPI dùng để đánh giá kết quả công việc, tăng lương, thưởng, thái độ công việc và khả năng gắn bó của nhân sự với doanh nghiệp.</p>
      <p className="eval-note-small">KPI thang điểm đánh giá <strong>100đ</strong>, chia làm 5 loại xếp hạng hạnh kiểm và đo lường kết quả công việc: A, B, C, D, E.</p>
    </>
  );
}

function RatingTable() {
  return (
    <div className="rating-table-container">
      <div className="rating-title">Tiêu chí xếp loại KPI:</div>
      <table className="rating-table rating-table--full">
        <thead>
          <tr>
            <th>Tổng điểm</th>
            <th>Xếp loại</th>
          </tr>
        </thead>
        <tbody>
          {RATINGS.map(r => (
            <tr key={r.rank}>
              <td>{r.range}</td>
              <td>{r.rank}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SigRow({ label, name, datetime }) {
  return (
    <tr>
      <td className="label-cell">{label}</td>
      <td className="data-cell">
        {name && <span className="sign-name">{name}</span>}
        {datetime && <span className="sign-date">— {datetime}</span>}
        {!name && <span className="sign-empty">Chưa có</span>}
      </td>
    </tr>
  );
}

export default function EvaluationDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [ev, setEv] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [selfScores, setSelfScores] = useState({});
  const [selfComment, setSelfComment] = useState('');
  const [saving, setSaving] = useState(false);

  const [evalDate, setEvalDate] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [dept, setDept] = useState('');
  const [position, setPosition] = useState('');

  const [templates, setTemplates] = useState([]);
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [period, setPeriod] = useState('');
  const [periodType, setPeriodType] = useState('monthly');

  const [reviewModal, setReviewModal] = useState(null);
  const [mgrScores, setMgrScores] = useState({});
  const [mgrComment, setMgrComment] = useState('');
  const [mgrRejectReason, setMgrRejectReason] = useState('');   // ← thêm vào đây
  const [dirComment, setDirComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  useEffect(() => {
    if (isNew) getTemplates({ isActive: true }).then(r => setTemplates(r.data.data)).catch(() => { });
    else loadEval();
  }, [id]); // eslint-disable-line

  const loadEval = async () => {
    setLoading(true);
    try {
      const res = await getEvaluationById(id);
      const data = res.data.data;
      setEv(data);
      setEvalDate(data.evalDate || '');
      setSelfComment(data.selfComment || '');
      setEmployeeName(data.employee?.fullName || '');
      setDept(data.employee?.department || '');
      setPosition(data.employee?.position || '');
      const s = {};
      (data.scores || []).forEach(sc => {
        s[sc.criteriaId] = { score: sc.selfScore ?? '', note: sc.selfNote || '', achievement: sc.achievement || '' };
      });
      setSelfScores(s);
      const rs = {};
      (data.scores || []).forEach(sc => {
        rs[sc.criteriaId] = { score: sc.managerScore ?? '', note: sc.managerNote || '' };
      });
      setMgrScores(rs);
      setMgrComment(data.managerComment || '');
    } catch { toast.error('Lỗi tải đánh giá'); navigate(-1); }
    finally { setLoading(false); }
  };

  const pickTemplate = (t) => {
    setSelectedTpl(t);
    const s = {};
    (t.criteria || []).forEach(c => { s[c.id] = { score: '', note: '', achievement: '' }; });
    setSelfScores(s);
    setEmployeeName(user?.fullName || '');
    setDept(user?.department || '');
    setPosition(user?.position || '');
    setEvalDate(getTodayFormatted());
  };
const isValidPeriod = (p) => /^\d{1,2}\/\d{4}$/.test(p.trim());
  const handleCreate = async () => {
if (!selectedTpl || !period.trim() || !isValidPeriod(period))
  return toast.error('Kỳ đánh giá không hợp lệ. Vui lòng nhập đúng định dạng mm/yyyy (VD: 04/2026)');
    if (!evalDate.trim())
      return toast.error('Vui lòng nhập ngày đánh giá KPI')
    if (!employeeName.trim())
      return toast.error('Vui lòng nhập họ tên nhân sự');
    if (!dept.trim())
      return toast.error('Vui lòng nhập phòng ban');
    if (!position.trim())
      return toast.error('Vui lòng nhập chức danh');

    // Kiểm tra đã điền điểm tất cả tiêu chí chưa
    const missing = (selectedTpl.criteria || []).filter(
      c => selfScores[c.id]?.score === '' || selfScores[c.id]?.score == null
    );
    if (missing.length > 0)
      return toast.error(`Còn ${missing.length} tiêu chí chưa chấm điểm`);

    setSaving(true);
    try {
      const scoreArr = Object.entries(selfScores).map(([criteriaId, v]) => ({
        criteriaId, score: parseFloat(v.score) || 0, note: v.note, achievement: v.achievement
      }));
      const [m, y] = period.split('/');
const normalizedPeriod = `${parseInt(m)}/${y}`;
      const res = await createEvaluation({ templateId: selectedTpl.id, period, periodType, selfComment, evalDate, scores: scoreArr });
      toast.success('Tạo đánh giá thành công!');
      navigate(`/evaluation/${res.data.data.id}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi tạo'); }
    finally { setSaving(false); }
  };
const handleSaveDraft = async () => {
  setSaving(true);
  try {
    const scoreArr = criteria.map(c => ({
      criteriaId: c.id,
      score: parseFloat(selfScores[c.id]?.score) || 0,
      note: selfScores[c.id]?.note || '',
      achievement: selfScores[c.id]?.achievement || ''
    }));
    await updateEvaluation(id, { selfComment, scores: scoreArr });
    toast.success('Đã lưu đánh giá');
    await loadEval();        // ← thêm lại dòng này
    setIsEditing(false);     // ← tắt edit sau khi load xong
  } catch (err) { 
    toast.error(err.response?.data?.message || 'Lỗi lưu'); 
  } finally { 
    setSaving(false); 
  }
};

  const handleSubmit = async () => {
    const missing = criteria.filter(
      c => selfScores[c.id]?.score === '' || selfScores[c.id]?.score == null
    );
    if (missing.length > 0)
      return toast.error(`Còn ${missing.length} tiêu chí chưa chấm điểm`);
    if (!selfComment.trim())
      return toast.error('Vui lòng nhập nhận xét của bản thân');

    setSaving(true);
    try { await submitEvaluation(id); toast.success('Đã nộp đánh giá!'); loadEval(); }
    catch (err) { toast.error(err.response?.data?.message || 'Lỗi nộp'); }
    finally { setSaving(false); }
  };

  const handleManagerReview = async () => {
    setSaving(true);
    try {
      const scoreArr = Object.entries(mgrScores).map(([criteriaId, v]) => ({
        criteriaId, score: parseFloat(v.score) || 0, note: v.note
      }));
      await managerReview(id, { managerComment: mgrComment, scores: scoreArr });
      toast.success('Đã duyệt KPI!'); setReviewModal(null); loadEval();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi duyệt'); }
    finally { setSaving(false); }
  };
  const handleManagerReject = async () => {
    if (!mgrRejectReason.trim())
      return toast.error('Vui lòng nhập lý do từ chối');
    setSaving(true);
    try {
      await managerReview(id, {
        action: 'reject',
        managerComment: mgrComment,
        rejectionReason: mgrRejectReason,
      });
      toast.success('Đã từ chối KPI, trả về cho nhân viên');
      setReviewModal(null);
      loadEval();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi từ chối');
    } finally {
      setSaving(false);
    }
  };

  const handleDirectorAction = async (action) => {
    setSaving(true);
    try {
      await directorApprove(id, { action, directorComment: dirComment, rejectionReason: rejectReason });
      toast.success(action === 'approve' ? 'Phê duyệt thành công!' : 'Đã từ chối');
      setReviewModal(null); loadEval();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <>
      <div className="no-print"><Header title="Đánh giá KPI" /></div>
      <div className="page-content"><Spinner center /></div>
    </>
  );

  if (isNew && !selectedTpl) {
    return (
      <>
        <div className="no-print">
          <Header title="Tạo đánh giá KPI mới"
            actions={<button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={14} /> Quay lại</button>} />
        </div>
        <div className="page-content">
          <div className="page-header"><h2 className="page-title">Chọn mẫu KPI</h2></div>
          <div className="grid-auto template-cards">
            {templates.map(t => (
              <div key={t.id} className="card template-card" onClick={() => pickTemplate(t)}>
                <div className="card-body">
                  <div className="template-name">{t.name}</div>
                  <div className="text-sm text-muted">{t.description}</div>
                  <div className="template-badges">
                    <span className="badge period-badge">
                      {t.period === 'monthly' ? 'Tháng' : t.period === 'quarterly' ? 'Quý' : 'Năm'}
                    </span>
                    <span className="badge criteria-badge">{t.criteria?.length} tiêu chí</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  /* ══ FORM TẠO MỚI ══ */
  if (isNew && selectedTpl) {
    const totalSelf = (selectedTpl.criteria || []).reduce((s, c) =>
      s + (parseFloat(selfScores[c.id]?.score) || 0), 0);

    return (
      <>
        <style>{PRINT_STYLE}</style>
        <div className="no-print">
          <Header title="Tạo đánh giá KPI mới"
            actions={<>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedTpl(null)}><ArrowLeft size={14} /> Đổi mẫu</button>
              <button className="btn btn-secondary btn-sm" onClick={() => window.print()}><Printer size={13} /> In / PDF</button>
              <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={saving}>
                <Save size={13} /> {saving ? 'Đang lưu...' : 'Lưu đánh giá'}
              </button>
            </>} />
        </div>

        <div className="page-content">
          <div className="eval-document">
            <DocHeader period={period} onPeriodChange={setPeriod} readOnly={false} highlightPeriod={!isValidPeriod(period)} />

            <table className="eval-info-table">
              <tbody>
                <tr>
                  <td className="label-cell">Ngày đánh giá KPI:</td>
                  <td className="data-cell" colSpan={3}>
                    <input value={evalDate} onChange={e => setEvalDate(e.target.value)} placeholder="dd/mm/yyyy" readOnly />
                  </td>
                </tr>
                <tr>
                  <td className="label-cell">Họ và tên nhân sự:</td>
                  <td className="data-cell" colSpan={3}>
                    <input value={employeeName} onChange={e => setEmployeeName(e.target.value)} />
                  </td>
                </tr>
                <tr>
                  <td className="label-cell">Phòng ban:</td>
                  <td className="data-cell">
                    <input value={dept} onChange={e => setDept(e.target.value)} />
                  </td>
                  <td className="label-cell">Chức danh:</td>
                  <td className="data-cell">
                    <input value={position} onChange={e => setPosition(e.target.value)} />
                  </td>
                </tr>
              </tbody>
            </table>

            <RatingTable />

            <table className="kpi-score-table">
              <thead>
                <tr>
                  <th className="stt-col">STT</th>
                  <th className="criteria-col">Tiêu chí đánh giá</th>
                  <th className="max-score-col">Điểm tối đa</th>
                  <th className="self-col">Cá nhân tự đánh giá</th>
                  <th className="mgr-col">Quản lý trực tiếp</th>
                </tr>
              </thead>
              <tbody>
                {(selectedTpl.criteria || []).map((c, i) => (
                  <tr key={c.id}>
                    <td className="stt-cell">{i + 1}</td>
                    <td className="criteria-cell">
                      <div className="criteria-name">{c.name}</div>
                      {c.description && <div className="criteria-desc">{c.description}</div>}
                      <input className="achievement-input"
                        placeholder="Kết quả thực tế..."
                        value={selfScores[c.id]?.achievement || ''}
                        onChange={e => setSelfScores(s => ({ ...s, [c.id]: { ...s[c.id], achievement: e.target.value } }))} />
                      {selfScores[c.id]?.achievement && <div className="achievement-value">↳ {selfScores[c.id].achievement}</div>}
                    </td>
                    <td className="max-score-cell">{c.maxScore}</td>
                    {/* FIX 1: dùng selfScores thay vì mgrScores */}
                    <td className="self-score-cell">
                    <input type="number" min={0} max={c.maxScore} step={1}
  className={selfScores[c.id]?.score === '' || selfScores[c.id]?.score == null ? 'field-required' : ''}
  value={selfScores[c.id]?.score ?? ''}
  placeholder="—"
  onWheel={e => e.target.blur()}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '' || parseFloat(val) <= c.maxScore) {
                            setSelfScores(s => ({ ...s, [c.id]: { ...s[c.id], score: val } }));
                          }
                        }}
                        onBlur={e => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            const clamped = Math.min(Math.max(val, 0), c.maxScore);
                            setSelfScores(s => ({ ...s, [c.id]: { ...s[c.id], score: clamped } }));
                          }
                        }} />
                    </td>
                    <td className="mgr-score-cell">—</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={2} className="total-label">TỔNG ĐIỂM:</td>
                  <td className="total-max">100</td>
                  <td className="total-self">{totalSelf > 0 ? totalSelf.toFixed(0) : ''}</td>
                  <td className="total-mgr"></td>
                </tr>
                <tr className="rank-row">
                  <td colSpan={2} className="rank-label">XẾP HẠNG</td>
                  <td></td>
                  <td className="rank-value">{calcRank(totalSelf)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            <table className="comment-table">
              <tbody>
                <tr>
                  <td className="label-cell">Người nhận nhiệm vụ xác nhận:</td>
                  <td className="data-cell">Ngày: {evalDate || '…/…/2026'}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="comment-cell">
                    <div className="comment-title">Người đánh giá tự nhận xét:</div>
                    <textarea
  className={!selfComment.trim() ? 'field-required' : ''}
  value={selfComment}
  onChange={e => setSelfComment(e.target.value)}
  placeholder="Nhập nhận xét..." />
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="confirm-note">
                    Tôi xác nhận rằng những thông tin tôi viết trong bảng đánh giá này là hoàn toàn chính xác, tôi xin chịu toàn bộ trách nhiệm nếu cung cấp thông tin sai sự thật.
                  </td>
                </tr>
                <tr>
                  <td className="label-cell">Người đánh giá xác nhận:</td>
                  <td className="data-cell">Ngày:</td>
                </tr>
                <tr>
                  <td colSpan={2} className="comment-cell">
                    <div className="comment-title">Nhận xét của Quản lý trực tiếp:</div>
                    <div className="empty-placeholder"></div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="comment-cell">
                    <div className="comment-title">Nhận xét của Ban lãnh đạo:</div>
                    <div className="empty-placeholder"></div>
                  </td>
                </tr>
                <tr>
                  <td className="final-rank-label">Kết quả xếp loại đánh giá xếp hạng KPI</td>
                  <td className="final-rank-value">{calcRank(totalSelf)}</td>
                </tr>
              </tbody>
            </table>

            <div className="eval-footer">
              <span>Bộ đánh giá KPI lưu hành nội bộ</span>
              <span>Ngày ban hành: 31/3/2026</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ══ DETAIL VIEW ══ */
  const canEdit = String(ev?.employeeId) === String(user?.id)
    && ['draft', 'rejected'].includes(ev?.status)
    && isEditing;
  const canSubmit = String(ev?.employeeId) === String(user?.id)
    && ['draft', 'rejected'].includes(ev?.status)
    && isEditing;
  const canManagerReview = (user?.role === 'manager' || user?.role === 'director') && ev?.status === 'submitted';
  const canDirectorApprove = user?.role === 'director' && ev?.status === 'manager_reviewed';

  const criteria = ev?.template?.criteria || [];
  const totalSelf = criteria.reduce((s, c) => { const sc = ev?.scores?.find(x => x.criteriaId === c.id); return s + (parseFloat(sc?.selfScore) || 0); }, 0);
  const totalManager = criteria.reduce((s, c) => { const sc = ev?.scores?.find(x => x.criteriaId === c.id); return s + (parseFloat(sc?.managerScore) || 0); }, 0);
  const totalFinal = criteria.reduce((s, c) => { const sc = ev?.scores?.find(x => x.criteriaId === c.id); return s + (parseFloat(sc?.finalScore) || 0); }, 0);
  const useTotal = totalFinal > 0 ? totalFinal : totalManager > 0 ? totalManager : totalSelf;

  return (
    <>
      <style>{PRINT_STYLE}</style>

      <div className="no-print">
        <Header title="Chi tiết đánh giá KPI"
          actions={<>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={14} /> Quay lại</button>
            <button className="btn btn-ghost btn-sm" onClick={() => window.print()}><Printer size={13} /> In / PDF</button>

            {/* Nhân viên - chưa đang chỉnh sửa */}
            {String(ev?.employeeId) === String(user?.id) && ['draft', 'rejected'].includes(ev?.status) && !isEditing && (
              <>
                <button className="btn btn-warning btn-sm" onClick={() => setIsEditing(true)}>
                  Chỉnh sửa
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={saving}>
                  <Send size={13} /> Nộp đánh giá
                </button>
              </>
            )}

            {/* Nhân viên - đang chỉnh sửa */}
            {isEditing && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => { setIsEditing(false); loadEval(); }}>
                  Hủy
                </button>
                <button className="btn btn-primary btn-sm"
                onClick={handleSaveDraft} disabled={saving}>
                  <Save size={13} /> {saving ? 'Đang lưu...' : 'Lưu đánh giá'}
                </button>
              </>
            )}

            {/* Manager */}
            {canManagerReview && <>
              <button className="btn btn-warning btn-sm" onClick={() => navigate(`/evaluation/${id}/review`)}>  
                <CheckCircle size={13} /> Duyệt KPI
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => navigate(`/evaluation/${id}/review`)}> 
                <XCircle size={13} /> Từ chối
              </button>
            </>}

            {/* Director */}
            {canDirectorApprove && <>
              <button className="btn btn-success btn-sm" onClick={() => setReviewModal('approve')}><CheckCircle size={13} /> Phê duyệt</button>
              <button className="btn btn-danger btn-sm" onClick={() => setReviewModal('reject')}><XCircle size={13} /> Từ chối</button>
            </>}
          </>} />
      </div>

      <div className="page-content">
        <div className="eval-document">
          <DocHeader period={ev?.period} readOnly />

          <div className="status-wrap no-print">
            <StatusBadge status={ev?.status} />
          </div>

          <table className="eval-info-table">
            <tbody>
              <tr>
                <td className="label-cell">Ngày đánh giá KPI:</td>
                <td className="data-cell" colSpan={3}>
                  {ev?.evalDate || (ev?.submittedAt ? fmtDateTime(ev.submittedAt) : '—')}
                </td>
              </tr>
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
                <td className="label-cell">Mẫu KPI:</td>
                <td className="data-cell" colSpan={3}>{ev?.template?.name || '—'}</td>
              </tr>
            </tbody>
          </table>

          <RatingTable />

          <table className="kpi-score-table full-scores">
            <thead>
              <tr>
                <th>STT</th>
                <th>Tiêu chí đánh giá</th>
                <th>Điểm tối đa</th>
                <th>Cá nhân</th>
                <th>Quản lý</th>
                <th>Điểm cuối</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((c, i) => {
                const s = ev?.scores?.find(sc => sc.criteriaId === c.id);
                return (
                  <tr key={c.id}>
                    <td className="stt-cell">{i + 1}</td>
                    <td className="criteria-cell">
                      <div className="criteria-name">{c.name}</div>
                      {s?.achievement && <div className="achievement-value">↳ {s.achievement}</div>}
                      {canEdit && (
                        <div className="edit-scores no-print">
                          <input type="number" min={0} max={c.maxScore} step={1}
                            value={selfScores[c.id]?.score ?? s?.selfScore ?? ''}
                             onWheel={e => e.target.blur()}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '' || parseFloat(val) <= c.maxScore) {
                                setSelfScores(sc => ({ ...sc, [c.id]: { ...sc[c.id], score: val } }));
                              }
                            }}
                            onBlur={e => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                const clamped = Math.min(Math.max(val, 0), c.maxScore);
                                setSelfScores(sc => ({ ...sc, [c.id]: { ...sc[c.id], score: clamped } }));
                              }
                            }}
                            placeholder="Điểm" />
                          <input className="achievement-input"
                            placeholder="Kết quả thực tế..."
                            value={selfScores[c.id]?.achievement || s?.achievement || ''}
                            onChange={e => setSelfScores(sc => ({ ...sc, [c.id]: { ...sc[c.id], achievement: e.target.value } }))} />
                        </div>
                      )}
                    </td>
                    <td className="max-score-cell">{c.maxScore}</td>
                    <td className="self-score-value">
                      {isEditing
                        ? (selfScores[c.id]?.score !== '' && selfScores[c.id]?.score != null
                          ? parseFloat(selfScores[c.id].score).toFixed(1)
                          : '—')
                        : (s?.selfScore != null ? parseFloat(s.selfScore).toFixed(1) : '—')
                      }
                    </td>
                    <td className="mgr-score-value">{s?.managerScore != null ? parseFloat(s.managerScore).toFixed(1) : '—'}</td>
                    <td className="final-score-value">{s?.finalScore != null ? parseFloat(s.finalScore).toFixed(1) : '—'}</td>
                  </tr>
                );
              })}
              <tr className="total-row">
                <td colSpan={2} className="total-label">TỔNG ĐIỂM:</td>
                <td className="total-max">100</td>
                <td className="total-self">
                  {isEditing
                    ? (() => {
                      const editTotal = criteria.reduce((sum, c) =>
                        sum + (parseFloat(selfScores[c.id]?.score) || 0), 0);
                      return editTotal > 0 ? editTotal.toFixed(0) : '—';
                    })()
                    : (totalSelf > 0 ? totalSelf.toFixed(0) : '—')
                  }
                </td>
                <td className="total-mgr">{totalManager > 0 ? totalManager.toFixed(0) : '—'}</td>
                <td className="total-final">{totalFinal > 0 ? totalFinal.toFixed(0) : '—'}</td>
              </tr>
              <tr className="rank-row">
                <td colSpan={2} className="rank-label">XẾP HẠNG</td>
                <td></td>
                <td className="rank-value">
                  {isEditing
                    ? (() => {
                      const editTotal = criteria.reduce((sum, c) =>
                        sum + (parseFloat(selfScores[c.id]?.score) || 0), 0);
                      return editTotal > 0 ? calcRank(editTotal) : '—';
                    })()
                    : (totalSelf > 0 ? calcRank(totalSelf) : '—')
                  }
                </td>
                <td className="rank-value">{totalManager > 0 ? calcRank(totalManager) : '—'}</td>
                <td className="rank-value">{totalFinal > 0 ? calcRank(totalFinal) : '—'}</td>
              </tr>
            </tbody>
          </table>

          <table className="comment-table full-comments">
            <tbody>
              <SigRow label="Đánh giá:"
                name={ev?.employee?.fullName}
                datetime={fmtDateTime(ev?.submittedAt)} />
              <tr>
                <td colSpan={2} className="comment-cell">
                  <div className="comment-title">Người đánh giá tự nhận xét:</div>
                  {canEdit
                    ? <textarea value={selfComment} onChange={e => setSelfComment(e.target.value)} placeholder="Nhận xét của bản thân..." />
                    : <div className="comment-content">{ev?.selfComment || ''}</div>
                  }
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="confirm-note">
                  Tôi xác nhận rằng những thông tin tôi viết trong bảng đánh giá này là hoàn toàn chính xác, tôi xin chịu toàn bộ trách nhiệm nếu cung cấp thông tin sai sự thật.
                </td>
              </tr>
              <SigRow label="Người đánh giá xác nhận:" name={ev?.employee?.fullName} datetime={fmtDateTime(ev?.submittedAt)} />
              <tr>
                <td colSpan={2} className="comment-cell">
                  <div className="comment-title">
                    Nhận xét của Quản lý trực tiếp:
                    {ev?.reviewingManager?.fullName && <span className="reviewer-info">{ev.reviewingManager.fullName} — {fmtDateTime(ev?.managerReviewedAt)}</span>}
                  </div>
                  <div className="comment-content">{ev?.managerComment || ''}</div>
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="comment-cell">
                  <div className="comment-title">
                    Nhận xét của Ban lãnh đạo:
                    {ev?.approvingDirector?.fullName && <span className="reviewer-info">{ev.approvingDirector.fullName} — {fmtDateTime(ev?.directorApprovedAt)}</span>}
                  </div>
                  <div className="comment-content">{ev?.directorComment || ''}</div>
                </td>
              </tr>
              {ev?.rejectionReason && (
                <tr>
                  <td colSpan={2} className="rejection-reason">
                    <strong>Lý do từ chối:</strong> {ev.rejectionReason}
                  </td>
                </tr>
              )}
              <tr>
                <td className="final-rank-label">Kết quả xếp loại đánh giá xếp hạng KPI</td>
                <td className="final-rank-value">{useTotal > 0 ? calcRank(useTotal) : ''}</td>
              </tr>
            </tbody>
          </table>

          <div className="eval-footer">
            <span>Bộ đánh giá KPI lưu hành nội bộ</span>
            <span>Ngày ban hành: 31/3/2026</span>
          </div>
        </div>
      </div>

      {/* ── Manager review modal ── */}
      <Modal open={reviewModal === 'manager'} onClose={() => setReviewModal(null)}
        title="Chấm điểm KPI" size="lg"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setReviewModal(null)}>Hủy</button>
          <button className="btn btn-warning" onClick={handleManagerReview} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Xác nhận chấm điểm'}
          </button>
        </>}>

        <div className="manager-review-scores">
          {criteria.map(c => {
            const s = ev?.scores?.find(sc => sc.criteriaId === c.id);
            return (
              <div key={c.id} className="review-score-item">
                <div className="review-item-header">
                  <span className="criteria-name">{c.name}</span>
                  <span className="self-score-badge">
                    Tự đánh: <strong>{s?.selfScore ?? '—'}</strong>
                    <span className="max-score-text">/ {c.maxScore}</span>
                  </span>
                </div>
                <div className="review-item-inputs">
                  <div className="score-input-wrap">
                    <label className="review-label">Điểm chấm</label>
                    {/* FIX 2: thêm validation onChange + onBlur cho manager modal */}
                    <input type="number" min={0} max={c.maxScore} step={1}
                      className="score-number-input"
                      value={mgrScores[c.id]?.score ?? ''}
                      placeholder="0"
                      onWheel={e => e.target.blur()}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '' || parseFloat(val) <= c.maxScore) {
                          setMgrScores(rs => ({ ...rs, [c.id]: { ...rs[c.id], score: val } }));
                        }
                      }}
                      onBlur={e => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          const clamped = Math.min(Math.max(val, 0), c.maxScore);
                          setMgrScores(rs => ({ ...rs, [c.id]: { ...rs[c.id], score: clamped } }));
                        }
                      }} />
                    <span className="score-max-hint">/ {c.maxScore}</span>
                  </div>
                  <div className="note-input-wrap">
                    <label className="review-label">Ghi chú</label>
                    <input type="text"
                      className="note-text-input"
                      value={mgrScores[c.id]?.note || ''}
                      placeholder="Nhận xét về tiêu chí này..."
                      onChange={e => setMgrScores(rs => ({ ...rs, [c.id]: { ...rs[c.id], note: e.target.value } }))} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="manager-review-comment">
          <label className="review-label">Nhận xét tổng quát</label>
          <textarea className="form-textarea" rows={3} value={mgrComment}
            placeholder="Nhận xét chung về kết quả KPI của nhân viên..."
            onChange={e => setMgrComment(e.target.value)} />
        </div>
      </Modal>
      {/* ── Manager reject modal ── */}
      <Modal
        open={reviewModal === 'manager_reject'}
        onClose={() => setReviewModal(null)}
        title="Từ chối KPI (Quản lý)"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setReviewModal(null)}>Hủy</button>
          <button className="btn btn-danger" onClick={handleManagerReject} disabled={saving}>
            <XCircle size={13} /> Từ chối
          </button>
        </>}
      >
        <div className="alert alert-warning">
          KPI sẽ bị trả về để nhân viên chỉnh sửa lại.
        </div>
        <div className="form-group">
          <label className="form-label">Lý do từ chối *</label>
          <textarea
            className="form-textarea"
            rows={3}
            value={mgrRejectReason}
            onChange={e => setMgrRejectReason(e.target.value)}
            placeholder="Giải thích lý do từ chối..."
          />
        </div>
        <div className="form-group">
          <label className="form-label">Nhận xét thêm</label>
          <textarea
            className="form-textarea"
            rows={2}
            value={mgrComment}
            onChange={e => setMgrComment(e.target.value)}
            placeholder="Nhận xét bổ sung (nếu có)..."
          />
        </div>
      </Modal>

      {/* ── Director approve ── */}
      <Modal open={reviewModal === 'approve'} onClose={() => setReviewModal(null)} title="Phê duyệt KPI"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setReviewModal(null)}>Hủy</button>
          <button className="btn btn-success" onClick={() => handleDirectorAction('approve')} disabled={saving}>✓ Phê duyệt</button>
        </>}>
        <div className="form-group">
          <label className="form-label">Nhận xét của ban lãnh đạo</label>
          <textarea className="form-textarea" rows={4} value={dirComment} onChange={e => setDirComment(e.target.value)} />
        </div>
      </Modal>

      {/* ── Director reject ── */}
      <Modal open={reviewModal === 'reject'} onClose={() => setReviewModal(null)} title="Từ chối KPI"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setReviewModal(null)}>Hủy</button>
          <button className="btn btn-danger" onClick={() => handleDirectorAction('reject')} disabled={saving}>Từ chối</button>
        </>}>
        <div className="alert alert-warning">KPI sẽ bị trả về để nhân viên chỉnh sửa lại.</div>
        <div className="form-group">
          <label className="form-label">Lý do từ chối *</label>
          <textarea className="form-textarea" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Giải thích lý do..." />
        </div>
        <div className="form-group">
          <label className="form-label">Nhận xét thêm</label>
          <textarea className="form-textarea" rows={2} value={dirComment} onChange={e => setDirComment(e.target.value)} />
        </div>
      </Modal>
    </>
  );
}