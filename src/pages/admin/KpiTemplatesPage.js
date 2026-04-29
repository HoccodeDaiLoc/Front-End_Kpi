import React, { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../../api/kpiTemplates';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const emptyTemplate = { name: '', description: '', period: 'monthly', isDefault: false, criteria: [] };
const emptyCriteria = { name: '', description: '', weight: 0, maxScore: 10, target: '' };

export default function KpiTemplatesPage() {
  const [templates, setTemplates]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null);
  const [form, setForm]               = useState(emptyTemplate);
  const [editId, setEditId]           = useState(null);
  const [saving, setSaving]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [expanded, setExpanded]       = useState({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const res = await getTemplates(); setTemplates(res.data.data); }
    catch { toast.error('Lỗi tải mẫu KPI'); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setForm(emptyTemplate); setEditId(null); setModal('form'); };
  const openEdit   = (t) => {
    setForm({
      name: t.name, description: t.description || '', period: t.period, isDefault: t.isDefault,
      criteria: (t.criteria || []).map(c => ({
        id: c.id, name: c.name, description: c.description || '',
        weight: c.weight, maxScore: c.maxScore, target: c.target || ''
      }))
    });
    setEditId(t.id); setModal('form');
  };

  const addCriteria    = () => setForm(f => ({ ...f, criteria: [...f.criteria, { ...emptyCriteria }] }));
  const removeCriteria = (i) => setForm(f => ({ ...f, criteria: f.criteria.filter((_, idx) => idx !== i) }));
  const updateCriteria = (i, field, val) => setForm(f => {
    const c = [...f.criteria]; c[i] = { ...c[i], [field]: val }; return { ...f, criteria: c };
  });

  const handleSave = async () => {
    if (!form.name) return toast.error('Tên mẫu KPI bắt buộc');
    setSaving(true);
    try {
      // Tự động gán weight đều nhau nếu không set
      const totalCriteria = form.criteria.length;
      const criteriaWithWeight = form.criteria.map(c => ({
        ...c,
        weight: totalCriteria > 0 ? parseFloat((100 / totalCriteria).toFixed(2)) : 0
      }));
      const payload = { ...form, criteria: criteriaWithWeight };
      if (editId) await updateTemplate(editId, payload);
      else await createTemplate(payload);
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
        actions={<button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} /> Tạo mẫu KPI</button>} />

      <div className="page-content">
        {loading
          ? <div className="loading-page"><div className="spinner spinner-lg" /></div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {templates.length === 0
                ? <div className="card"><div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>Chưa có mẫu KPI nào</div></div>
                : templates.map(t => (
                  <div key={t.id} className="card">
                    <div className="card-header">
                      <div>
                        <div className="flex gap-2" style={{ alignItems: 'center' }}>
                          <div className="card-title">{t.name}</div>
                          {t.isDefault && <span className="badge" style={{ background: '#eff6ff', color: 'var(--primary)' }}>Mặc định</span>}
                          <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>
                            {t.period === 'monthly' ? 'Tháng' : t.period === 'quarterly' ? 'Quý' : 'Năm'}
                          </span>
                        </div>
                        {t.description && <div className="card-subtitle">{t.description}</div>}
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{t.criteria?.length || 0} tiêu chí</div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => ({ ...e, [t.id]: !e[t.id] }))}>
                          {expanded[t.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Chi tiết
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}><Edit2 size={13} /></button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setConfirmDelete(t)}><Trash2 size={13} /></button>
                      </div>
                    </div>

                    {/* Preview table */}
                    {expanded[t.id] && t.criteria?.length > 0 && (
                      <div className="table-wrap">
                        <table className="table">
                          <thead>
                            <tr>
                              <th style={{ width: 40 }}>STT</th>
                              <th>Tiêu chí đánh giá</th>
                              <th style={{ width: 110, textAlign: 'center' }}>Điểm tối đa</th>
                              <th style={{ width: 110, textAlign: 'center' }}>Cá nhân</th>
                              <th style={{ width: 120, textAlign: 'center' }}>Quản lý trực tiếp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.criteria.map((c, i) => (
                              <tr key={c.id || i}>
                                <td style={{ textAlign: 'center', color: 'var(--text-3)' }}>{i + 1}</td>
                                <td>
                                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                                  {c.description && <div className="text-sm text-muted">{c.description}</div>}
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.maxScore}</td>
                                <td style={{ textAlign: 'center', color: 'var(--text-3)' }}>—</td>
                                <td style={{ textAlign: 'center', color: 'var(--text-3)' }}>—</td>
                              </tr>
                            ))}
                            <tr style={{ background: '#c00000' }}>
                              <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700, color: 'white', paddingRight: 12 }}>TỔNG ĐIỂM:</td>
                              <td style={{ textAlign: 'center', fontWeight: 700, color: 'white' }}>
                                {t.criteria.reduce((s, c) => s + parseFloat(c.maxScore || 0), 0)}
                              </td>
                              <td colSpan={2}></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
          )
        }
      </div>

      {/* ── Create / Edit Modal ── */}
      <Modal open={modal === 'form'} onClose={() => setModal(null)}
        title={editId ? 'Chỉnh sửa mẫu KPI' : 'Tạo mẫu KPI mới'} size="xl"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModal(null)}>Hủy</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </>}>

        {/* ── Thông tin chung ── */}
        <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 16, marginBottom: 20, border: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 13 }}>Thông tin mẫu</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tên mẫu KPI *</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: KPI Kế toán trưởng T4/2026" />
            </div>
            <div className="form-group">
              <label className="form-label">Kỳ đánh giá</label>
              <select className="form-select" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })}>
                <option value="monthly">Tháng</option>
                <option value="quarterly">Quý</option>
                <option value="yearly">Năm</option>
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Mô tả</label>
            <textarea className="form-textarea" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Mô tả ngắn về mẫu KPI này..." />
          </div>
        </div>

        {/* ── Preview header giống mẫu công ty ── */}
        <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 16, marginBottom: 20, border: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 13 }}>Thông tin nhân sự (hiển thị trên form)</div>
          <div style={{ border: '1px solid #ccc', borderRadius: 6, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '6px 10px', fontWeight: 700, background: '#f5f5f5', width: 200 }}>Ngày đánh giá KPI:</td>
                  <td style={{ border: '1px solid #ccc', padding: '6px 10px', color: 'var(--text-3)', fontStyle: 'italic' }}>Điền khi đánh giá</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '6px 10px', fontWeight: 700, background: '#f5f5f5' }}>Họ và tên nhân sự:</td>
                  <td style={{ border: '1px solid #ccc', padding: '6px 10px', color: 'var(--text-3)', fontStyle: 'italic' }}>Điền khi đánh giá</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '6px 10px', fontWeight: 700, background: '#f5f5f5' }}>Phòng ban:</td>
                  <td style={{ border: '1px solid #ccc', padding: '6px 10px', color: 'var(--text-3)', fontStyle: 'italic' }}>Điền khi đánh giá</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '6px 10px', fontWeight: 700, background: '#f5f5f5' }}>Chức danh:</td>
                  <td style={{ border: '1px solid #ccc', padding: '6px 10px', color: 'var(--text-3)', fontStyle: 'italic' }}>Điền khi đánh giá</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Tiêu chí ── */}
        <div className="flex-between" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>Tiêu chí đánh giá ({form.criteria.length})</div>
          <button className="btn btn-secondary btn-sm" onClick={addCriteria}><Plus size={13} /> Thêm tiêu chí</button>
        </div>

        {form.criteria.length === 0
          ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-3)', background: 'var(--surface-2)', borderRadius: 8, border: '1px dashed var(--border)' }}>
              Chưa có tiêu chí. Nhấn "Thêm tiêu chí" để bắt đầu.
            </div>
          )
          : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#c00000' }}>
                    <th style={{ color: 'white', padding: '8px 10px', textAlign: 'center', width: 40, fontWeight: 700 }}>STT</th>
                    <th style={{ color: 'white', padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Tiêu chí đánh giá</th>
                    <th style={{ color: 'white', padding: '8px 10px', textAlign: 'center', width: 110, fontWeight: 700 }}>Điểm tối đa</th>
                    <th style={{ color: 'white', padding: '8px 10px', textAlign: 'center', width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.criteria.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'var(--surface-2)' }}>
                      <td style={{ textAlign: 'center', padding: '8px 10px', color: 'var(--text-3)', fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <textarea
                          className="form-textarea"
                          style={{ marginBottom: 0, minHeight: 60, fontSize: 13 }}
                          value={c.name}
                          onChange={e => updateCriteria(i, 'name', e.target.value)}
                          placeholder="Nhập nội dung tiêu chí đánh giá..."
                        />
                        <input
                          className="form-input"
                          style={{ marginTop: 6, fontSize: 12 }}
                          value={c.description}
                          onChange={e => updateCriteria(i, 'description', e.target.value)}
                          placeholder="Mô tả thêm (không bắt buộc)..."
                        />
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <input
                          className="form-input"
                          type="number"
                          min={0}
                          max={100}
                          value={c.maxScore}
                          onChange={e => updateCriteria(i, 'maxScore', parseFloat(e.target.value) || 0)}
                          style={{ textAlign: 'center', fontWeight: 700, fontSize: 14 }}
                        />
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px 6px' }}>
                        <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={() => removeCriteria(i)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Total */}
                  <tr style={{ background: '#c00000' }}>
                    <td colSpan={2} style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 700, color: 'white' }}>TỔNG ĐIỂM:</td>
                    <td style={{ textAlign: 'center', fontWeight: 900, color: 'white', fontSize: 15 }}>
                      {form.criteria.reduce((s, c) => s + (parseFloat(c.maxScore) || 0), 0)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )
        }
      </Modal>

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete}
        title="Xóa mẫu KPI" message={`Xóa mẫu KPI "${confirmDelete?.name}"?`} />
    </> 
  );
}