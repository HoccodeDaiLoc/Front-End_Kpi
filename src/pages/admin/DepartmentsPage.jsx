import React, { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../../api/departments';
import { userAPI } from '../../api';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Building2, Network, UserCheck, UserX } from 'lucide-react';
import './DepartmentsPage.scss';

function buildTree(depts) {
  const map = {};
  const roots = [];
  depts.forEach(d => { map[d.id] = { ...d, children: [] }; });
  depts.forEach(d => {
    if (d.parentId && map[d.parentId]) map[d.parentId].children.push(map[d.id]);
    else roots.push(map[d.id]);
  });
  return roots;
}

function TreeNode({ node, level = 0, onEdit, onDelete, onAddChild, onEditHead }) {
  const [open, setOpen] = useState(false);
  const hasChildren = node.children?.length > 0;
  const indent = level * 28;
  const nameClass = level === 0 ? 'dept-tree-name--root' : hasChildren ? 'dept-tree-name--branch' : 'dept-tree-name--leaf';

  return (
    <div>
      <div 
  className="dept-tree-row" 
  style={{ paddingLeft: 16 + indent }}
  onClick={() => hasChildren && setOpen(o => !o)}  
>
        {/* Toggle */}
        <div className={`dept-tree-toggle ${!hasChildren ? 'dept-tree-toggle--empty' : ''}`}
          onClick={() => hasChildren && setOpen(o => !o)}>
          {hasChildren
            ? (open ? <ChevronDown size={14} style={{ color: 'var(--text-3)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-3)' }} />)
            : <span style={{ width: 14, display: 'inline-block' }} />
          }
        </div>

        {/* Icon */}
<div className="dept-tree-icon">
  {level === 0
    ? <Building2 size={15} color="var(--primary)" />
    : <Network size={14} color="#8b5cf6" />
  }
</div>

        {/* Name + head info */}
        <div className={`dept-tree-name ${nameClass}`} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <span>
            {node.name}
            {node.code && <span className="dept-tree-code">({node.code})</span>}
            {node.members?.length > 0 && <span className="dept-tree-count">· {node.members.length} nhân viên</span>}
          </span>
          {/* Hiển thị lãnh đạo */}
          {node.head ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: '#fff',
              background: '#ef4444',
              border: '1px solid #dc2626',
              borderRadius: 20, padding: '2px 8px'
            }}>
              <UserCheck size={11} />
              {node.head.fullName}
            </span>
          ) : (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: 'var(--text-3)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 20, padding: '2px 8px'
            }}>
              <UserX size={11} />
              Chưa có lãnh đạo
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="dept-tree-actions">
          <button className="btn btn-ghost btn-sm btn-icon" title="Gán lãnh đạo" onClick={() => onEditHead(node)}>
            <UserCheck size={13} />
          </button>
          <button className="btn btn-ghost btn-sm btn-icon" title="Thêm phòng con" onClick={() => onAddChild(node)}>
            <Plus size={13} />
          </button>
          <button className="btn btn-ghost btn-sm btn-icon" title="Sửa" onClick={() => onEdit(node)}>
            <Edit2 size={13} />
          </button>
          <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }} title="Xóa" onClick={() => onDelete(node)}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {hasChildren && open && (
        <div>
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} level={level + 1}
              onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} onEditHead={onEditHead} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DepartmentsPage() {
  const [depts, setDepts] = useState([]);
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editNode, setEditNode] = useState(null);
  const [parentNode, setParentNode] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
 const [headSearch, setHeadSearch] = useState('');
  // Head modal state
  const [headModal, setHeadModal] = useState(null); // node đang gán lãnh đạo
  const [allUsers, setAllUsers] = useState([]);
  const [selectedHeadId, setSelectedHeadId] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getDepartments();
      setDepts(res.data.data);
      setTree(buildTree(res.data.data));
    } catch { toast.error('Lỗi tải phòng ban'); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setForm({ name: '', code: '', description: '' });
    setEditNode(null); setParentNode(null);
    setModal('form');
  };

  const openAddChild = (parent) => {
    setForm({ name: '', code: '', description: '' });
    setEditNode(null); setParentNode(parent);
    setModal('form');
  };

  const openEdit = (node) => {
    setForm({ name: node.name, code: node.code || '', description: node.description || '' });
    setEditNode(node); setParentNode(null);
    setModal('form');
  };

  const openEditHead = async (node) => {
    setHeadModal(node);
    setSelectedHeadId(node.head?.id || '');
    setHeadSearch(''); 
    setLoadingUsers(true);
    try {
      const res = await userAPI.getUsers({ limit: 200, isActive: true });
      setAllUsers(res.data.data || []);
    } catch { toast.error('Lỗi tải danh sách nhân viên'); }
    finally { setLoadingUsers(false); }
  };

  const handleSaveHead = async () => {
    setSaving(true);
    try {
      await updateDepartment(headModal.id, {
        name: headModal.name,
        code: headModal.code,
        description: headModal.description,
        parentId: headModal.parentId,
        headId: selectedHeadId || null,
      });
      toast.success(selectedHeadId ? 'Đã gán lãnh đạo thành công' : 'Đã xóa lãnh đạo');
      setHeadModal(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
    finally { setSaving(false); }
  };

const handleSave = async () => {
  if (!form.name) return toast.error('Tên phòng ban bắt buộc');
  setSaving(true);
  try {
    if (editNode) {
      await updateDepartment(editNode.id, {
        ...form,
        parentId: editNode.parentId ?? null, // ← giữ nguyên parentId cũ
        headId: editNode.headId ?? null,      // ← giữ nguyên headId cũ
      });
    } else {
      await createDepartment({ ...form, parentId: parentNode?.id || null });
    }
    toast.success(editNode ? 'Cập nhật thành công' : 'Tạo phòng ban thành công');
    setModal(null); load();
  } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  finally { setSaving(false); }
};
  const handleDelete = async () => {
    try {
      await deleteDepartment(confirmDelete.id);
      toast.success('Xóa thành công');
      setConfirmDelete(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi xóa'); }
  };

  const modalTitle = editNode
    ? 'Sửa phòng ban'
    : parentNode ? `Thêm phòng con vào: ${parentNode.name}`
      : 'Thêm khối / phòng ban gốc';

  return (
    <>
      <Header title="Cơ cấu tổ chức" subtitle={`${depts.length} phòng ban`}
        actions={<button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} /> Thêm</button>} />

      <div className="page-content">
        <div className="card">
          {loading
            ? <div className="loading-page"><div className="spinner spinner-lg" /></div>
            : tree.length === 0
              ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>Chưa có phòng ban nào</div>
              : tree.map(node => (
                <TreeNode key={node.id} node={node}
                  onEdit={openEdit} onDelete={setConfirmDelete}
                  onAddChild={openAddChild} onEditHead={openEditHead} />
              ))
          }
        </div>
      </div>

      {/* Modal thêm/sửa phòng ban */}
      <Modal open={modal === 'form'} onClose={() => setModal(null)} title={modalTitle}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModal(null)}>Hủy</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </>}>
        {parentNode && (
          <div className="alert alert-info" style={{ marginBottom: 16, fontSize: 12 }}>
            Thuộc: <strong>{parentNode.name}</strong>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Tên *</label>
          <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Mã</label>
          <input className="form-input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="VD: KD, KT, HR..." />
        </div>
        <div className="form-group">
          <label className="form-label">Mô tả</label>
          <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
      </Modal>

      {/* Modal gán lãnh đạo */}
      <Modal open={!!headModal} onClose={() => setHeadModal(null)}
        title={`Lãnh đạo phòng: ${headModal?.name}`}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setHeadModal(null)}>Hủy</button>
          {headModal?.head && (
            <button className="btn btn-danger btn-sm" onClick={() => { setSelectedHeadId(''); }} style={{ marginRight: 'auto' }}>
              <UserX size={13} /> Xóa lãnh đạo
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSaveHead} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </>}>

      {headModal?.head && (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'var(--bg-2, #f8fafc)',
    border: '1px solid var(--border)',
    borderRadius: 10, padding: '12px 16px', marginBottom: 16
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: '50%',
      background: 'var(--primary)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: 16, flexShrink: 0
    }}>
      {headModal.head.fullName?.charAt(0)}
    </div>
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>Lãnh đạo hiện tại</div>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{headModal.head.fullName}</div>
      {headModal.head.position && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{headModal.head.position}</div>}
      {headModal.head.email && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{headModal.head.email}</div>}
    </div>
  </div>
)}
        {/* Tìm kiếm + chọn lãnh đạo */}
<div className="form-group">
  <label className="form-label">Chọn lãnh đạo mới</label>
  {loadingUsers ? (
    <div style={{ padding: 16, textAlign: 'center' }}><div className="spinner" /></div>
  ) : (
    <>
      {/* Ô search */}
      <input
        className="form-input"
        placeholder=" Tìm theo tên, email, chức vụ..."
        value={headSearch}
        onChange={e => setHeadSearch(e.target.value)}
        style={{ marginBottom: 8 }}
        autoFocus
      />

      {/* Danh sách kết quả */}
      <div style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        maxHeight: 260,
        overflowY: 'auto',
      }}>
        {/* Option không có lãnh đạo */}
        <div
          onClick={() => setSelectedHeadId('')}
          style={{
            padding: '10px 14px',
            cursor: 'pointer',
            fontSize: 13,
            color: 'var(--text-3)',
            borderBottom: '1px solid var(--border)',
            background: selectedHeadId === '' ? 'var(--primary-light, #eff6ff)' : 'transparent',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <UserX size={14} />
          — Không có lãnh đạo —
        </div>

        {/* Danh sách nhân viên đã lọc */}
        {allUsers
          .filter(u => {
            const q = headSearch.toLowerCase();
            return (
              u.fullName?.toLowerCase().includes(q) ||
              u.email?.toLowerCase().includes(q) ||
              u.position?.toLowerCase().includes(q)
            );
          })
          .map(u => (
            <div
              key={u.id}
              onClick={() => setSelectedHeadId(u.id)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                background: selectedHeadId === u.id ? 'var(--primary-light, #eff6ff)' : 'transparent',
                display: 'flex', alignItems: 'center', gap: 10,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (selectedHeadId !== u.id) e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { if (selectedHeadId !== u.id) e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Avatar chữ cái */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: selectedHeadId === u.id ? 'var(--primary)' : 'var(--surface-2)',
                color: selectedHeadId === u.id ? '#fff' : 'var(--text-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13, flexShrink: 0,
                transition: 'all 0.15s',
              }}>
                {u.fullName?.charAt(0) || '?'}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{u.fullName || u.email}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {[u.position, u.department].filter(Boolean).join(' · ') || u.email}
                </div>
              </div>

              {/* Check icon nếu đang chọn */}
              {selectedHeadId === u.id && (
                <UserCheck size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
              )}
            </div>
          ))
        }

        {/* Không tìm thấy */}
        {headSearch && allUsers.filter(u => {
          const q = headSearch.toLowerCase();
          return u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.position?.toLowerCase().includes(q);
        }).length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            Không tìm thấy nhân viên nào
          </div>
        )}
      </div>
    </>
  )}
</div>
      </Modal>

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete}
        title="Xóa phòng ban" message={`Xóa "${confirmDelete?.name}"? Các phòng con sẽ bị mất liên kết.`} />
    </>
  );
}