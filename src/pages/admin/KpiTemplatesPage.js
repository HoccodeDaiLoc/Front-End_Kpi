import React, { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../../api/kpiTemplates';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

const emptyTemplate = { name:'', description:'', period:'monthly', isDefault:false, criteria:[] };
const emptyCriteria = { name:'', description:'', weight:0, maxScore:10, target:'' };

export default function KpiTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyTemplate);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const res = await getTemplates(); setTemplates(res.data.data); }
    catch { toast.error('Lỗi tải mẫu KPI'); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setForm(emptyTemplate); setEditId(null); setModal('form'); };
  const openEdit = (t) => {
    setForm({ name: t.name, description: t.description||'', period: t.period, isDefault: t.isDefault,
      criteria: (t.criteria||[]).map(c => ({ id:c.id, name:c.name, description:c.description||'', weight:c.weight, maxScore:c.maxScore, target:c.target||'' })) });
    setEditId(t.id); setModal('form');
  };

  const addCriteria = () => setForm(f => ({ ...f, criteria: [...f.criteria, { ...emptyCriteria }] }));
  const removeCriteria = (i) => setForm(f => ({ ...f, criteria: f.criteria.filter((_,idx) => idx !== i) }));
  const updateCriteria = (i, field, val) => setForm(f => {
    const c = [...f.criteria]; c[i] = { ...c[i], [field]: val }; return { ...f, criteria: c };
  });

  const totalWeight = form.criteria.reduce((s, c) => s + parseFloat(c.weight || 0), 0);

  const handleSave = async () => {
    if (!form.name) return toast.error('Tên mẫu KPI bắt buộc');
    if (form.criteria.length > 0 && Math.abs(totalWeight - 100) > 0.01)
      return toast.error(`Tổng trọng số phải = 100%. Hiện tại: ${totalWeight.toFixed(1)}%`);
    setSaving(true);
    try {
      if (editId) await updateTemplate(editId, form);
      else await createTemplate(form);
      toast.success(editId ? 'Cập nhật thành công' : 'Tạo mẫu KPI thành công');
      setModal(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi lưu'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await deleteTemplate(confirmDelete.id); toast.success('Xóa thành công'); setConfirmDelete(null); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Lỗi xóa'); }
  };

  return (
    <>
      <Header title="Mẫu KPI" subtitle="Quản lý form đánh giá KPI"
        actions={<button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14}/> Tạo mẫu KPI</button>} />
      <div className="page-content">
        {loading ? <div className="loading-page"><div className="spinner spinner-lg"/></div> : (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {templates.length === 0 ? (
              <div className="card"><div style={{padding:48,textAlign:'center',color:'var(--text-3)'}}>Chưa có mẫu KPI nào</div></div>
            ) : templates.map(t => (
              <div key={t.id} className="card">
                <div className="card-header">
                  <div>
                    <div className="flex gap-2" style={{alignItems:'center'}}>
                      <div className="card-title">{t.name}</div>
                      {t.isDefault && <span className="badge" style={{background:'#eff6ff',color:'var(--primary)'}}>Mặc định</span>}
                      <span className="badge" style={{background:'var(--surface-3)',color:'var(--text-2)'}}>{t.period === 'monthly' ? 'Tháng' : t.period === 'quarterly' ? 'Quý' : 'Năm'}</span>
                    </div>
                    {t.description && <div className="card-subtitle">{t.description}</div>}
                    <div style={{fontSize:12,color:'var(--text-3)',marginTop:4}}>{t.criteria?.length || 0} tiêu chí</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => ({...e,[t.id]:!e[t.id]}))}>
                      {expanded[t.id] ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} Chi tiết
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}><Edit2 size={13}/></button>
                    <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={() => setConfirmDelete(t)}><Trash2 size={13}/></button>
                  </div>
                </div>
                {expanded[t.id] && t.criteria?.length > 0 && (
                  <div className="table-wrap">
                    <table className="table">
                      <thead><tr><th>#</th><th>Tiêu chí</th><th>Trọng số</th><th>Điểm tối đa</th><th>Mục tiêu</th></tr></thead>
                      <tbody>
                        {t.criteria.map((c, i) => (
                          <tr key={c.id}>
                            <td style={{color:'var(--text-3)'}}>{i+1}</td>
                            <td><div style={{fontWeight:600}}>{c.name}</div>{c.description && <div className="text-sm text-muted">{c.description}</div>}</td>
                            <td><span style={{fontWeight:700,color:'var(--primary)'}}>{c.weight}%</span></td>
                            <td>{c.maxScore}</td>
                            <td className="text-sm text-muted">{c.target || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal==='form'} onClose={() => setModal(null)} title={editId ? 'Chỉnh sửa mẫu KPI' : 'Tạo mẫu KPI mới'} size="xl"
        footer={<>
          <span style={{fontSize:12,color: Math.abs(totalWeight-100)<0.01 ? 'var(--success)' : 'var(--warning)', fontWeight:600}}>
            Tổng trọng số: {totalWeight.toFixed(1)}%
          </span>
          <button className="btn btn-secondary" onClick={() => setModal(null)}>Hủy</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
        </>}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Tên mẫu KPI *</label>
            <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">Kỳ đánh giá</label>
            <select className="form-select" value={form.period} onChange={e => setForm({...form, period: e.target.value})}>
              <option value="monthly">Tháng</option><option value="quarterly">Quý</option><option value="yearly">Năm</option>
            </select></div>
        </div>
        <div className="form-group"><label className="form-label">Mô tả</label>
          <textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>

        <div className="flex-between mb-4" style={{marginTop:20}}>
          <div style={{fontWeight:700}}>Tiêu chí đánh giá ({form.criteria.length})</div>
          <button className="btn btn-secondary btn-sm" onClick={addCriteria}><Plus size={13}/> Thêm tiêu chí</button>
        </div>

        {form.criteria.length === 0 ? (
          <div style={{textAlign:'center',padding:'24px',color:'var(--text-3)',background:'var(--surface-2)',borderRadius:8}}>
            Chưa có tiêu chí. Nhấn "Thêm tiêu chí" để bắt đầu.
          </div>
        ) : form.criteria.map((c, i) => (
          <div key={i} style={{background:'var(--surface-2)',borderRadius:10,padding:14,marginBottom:10,border:'1px solid var(--border)'}}>
            <div className="flex-between mb-4">
              <span style={{fontWeight:700,color:'var(--text-3)',fontSize:12}}>Tiêu chí {i+1}</span>
              <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={() => removeCriteria(i)}><Trash2 size={13}/></button>
            </div>
            <div className="form-row">
              <div className="form-group" style={{marginBottom:8}}><label className="form-label">Tên tiêu chí *</label>
                <input className="form-input" value={c.name} onChange={e => updateCriteria(i,'name',e.target.value)} /></div>
              <div className="form-row" style={{gap:8}}>
                <div className="form-group" style={{marginBottom:8}}><label className="form-label">Trọng số (%)</label>
                  <input className="form-input" type="number" min={0} max={100} value={c.weight} onChange={e => updateCriteria(i,'weight',parseFloat(e.target.value)||0)} /></div>
                <div className="form-group" style={{marginBottom:8}}><label className="form-label">Điểm tối đa</label>
                  <input className="form-input" type="number" value={c.maxScore} onChange={e => updateCriteria(i,'maxScore',parseFloat(e.target.value)||10)} /></div>
              </div>
            </div>
            <div className="form-group" style={{marginBottom:0}}><label className="form-label">Mục tiêu</label>
              <input className="form-input" value={c.target} onChange={e => updateCriteria(i,'target',e.target.value)} placeholder="VD: >= 100% target" /></div>
          </div>
        ))}
      </Modal>

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete}
        title="Xóa mẫu KPI" message={`Xóa mẫu KPI "${confirmDelete?.name}"?`} />
    </>
  );
}
