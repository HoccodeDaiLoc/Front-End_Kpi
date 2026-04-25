import React, { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../../api/departments';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Building2, FolderOpen, Folder } from 'lucide-react';
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

function TreeNode({ node, level = 0, onEdit, onDelete, onAddChild }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children?.length > 0;
  const indent = level * 28;
  const nameClass = level === 0 ? 'dept-tree-name--root' : hasChildren ? 'dept-tree-name--branch' : 'dept-tree-name--leaf';

  return (
    <div>
      <div className="dept-tree-row" style={{ paddingLeft: 16 + indent }}>
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
            : hasChildren
              ? <FolderOpen size={14} color="var(--warning)" />
              : <Folder size={14} color="var(--text-3)" />
          }
        </div>

        {/* Name */}
        <div className={`dept-tree-name ${nameClass}`}>
          {node.name}
          {node.code && <span className="dept-tree-code">({node.code})</span>}
          {node.members?.length > 0 && <span className="dept-tree-count">· {node.members.length} nhân viên</span>}
        </div>

        {/* Actions */}
        <div className="dept-tree-actions">
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
              onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} />
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

  const handleSave = async () => {
    if (!form.name) return toast.error('Tên phòng ban bắt buộc');
    setSaving(true);
    try {
      if (editNode) await updateDepartment(editNode.id, form);
      else await createDepartment({ ...form, parentId: parentNode?.id || null });
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
                    onEdit={openEdit} onDelete={setConfirmDelete} onAddChild={openAddChild} />
                ))
          }
        </div>
      </div>

      <Modal open={modal === 'form'} onClose={() => setModal(null)} title={modalTitle}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModal(null)}>Hủy</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </>}>
        {parentNode && (
          <div className="alert alert-info" style={{ marginBottom: 16, fontSize: 12 }}>
            📁 Phòng cha: <strong>{parentNode.name}</strong>
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

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete}
        title="Xóa phòng ban" message={`Xóa "${confirmDelete?.name}"? Các phòng con sẽ bị mất liên kết.`} />
    </>
  );
}