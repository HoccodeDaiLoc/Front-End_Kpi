import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { getEvaluationById, submitEvaluation, managerReview, directorApprove, updateEvaluation } from '../../api/kpiEvaluations';
import { getTemplates } from '../../api/kpiTemplates';
import { StatusBadge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime, getScoreColor, getScoreLabel } from '../../utils/helpers';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import Spinner from '../../components/common/Spinner';
import { Send, CheckCircle, XCircle, ArrowLeft, Save, ChevronRight } from 'lucide-react';

export default function EvaluationDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [ev, setEv] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [scores, setScores] = useState({});
  const [selfComment, setSelfComment] = useState('');
  const [saving, setSaving] = useState(false);

  // New eval state
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [period, setPeriod] = useState('');
  const [periodType, setPeriodType] = useState('monthly');

  // Review state
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewScores, setReviewScores] = useState({});
  const [managerComment, setManagerComment] = useState('');
  const [directorComment, setDirectorComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (isNew) {
      getTemplates({ isActive: true }).then(r => setTemplates(r.data.data)).catch(() => {});
    } else {
      loadEval();
    }
  }, [id]);

  const loadEval = async () => {
    setLoading(true);
    try {
      const res = await getEvaluationById(id);
      const data = res.data.data;
      setEv(data);
      setSelfComment(data.selfComment || '');
      const s = {};
      (data.scores || []).forEach(sc => { s[sc.criteriaId] = { score: sc.selfScore, note: sc.selfNote || '', achievement: sc.achievement || '' }; });
      setScores(s);
      const rs = {};
      (data.scores || []).forEach(sc => { rs[sc.criteriaId] = { score: sc.managerScore ?? sc.selfScore ?? 0, note: sc.managerNote || '' }; });
      setReviewScores(rs);
      setManagerComment(data.managerComment || '');
    } catch { toast.error('Lỗi tải đánh giá'); navigate(-1); }
    finally { setLoading(false); }
  };

  const handleTemplateSelect = (t) => {
    setSelectedTemplate(t);
    const s = {};
    (t.criteria || []).forEach(c => { s[c.id] = { score: 5, note: '', achievement: '' }; });
    setScores(s);
  };

  const handleSubmitNew = async () => {
    if (!selectedTemplate || !period) return toast.error('Chọn mẫu KPI và kỳ đánh giá');
    setSaving(true);
    try {
      const scoreArr = Object.entries(scores).map(([criteriaId, v]) => ({ criteriaId, score: parseFloat(v.score)||0, note: v.note, achievement: v.achievement }));
      const res = await import('../../api/kpiEvaluations').then(m => m.createEvaluation({
        templateId: selectedTemplate.id, period, periodType, selfComment, scores: scoreArr
      }));
      toast.success('Tạo đánh giá thành công');
      navigate(`/evaluation/${res.data.data.id}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi tạo'); }
    finally { setSaving(false); }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const scoreArr = Object.entries(scores).map(([criteriaId, v]) => ({ criteriaId, score: parseFloat(v.score)||0, note: v.note, achievement: v.achievement }));
      await updateEvaluation(id, { selfComment, scores: scoreArr });
      toast.success('Đã lưu bản nháp');
      loadEval();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi lưu'); }
    finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await submitEvaluation(id);
      toast.success('Đã nộp đánh giá thành công!');
      loadEval();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi nộp'); }
    finally { setSaving(false); }
  };

  const handleManagerReview = async () => {
    setSaving(true);
    try {
      const scoreArr = Object.entries(reviewScores).map(([criteriaId, v]) => ({ criteriaId, score: parseFloat(v.score)||0, note: v.note }));
      await managerReview(id, { managerComment, scores: scoreArr });
      toast.success('Đã duyệt KPI!'); setReviewModal(null); loadEval();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi duyệt'); }
    finally { setSaving(false); }
  };

  const handleDirectorAction = async (action) => {
    setSaving(true);
    try {
      await directorApprove(id, { action, directorComment, rejectionReason: rejectReason });
      toast.success(action === 'approve' ? 'Phê duyệt thành công!' : 'Đã từ chối KPI');
      setReviewModal(null); loadEval();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
    finally { setSaving(false); }
  };

  if (loading) return <><Header title="Chi tiết đánh giá KPI" /><div className="page-content"><Spinner center /></div></>;
if (!ev && !isNew) return <><Header title="Chi tiết đánh giá KPI" /><div className="page-content"><Spinner center /></div></>;
  // --- NEW EVALUATION FORM ---
  if (isNew) {
    return (
      <>
        <Header title="Tạo đánh giá KPI mới"
          actions={<button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={14}/> Quay lại</button>} />
        <div className="page-content">
          {!selectedTemplate ? (
            <div>
              <div className="page-header"><h2 className="page-title">Chọn mẫu KPI</h2></div>
              <div className="grid-auto">
                {templates.map(t => (
                  <div key={t.id} className="card" style={{cursor:'pointer',transition:'box-shadow .2s'}}
                    onClick={() => handleTemplateSelect(t)}
                    onMouseOver={e => e.currentTarget.style.boxShadow='0 4px 20px rgba(30,64,175,.15)'}
                    onMouseOut={e => e.currentTarget.style.boxShadow=''}>
                    <div className="card-body">
                      <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>{t.name}</div>
                      <div className="text-sm text-muted">{t.description}</div>
                      <div style={{marginTop:12,display:'flex',gap:8}}>
                        <span className="badge" style={{background:'var(--surface-3)',color:'var(--text-2)'}}>{t.period === 'monthly' ? 'Tháng' : t.period === 'quarterly' ? 'Quý' : 'Năm'}</span>
                        <span className="badge" style={{background:'#eff6ff',color:'var(--primary)'}}>{t.criteria?.length} tiêu chí</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">{selectedTemplate.name}</div>
                  <div className="card-subtitle">Điền điểm tự đánh giá cho từng tiêu chí</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedTemplate(null)}>Đổi mẫu</button>
              </div>
              <div className="card-body">
                <div className="form-row mb-4">
                  <div className="form-group">
                    <label className="form-label">Kỳ đánh giá *</label>
                    <input className="form-input" placeholder="VD: 2024-03 hoặc 2024-Q1" value={period} onChange={e => setPeriod(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Loại kỳ</label>
                    <select className="form-select" value={periodType} onChange={e => setPeriodType(e.target.value)}>
                      <option value="monthly">Tháng</option>
                      <option value="quarterly">Quý</option>
                      <option value="yearly">Năm</option>
                    </select>
                  </div>
                </div>

                {(selectedTemplate.criteria || []).map((c, i) => (
                  <div key={c.id} style={{background:'var(--surface-2)',borderRadius:10,padding:16,marginBottom:12,border:'1px solid var(--border)'}}>
                    <div className="flex-between mb-4">
                      <div>
                        <span style={{fontWeight:700}}>{i+1}. {c.name}</span>
                        <span className="badge" style={{marginLeft:8,background:'#eff6ff',color:'var(--primary)'}}>{c.weight}%</span>
                      </div>
                      <span style={{fontSize:12,color:'var(--text-3)'}}>Tối đa: {c.maxScore} điểm</span>
                    </div>
                    {c.description && <div className="text-sm text-muted mb-4">{c.description}</div>}
                    {c.target && <div style={{fontSize:12,color:'var(--success)',marginBottom:10}}>🎯 Mục tiêu: {c.target}</div>}
                    <div className="form-row-3">
                      <div className="form-group" style={{marginBottom:0}}>
                        <label className="form-label">Điểm tự đánh giá</label>
                        <input className="form-input" type="number" min={0} max={c.maxScore} step={0.5}
                          value={scores[c.id]?.score ?? 5}
                          onChange={e => setScores(s => ({...s, [c.id]: {...s[c.id], score: e.target.value}}))} />
                      </div>
                      <div className="form-group" style={{marginBottom:0}}>
                        <label className="form-label">Kết quả thực tế</label>
                        <input className="form-input" placeholder="Mời bạn nhập số điểm"
                          value={scores[c.id]?.achievement || ''}
                          onChange={e => setScores(s => ({...s, [c.id]: {...s[c.id], achievement: e.target.value}}))} />
                      </div>
                      <div className="form-group" style={{marginBottom:0}}>
                        <label className="form-label">Ghi chú</label>
                        <input className="form-input" placeholder="Ghi chú thêm"
                          value={scores[c.id]?.note || ''}
                          onChange={e => setScores(s => ({...s, [c.id]: {...s[c.id], note: e.target.value}}))} />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="form-group mt-4">
                  <label className="form-label">Nhận xét tổng quát của bản thân</label>
                  <textarea className="form-textarea" rows={4} value={selfComment} onChange={e => setSelfComment(e.target.value)}
                    placeholder="Mô tả những gì bạn đã đạt được trong kỳ này..." />
                </div>

                <div className="flex gap-2" style={{justifyContent:'flex-end',marginTop:20}}>
                  <button className="btn btn-secondary" onClick={() => navigate(-1)}>Hủy</button>
                  <button className="btn btn-primary" onClick={handleSubmitNew} disabled={saving}>
                    <Save size={14}/> {saving ? 'Đang tạo...' : 'Tạo đánh giá'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  // --- DETAIL VIEW ---
  const canEdit = ev.employeeId === user?.id && ['draft','rejected'].includes(ev.status);
  const canSubmit = ev.employeeId === user?.id && ['draft','rejected'].includes(ev.status);
  const canManagerReview = user?.role === 'manager' && ev.status === 'submitted';
  const canDirectorApprove = user?.role === 'director' && ev.status === 'manager_reviewed';
  const canAdminAction = user?.role === 'admin';

  const criteria = ev.template?.criteria || [];
  const totalWeight = criteria.reduce((s,c) => s + parseFloat(c.weight), 0);

  return (
    <>
      <Header title="Chi tiết đánh giá KPI"
        actions={<>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={14}/> Quay lại</button>
          {canEdit && <button className="btn btn-secondary btn-sm" onClick={handleSaveDraft} disabled={saving}><Save size={13}/> Lưu nháp</button>}
          {canSubmit && <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={saving}><Send size={13}/> Nộp đánh giá</button>}
          {(canManagerReview || canAdminAction) && ev.status === 'submitted' && <button className="btn btn-warning btn-sm" onClick={() => setReviewModal('manager')}><CheckCircle size={13}/> Duyệt KPI</button>}
          {(canDirectorApprove || canAdminAction) && ev.status === 'manager_reviewed' && <>
            <button className="btn btn-success btn-sm" onClick={() => setReviewModal('approve')}><CheckCircle size={13}/> Phê duyệt</button>
            <button className="btn btn-danger btn-sm" onClick={() => setReviewModal('reject')}><XCircle size={13}/> Từ chối</button>
          </>}
        </>} />

      <div className="page-content">
        {/* Status bar */}
        <div className="card mb-4">
          <div className="card-body" style={{padding:'16px 20px'}}>
            <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
              <div>
                <div style={{fontSize:12,color:'var(--text-3)',marginBottom:2}}>Nhân viên</div>
                <div style={{fontWeight:700}}>{ev.employee?.fullName}</div>
              </div>
              <ChevronRight size={16} style={{color:'var(--text-3)'}} />
              <div>
                <div style={{fontSize:12,color:'var(--text-3)',marginBottom:2}}>Mẫu KPI</div>
                <div style={{fontWeight:700}}>{ev.template?.name}</div>
              </div>
              <ChevronRight size={16} style={{color:'var(--text-3)'}} />
              <div>
                <div style={{fontSize:12,color:'var(--text-3)',marginBottom:2}}>Kỳ</div>
                <div style={{fontWeight:700}} className="mono">{ev.period}</div>
              </div>
              <div style={{marginLeft:'auto',display:'flex',gap:12,alignItems:'center'}}>
                <StatusBadge status={ev.status} />
                {ev.finalTotalScore && (
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:24,fontWeight:900,color:getScoreColor(ev.finalTotalScore)}}>{parseFloat(ev.finalTotalScore).toFixed(2)}</div>
                    <div style={{fontSize:11,color:'var(--text-3)'}}>{getScoreLabel(ev.finalTotalScore)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scores table */}
        <div className="card mb-4">
          <div className="card-header"><div className="card-title">Chi tiết điểm từng tiêu chí</div></div>
          {criteria.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tiêu chí</th><th>Trọng số</th><th>Kết quả thực tế</th>
                    <th>Điểm TĐ</th><th>Điểm QL</th><th>Điểm cuối</th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((c, i) => {
                    const s = ev.scores?.find(sc => sc.criteriaId === c.id);
                    return (
                      <tr key={c.id}>
                        <td>
                          <div style={{fontWeight:600}}>{c.name}</div>
                          {c.target && <div style={{fontSize:11,color:'var(--success)'}}>🎯 {c.target}</div>}
                          {canEdit && (
                            <div style={{marginTop:8}}>
                              <input className="form-input" type="number" min={0} max={c.maxScore} step={0.5}
                                value={scores[c.id]?.score ?? s?.selfScore ?? 5}
                                onChange={e => setScores(sc => ({...sc, [c.id]: {...sc[c.id], score: e.target.value}}))}
                                style={{width:100}} />
                            </div>
                          )}
                        </td>
                        <td><span style={{fontWeight:700,color:'var(--primary)'}}>{c.weight}%</span></td>
                        <td className="text-sm">{s?.achievement || '—'}</td>
                        <td>{s?.selfScore != null ? <span style={{fontWeight:600}}>{parseFloat(s.selfScore).toFixed(1)}</span> : '—'}</td>
                        <td>{s?.managerScore != null ? <span style={{fontWeight:600,color:'var(--warning)'}}>{parseFloat(s.managerScore).toFixed(1)}</span> : '—'}</td>
                        <td>{s?.finalScore != null ? <span style={{fontWeight:800,color:getScoreColor(s.finalScore)}}>{parseFloat(s.finalScore).toFixed(1)}</span> : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <div className="card-body text-muted">Không có tiêu chí</div>}
        </div>

        {/* Scores summary */}
        <div className="grid-3 mb-4">
          {[['Điểm tự đánh giá','selfTotalScore','var(--primary)'],['Điểm quản lý','managerTotalScore','var(--warning)'],['Điểm cuối cùng','finalTotalScore','var(--success)']].map(([label,key,color]) => (
            <div key={key} className="card">
              <div className="card-body" style={{textAlign:'center'}}>
                <div style={{fontSize:32,fontWeight:900,color: ev[key] ? getScoreColor(ev[key]) : 'var(--text-3)'}}>{ev[key] ? parseFloat(ev[key]).toFixed(2) : '—'}</div>
                <div style={{fontSize:12,color:'var(--text-3)',marginTop:4}}>{label}</div>
                {ev[key] && <div style={{marginTop:6,fontSize:12,fontWeight:600,color}}>{getScoreLabel(ev[key])}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Comments */}
        <div className="card">
          <div className="card-header"><div className="card-title">Nhận xét & Phê duyệt</div></div>
          <div className="card-body">
            {canEdit ? (
              <div className="form-group">
                <label className="form-label">Nhận xét của bản thân</label>
                <textarea className="form-textarea" rows={4} value={selfComment} onChange={e => setSelfComment(e.target.value)} />
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:16}}>
                {ev.selfComment && <div><div style={{fontWeight:600,fontSize:12,color:'var(--text-3)',marginBottom:4}}>Nhân viên tự nhận xét</div><div style={{background:'var(--surface-2)',borderRadius:8,padding:12,fontSize:14}}>{ev.selfComment}</div></div>}
                {ev.managerComment && <div><div style={{fontWeight:600,fontSize:12,color:'var(--warning)',marginBottom:4}}>Quản lý nhận xét</div><div style={{background:'#fffbeb',borderRadius:8,padding:12,fontSize:14}}>{ev.managerComment}</div></div>}
                {ev.directorComment && <div><div style={{fontWeight:600,fontSize:12,color:'var(--success)',marginBottom:4}}>Ban lãnh đạo nhận xét</div><div style={{background:'#f0fdf4',borderRadius:8,padding:12,fontSize:14}}>{ev.directorComment}</div></div>}
                {ev.rejectionReason && <div className="alert alert-danger"><XCircle size={14}/> <span><strong>Lý do từ chối:</strong> {ev.rejectionReason}</span></div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manager review modal */}
      <Modal open={reviewModal === 'manager'} onClose={() => setReviewModal(null)} title="Duyệt KPI - Nhập điểm" size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setReviewModal(null)}>Hủy</button>
          <button className="btn btn-warning" onClick={handleManagerReview} disabled={saving}>{saving ? 'Đang duyệt...' : 'Xác nhận duyệt'}</button></>}>
        {criteria.map((c, i) => {
          const s = ev.scores?.find(sc => sc.criteriaId === c.id);
          return (
            <div key={c.id} style={{background:'var(--surface-2)',borderRadius:8,padding:12,marginBottom:8}}>
              <div className="flex-between mb-4">
                <span style={{fontWeight:600}}>{c.name} <span style={{color:'var(--primary)',fontSize:12}}>{c.weight}%</span></span>
                <span style={{fontSize:12,color:'var(--text-3)'}}>NV tự đánh: <strong>{s?.selfScore ?? '—'}</strong></span>
              </div>
              <div className="form-row" style={{gap:8}}>
                <div><label className="form-label">Điểm quản lý</label>
                  <input className="form-input" type="number" min={0} max={c.maxScore} step={0.5}
                    value={reviewScores[c.id]?.score ?? s?.selfScore ?? 5}
                    onChange={e => setReviewScores(rs => ({...rs, [c.id]: {...rs[c.id], score: e.target.value}}))} /></div>
                <div><label className="form-label">Ghi chú</label>
                  <input className="form-input" value={reviewScores[c.id]?.note || ''}
                    onChange={e => setReviewScores(rs => ({...rs, [c.id]: {...rs[c.id], note: e.target.value}}))} /></div>
              </div>
            </div>
          );
        })}
        <div className="form-group mt-4"><label className="form-label">Nhận xét của quản lý</label>
          <textarea className="form-textarea" rows={3} value={managerComment} onChange={e => setManagerComment(e.target.value)} /></div>
      </Modal>

      {/* Director approve modal */}
      <Modal open={reviewModal === 'approve'} onClose={() => setReviewModal(null)} title="Phê duyệt KPI"
        footer={<><button className="btn btn-secondary" onClick={() => setReviewModal(null)}>Hủy</button>
          <button className="btn btn-success" onClick={() => handleDirectorAction('approve')} disabled={saving}>{saving ? '...' : '✓ Phê duyệt'}</button></>}>
        <div className="form-group"><label className="form-label">Nhận xét của ban lãnh đạo</label>
          <textarea className="form-textarea" rows={4} value={directorComment} onChange={e => setDirectorComment(e.target.value)} /></div>
      </Modal>

      {/* Director reject modal */}
      <Modal open={reviewModal === 'reject'} onClose={() => setReviewModal(null)} title="Từ chối KPI"
        footer={<><button className="btn btn-secondary" onClick={() => setReviewModal(null)}>Hủy</button>
          <button className="btn btn-danger" onClick={() => handleDirectorAction('reject')} disabled={saving}>{saving ? '...' : '✗ Từ chối'}</button></>}>
        <div className="alert alert-warning">KPI sẽ bị trả về để nhân viên chỉnh sửa lại.</div>
        <div className="form-group"><label className="form-label">Lý do từ chối *</label>
          <textarea className="form-textarea" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Giải thích lý do..." /></div>
        <div className="form-group"><label className="form-label">Nhận xét</label>
          <textarea className="form-textarea" rows={2} value={directorComment} onChange={e => setDirectorComment(e.target.value)} /></div>
      </Modal>
    </>
  );
}
