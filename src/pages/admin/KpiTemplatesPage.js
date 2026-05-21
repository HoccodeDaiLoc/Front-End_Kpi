import React, { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../../api/kpiTemplates';
import { getDepartments } from '../../api/departments';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, Send, Building2, CheckSquare, Square, Layers } from 'lucide-react';
import api from '../../api/axios';

const emptyTemplate = { name: '', description: '', period: 'monthly', isDefault: false, departmentId: '', criteria: [] };
const emptyCriteria = { name: '', description: '', weight: 0, maxScore: 10, target: '' };

// Màu sắc cho từng khối phòng ban (lấy theo index)
const GROUP_COLORS = [
  { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', dot: '#3b82f6' },
  { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', dot: '#22c55e' },
  { bg: '#fef3c7', border: '#fde68a', text: '#b45309', dot: '#f59e0b' },
  { bg: '#fdf4ff', border: '#e9d5ff', text: '#7e22ce', dot: '#a855f7' },
  { bg: '#fff1f2', border: '#fecdd3', text: '#be123c', dot: '#f43f5e' },
  { bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1', dot: '#0ea5e9' },
];

export default function KpiTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyTemplate);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [depts, setDepts] = useState([]);

  // Filter state
  const [activeGroup, setActiveGroup] = useState('all'); // 'all' | parentDeptId

  // Send modal state
  const [sendTarget, setSendTarget] = useState(null);
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    load();
    getDepartments().then(r => setDepts(r.data.data)).catch(() => { });
  }, []);

  const load = async () => {
    setLoading(true);
    try { const res = await getTemplates(); setTemplates(res.data.data); }
    catch { toast.error('Lỗi tải mẫu KPI'); }
    finally { setLoading(false); }
  };

  // ── Tính nhóm phòng ban cha ──────────────────────────────────────────────
  const parentDepts = depts.filter(d => !d.parentId);

  // Lấy tất cả departmentId (cả cha lẫn con) thuộc một nhóm cha
  const getDeptIdsInGroup = (parentId) => {
    const children = depts.filter(d => d.parentId === parentId).map(d => d.id);
    return [parentId, ...children];
  };

  // Lọc template theo nhóm đang chọn — dựa vào departmentId của template
  const filteredTemplates = templates.filter(t => {
    if (activeGroup === 'all') return true;
    // departmentId của template phải là chính phòng ban cha đó, hoặc con của nó
    const groupDeptIds = getDeptIdsInGroup(activeGroup);
    return groupDeptIds.includes(t.departmentId);
  });

  // Đếm số template theo từng nhóm
  const countByGroup = (parentId) => {
    const groupDeptIds = getDeptIdsInGroup(parentId);
    return templates.filter(t => groupDeptIds.includes(t.departmentId)).length;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openCreate = () => { setForm(emptyTemplate); setEditId(null); setModal('form'); };
  const openEdit = (t) => {
    setForm({
      name: t.name, description: t.description || '', period: t.period, isDefault: t.isDefault,
      departmentId: t.departmentId || '',
      criteria: (t.criteria || []).map(c => ({
        id: c.id, name: c.name, description: c.description || '',
        weight: c.weight, maxScore: c.maxScore, target: c.target || ''
      }))
    });
    setEditId(t.id); setModal('form');
  };

  const openSend = (t) => {
    setSendTarget(t);
    const alreadySent = (t.assignments || []).map(a => a.departmentId || a.department?.id).filter(Boolean);
    setSelectedDepts(alreadySent);
    setModal('send');
  };
  const toggleDept = (id) => {
    setSelectedDepts(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!selectedDepts.length) return toast.error('Vui lòng chọn ít nhất 1 phòng ban');
    setSending(true);
    try {
      await api.post(`/kpi-templates/${sendTarget.id}/send`, { departmentIds: selectedDepts });
      toast.success(`Đã gửi cho ${selectedDepts.length} phòng ban`);
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi gửi');
    } finally {
      setSending(false);
    }
  };

  const addCriteria = () => setForm(f => ({ ...f, criteria: [...f.criteria, { ...emptyCriteria }] }));
  const removeCriteria = (i) => setForm(f => ({ ...f, criteria: f.criteria.filter((_, idx) => idx !== i) }));
  const updateCriteria = (i, field, val) => setForm(f => {
    const c = [...f.criteria]; c[i] = { ...c[i], [field]: val }; return { ...f, criteria: c };
  });

  const handleSave = async () => {
    if (!form.name) return toast.error('Tên mẫu KPI bắt buộc');
    setSaving(true);
    try {
      const payload = { ...form, criteria: form.criteria.map(c => ({ ...c, weight: 0 })) };
      if (editId) await updateTemplate(editId, payload);
      else await createTemplate(payload);
      toast.success(editId ? 'Cập nhật thành công' : 'Tạo mẫu KPI thành công');
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi lưu');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (departmentIds) => {
    const label = departmentIds.length ? `${departmentIds.length} phòng ban` : 'tất cả phòng ban';
    if (!window.confirm(`Thu hồi mẫu KPI khỏi ${label}?`)) return;
    try {
      await api.post(`/kpi-templates/${sendTarget.id}/revoke`, { departmentIds });
      toast.success(`Đã thu hồi khỏi ${label}`);
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi thu hồi');
    }
  };

  const handleDelete = async () => {
    try { await deleteTemplate(confirmDelete.id); toast.success('Xóa thành công'); setConfirmDelete(null); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Lỗi xóa'); }
  };

  // Tên nhóm đang active
  const activeGroupName = activeGroup === 'all'
    ? null
    : parentDepts.find(d => d.id === activeGroup)?.name;

  return (
    <>
      <Header title="Mẫu KPI" subtitle="Quản lý form đánh giá KPI"
        actions={<button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} /> Tạo mẫu KPI</button>} />

      <div className="page-content">

        {/* ── Bộ lọc theo nhóm phòng ban ── */}
        {parentDepts.length > 0 && (
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16,
            padding: '12px 16px', background: 'var(--surface-2)',
            borderRadius: 12, border: '1px solid var(--border)'
          }}>
            {/* Nút "Tất cả" */}
            <button
              onClick={() => setActiveGroup('all')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 20, cursor: 'pointer', border: 'none',
                fontSize: 13, fontWeight: activeGroup === 'all' ? 700 : 500,
                background: activeGroup === 'all' ? '#eb1010' : 'var(--surface-3)',
                color: activeGroup === 'all' ? '#fff' : 'var(--text-2)',
                transition: 'all 0.15s',
              }}
            >
              <Layers size={13} />
              Tất cả
              <span style={{
                background: activeGroup === 'all' ? 'rgba(254, 254, 254, 0.85)' : 'var(--border)',
                color: activeGroup === 'all' ? '#e30d0de1' : 'var(--text-3)',
                borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                marginLeft: 2
              }}>
                {templates.length}
              </span>
            </button>

            {/* Nút từng nhóm/khối */}
            {parentDepts.map((dept, idx) => {
              const color = GROUP_COLORS[idx % GROUP_COLORS.length];
              const isActive = activeGroup === dept.id;
              const count = countByGroup(dept.id);
              return (
                <button
                  key={dept.id}
                  onClick={() => setActiveGroup(dept.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                    border: `1.5px solid ${isActive ? color.border : 'transparent'}`,
                    background: isActive ? color.bg : 'var(--surface-3)',
                    color: isActive ? color.text : 'var(--text-2)',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: isActive ? color.dot : 'var(--text-3)',
                    flexShrink: 0
                  }} />
                  {dept.name}
                  {count > 0 && (
                    <span style={{
                      background: isActive ? color.border : 'var(--border)',
                      color: isActive ? color.text : 'var(--text-3)',
                      borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                      marginLeft: 2
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Nhãn bộ lọc đang active ── */}
        {activeGroup !== 'all' && activeGroupName && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            fontSize: 13, color: 'var(--text-3)'
          }}>
            <Building2 size={13} />
            Đang xem: <strong style={{ color: 'var(--text-1)' }}>{activeGroupName}</strong>
            <span>—</span>
            <span>{filteredTemplates.length} mẫu KPI</span>
            <button
              onClick={() => setActiveGroup('all')}
              style={{ marginLeft: 4, fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Xóa lọc ×
            </button>
          </div>
        )}

        {/* ── Danh sách template ── */}
        {loading
          ? <div className="loading-page"><div className="spinner spinner-lg" /></div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredTemplates.length === 0
                ? (
                  <div className="card">
                    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>
                      {activeGroup !== 'all'
                        ? `Chưa có mẫu KPI nào được gửi cho khối "${activeGroupName}"`
                        : 'Chưa có mẫu KPI nào'
                      }
                    </div>
                  </div>
                )
                : filteredTemplates.map(t => (
                  <div key={t.id} className="card">
                    <div className="card-header">
                      <div style={{ flex: 1 }}>
                        <div className="flex gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                          <div className="card-title">{t.name}</div>
                          {t.isDefault && <span className="badge" style={{ background: '#eff6ff', color: 'var(--primary)' }}>Mặc định</span>}
                          <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>
                            {t.period === 'monthly' ? 'Tháng' : t.period === 'quarterly' ? 'Quý' : 'Năm'}
                          </span>
                          {/* Badge nhóm phòng ban */}
                          {t.departmentId && (() => {
                            const dept = depts.find(d => d.id === t.departmentId);
                            const parentIdx = parentDepts.findIndex(d => d.id === t.departmentId || d.id === dept?.parentId);
                            const color = GROUP_COLORS[(parentIdx >= 0 ? parentIdx : 0) % GROUP_COLORS.length];
                            return dept ? (
                              <span style={{
                                fontSize: 11, fontWeight: 700,
                                background: color.bg, color: color.text,
                                border: `1px solid ${color.border}`,
                                borderRadius: 20, padding: '2px 9px',
                                display: 'inline-flex', alignItems: 'center', gap: 4
                              }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: color.dot }} />
                                {dept.name}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        {t.description && <div className="card-subtitle">{t.description}</div>}
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                          {t.criteria?.length || 0} tiêu chí
                        </div>

                        {/* Hiển thị phòng ban đã gửi — khối cha → phòng con */}
                        {t.assignments?.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            {parentDepts.map((parent, idx) => {
                              const color = GROUP_COLORS[idx % GROUP_COLORS.length];
                              const sentDeptIds = t.assignments.map(a => a.departmentId || a.department?.id).filter(Boolean);
                              // Các phòng CON của khối này đã được gửi
                              const sentChildren = depts.filter(d => d.parentId === parent.id && sentDeptIds.includes(d.id));
                              const parentSent = sentDeptIds.includes(parent.id);
                              if (!parentSent && !sentChildren.length) return null;
                              // Tên hiển thị bên phải mũi tên
                              const sentNames = sentChildren.length ? sentChildren.map(d => d.name) : [parent.name];
                              return (
                                <div key={parent.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                                  <span style={{
                                    fontSize: 11, fontWeight: 700, color: color.text,
                                    background: color.bg, border: `1px solid ${color.border}`,
                                    borderRadius: 20, padding: '1px 8px'
                                  }}>
                                    {parent.name}
                                  </span>
                                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>→</span>
                                  {sentNames.map(name => (
                                    <span key={name} style={{
                                      fontSize: 11, background: '#f0fdf4', color: 'var(--success)',
                                      border: '1px solid #bbf7d0', borderRadius: 20, padding: '2px 8px'
                                    }}>
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => ({ ...e, [t.id]: !e[t.id] }))}>
                          {expanded[t.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Chi tiết
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ background: '#E8192C', color: '#fff', borderColor: '#E8192C' }}
                          onClick={() => openSend(t)}
                          title="Gửi cho phòng ban"
                        >
                          <Send size={13} /> Gửi
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

      {/* ── Modal Gửi cho phòng ban ── */}
      <Modal
        open={modal === 'send'}
        onClose={() => setModal(null)}
        title={`Gửi mẫu KPI: ${sendTarget?.name}`}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModal(null)}>Hủy</button>
          <button
            className="btn btn-primary"
            style={{ background: '#E8192C', borderColor: '#E8192C' }}
            onClick={handleSend}
            disabled={sending}
          >
            <Send size={13} /> {sending ? 'Đang gửi...' : `Gửi cho ${selectedDepts.length} phòng ban`}
          </button>
        </>}
      >
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
          Chọn phòng ban sẽ thấy và sử dụng mẫu KPI này.
        </p>

        {/* Nhóm theo phòng ban cha */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 420, overflowY: 'auto' }}>
          {parentDepts.map((parent, idx) => {
            const color = GROUP_COLORS[idx % GROUP_COLORS.length];
            const children = depts.filter(d => d.parentId === parent.id);
            const allDepts = [parent, ...children];
            const allIds = allDepts.map(d => d.id);
            const selectedInGroup = allIds.filter(id => selectedDepts.includes(id));
            const allSelected = selectedInGroup.length === allIds.length;

            const toggleGroup = () => {
              if (allSelected) {
                setSelectedDepts(prev => prev.filter(id => !allIds.includes(id)));
              } else {
                setSelectedDepts(prev => [...new Set([...prev, ...allIds])]);
              }
            };

            return (
              <div key={parent.id} style={{
                border: `1.5px solid ${selectedInGroup.length ? color.border : 'var(--border)'}`,
                borderRadius: 10, overflow: 'hidden',
                background: selectedInGroup.length ? color.bg : 'transparent',
                transition: 'all 0.15s'
              }}>
                {/* Header nhóm — phòng ban cha */}
                <div
                  onClick={toggleGroup}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', cursor: 'pointer',
                    borderBottom: children.length ? `1px solid ${selectedInGroup.length ? color.border : 'var(--border)'}` : 'none',
                    background: selectedInGroup.length ? color.bg : 'var(--surface-2)',
                  }}
                >
                  {allSelected
                    ? <CheckSquare size={16} color={color.dot} />
                    : selectedInGroup.length > 0
                      ? <CheckSquare size={16} color="var(--text-3)" />
                      : <Square size={16} color="var(--text-3)" />
                  }
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color.dot, flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: 13, flex: 1, color: selectedInGroup.length ? color.text : 'var(--text-1)' }}>
                    {parent.name}
                  </span>
                  {selectedInGroup.length > 0 && (
                    <span style={{
                      fontSize: 11, background: color.border, color: color.text,
                      borderRadius: 20, padding: '1px 8px', fontWeight: 700
                    }}>
                      {selectedInGroup.length}/{allIds.length}
                    </span>
                  )}
                  {(sendTarget?.assignments || []).some(a => (a.departmentId || a.department?.id) === parent.id) && (
                    <span style={{ fontSize: 11, background: '#f0fdf4', color: 'var(--success)', border: '1px solid #bbf7d0', borderRadius: 20, padding: '1px 8px' }}>
                      Đã gửi
                    </span>
                  )}
                </div>

                {/* Phòng ban con */}
                {children.length > 0 && (
                  <div style={{ padding: '6px 0' }}>
                    {children.map(child => {
                      const isSelected = selectedDepts.includes(child.id);
                      const alreadySent = (sendTarget?.assignments || []).some(a => (a.departmentId || a.department?.id) === child.id);
                      return (
                        <div
                          key={child.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '7px 14px 7px 36px',
                            background: isSelected ? `${color.bg}99` : 'transparent',
                          }}
                        >
                          <div onClick={() => toggleDept(child.id)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                            {isSelected
                              ? <CheckSquare size={15} color={color.dot} />
                              : <Square size={15} color="var(--text-3)" />
                            }
                            <Building2 size={13} color={isSelected ? color.dot : 'var(--text-3)'} />
                            <span style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, color: isSelected ? color.text : 'var(--text-2)' }}>
                              {child.name}
                            </span>
                            {alreadySent && (
                              <span style={{ fontSize: 11, background: '#f0fdf4', color: 'var(--success)', border: '1px solid #bbf7d0', borderRadius: 20, padding: '1px 8px' }}>
                                Đã gửi
                              </span>
                            )}
                          </div>
                          {alreadySent && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--danger)', fontSize: 11, padding: '2px 8px' }}
                              onClick={() => handleRevoke([child.id])}
                            >
                              Thu hồi
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {sendTarget?.assignments?.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleRevoke([])}>
              Thu hồi tất cả phòng ban
            </button>
          </div>
        )}
      </Modal>

      {/* ── Create / Edit Modal ── */}
      <Modal open={modal === 'form'} onClose={() => setModal(null)}
        title={editId ? 'Chỉnh sửa mẫu KPI' : 'Tạo mẫu KPI mới'} size="xl"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModal(null)}>Hủy</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </>}>

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
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Thuộc khối / phòng ban *</label>
              <select
                className="form-select"
                value={form.departmentId}
                onChange={e => setForm({ ...form, departmentId: e.target.value })}
              >
                <option value="">— Chọn khối —</option>
                {parentDepts.map((parent) => (
                  <option key={parent.id} value={parent.id}>{parent.name}</option>
                ))}
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

        <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 16, marginBottom: 20, border: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 13 }}>Thông tin nhân sự (hiển thị trên form)</div>
          <div style={{ border: '1px solid #ccc', borderRadius: 6, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {[['Ngày đánh giá KPI:'], ['Họ và tên nhân sự:'], ['Phòng ban:'], ['Chức danh:']].map(([label]) => (
                  <tr key={label}>
                    <td style={{ border: '1px solid #ccc', padding: '6px 10px', fontWeight: 700, background: '#f5f5f5', width: 200 }}>{label}</td>
                    <td style={{ border: '1px solid #ccc', padding: '6px 10px', color: 'var(--text-3)', fontStyle: 'italic' }}>Điền khi đánh giá</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
                          type="number" min={0} max={100}
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