import React, { useState, useEffect, useCallback } from 'react';
import Header from '../../components/layout/Header';
import { getUsers, updateUser, deleteUser, resendActivation, getManagers } from '../../api/users';
import { createAccount } from '../../api/auth';
import { getDepartments } from '../../api/departments';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import { RoleBadge } from '../../components/common/Badge';
import { formatDate, getRoleLabel } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, Mail } from 'lucide-react';

const ROLES = ['employee', 'manager', 'director', 'admin'];

function buildDeptOptions(depts) {
  const map = {};
  const roots = [];
  depts.forEach(d => { map[d.id] = { ...d, children: [] }; });
  depts.forEach(d => {
    if (d.parentId && map[d.parentId]) map[d.parentId].children.push(map[d.id]);
    else roots.push(map[d.id]);
  });
  const result = [];
  const flatten = (node, level = 0) => {
    result.push({ id: node.id, name: node.name, level, parentId: node.parentId, headId: node.headId });
    node.children.forEach(c => flatten(c, level + 1));
  };
  roots.forEach(r => flatten(r));
  return result;
}

function DeptSelect({ value, onChange, depts, placeholder = 'Chọn phòng ban' }) {
  const options = buildDeptOptions(depts);
  return (
    <select className="form-select" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.id} value={o.name}>
          {'　'.repeat(o.level)}{o.level > 0 ? '└ ' : ''}{o.name}
        </option>
      ))}
    </select>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    email: '', fullName: '', role: 'employee', position: '',
    department: '', isActive: true, directManagerId: '', directorId: ''
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [depts, setDepts] = useState([]);
  const [managers, setManagers] = useState([]);

  useEffect(() => {
    getDepartments().then(r => setDepts(r.data.data)).catch(() => {});
    getManagers().then(r => setManagers(r.data.data)).catch(() => {});
  }, []);

  // ── Tự động resolve directorId khi chọn phòng ban ──────────────────────────
  const resolveDirectorIdFromDept = useCallback((deptName) => {
    if (!deptName || depts.length === 0) return '';

    const selected = depts.find(d => d.name === deptName);
    if (!selected) return '';

    if (selected.parentId) {
      // Phòng con → lấy headId của phòng cha
      const parent = depts.find(d => d.id === selected.parentId);
      return parent?.headId || '';
    }
    // Phòng gốc → lấy headId của chính nó
    return selected.headId || '';
  }, [depts]);

  // Khi chọn phòng ban → tự điền directorId
  const handleDeptChange = (deptName) => {
    const directorId = resolveDirectorIdFromDept(deptName);
    setForm(f => ({ ...f, department: deptName, directorId }));
  };

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await getUsers({ page, limit: 15, search, role: roleFilter });
      setUsers(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Không tải được danh sách user'); }
    finally { setLoading(false); }
  }, [search, roleFilter]);

  useEffect(() => { load(1); }, [load]);

  const openCreate = () => {
    setForm({
      email: '', fullName: '', role: 'employee', position: '',
      department: '', isActive: true, directManagerId: '', directorId: ''
    });
    setModal('create');
  };

  const openEdit = (u) => {
    setSelected(u);
    setForm({
      fullName: u.fullName || '',
      role: u.role,
      position: u.position || '',
      department: u.department || '',
      isActive: u.isActive,
      directManagerId: u.directManagerId || '',
      directorId: u.directorId || ''
    });
    setModal('edit');
  };

  const handleCreate = async () => {
    if (!form.email) return toast.error('Email bắt buộc');
    setSaving(true);
    try {
      await createAccount(form);
      toast.success('Tạo tài khoản thành công! Email kích hoạt đã được gửi.');
      setModal(null); load(1);
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi tạo tài khoản'); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      await updateUser(selected.id, form);
      toast.success('Cập nhật thành công');
      setModal(null); load(pagination.page);
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi cập nhật'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await deleteUser(confirmDelete.id);
      toast.success('Xóa user thành công');
      setConfirmDelete(null); load(1);
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi xóa user'); }
  };

  const handleResend = async (id) => {
    try { await resendActivation(id); toast.success('Email kích hoạt đã được gửi lại'); }
    catch (err) { toast.error(err.response?.data?.message || 'Lỗi gửi email'); }
  };

  const managerList = managers.filter(m => ['manager', 'employee', 'director', 'admin'].includes(m.role));
  const directorList = managers.filter(m => m.role === 'director');

  const ManagerSelect = () => (
    <div className="form-group">
      <label className="form-label">Quản lý trực tiếp</label>
      <select
        className="form-select"
        value={form.directManagerId}
        onChange={e => setForm(f => ({ ...f, directManagerId: e.target.value }))}
      >
        <option value="">— Không có —</option>
        {managerList.map(m => (
          <option key={m.id} value={m.id}>
            {m.fullName} ({m.position || getRoleLabel(m.role)})
          </option>
        ))}
      </select>
    </div>
  );

  // DirectorDisplay: tự động điền, vẫn cho phép override thủ công
  const DirectorDisplay = () => (
    <div className="form-group">
      <label className="form-label">
        Ban lãnh đạo phụ trách
        {form.directorId && (
          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--success)', fontWeight: 400 }}>
            Tự động từ phòng ban
          </span>
        )}
      </label>
      <select
        className="form-select"
        value={form.directorId}
        onChange={e => setForm(f => ({ ...f, directorId: e.target.value }))}
        style={form.directorId ? { borderColor: 'var(--success)', background: '#f0fdf4' } : {}}
      >
        <option value="">— Chưa xác định —</option>
        {directorList.map(d => (
          <option key={d.id} value={d.id}>
            {d.fullName} ({d.position || getRoleLabel(d.role)})
          </option>
        ))}
      </select>
      {!form.directorId && form.department && (
        <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
          ⚠ Phòng ban này chưa có ban lãnh đạo — hãy cài đặt trong mục Phòng ban
        </div>
      )}
    </div>
  );

  return (
    <>
      <Header title="Quản lý User" subtitle={`${pagination.total} tài khoản`}
        actions={<button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} /> Thêm user</button>} />

      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <div className="filter-bar" style={{ margin: 0 }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                <input className="form-input" placeholder="Tìm kiếm..." value={search}
                  onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36, width: 240 }} />
              </div>
              <select className="form-select" style={{ width: 160 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <option value="">Tất cả vai trò</option>
                {ROLES.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
              </select>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nhân viên</th><th>Vai trò</th><th>Chức vụ</th>
                  <th>Phòng ban</th><th>Trạng thái</th><th>Ngày tạo</th><th></th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? <tr><td colSpan={7} className="table-empty">Đang tải...</td></tr>
                  : users.length === 0
                    ? <tr><td colSpan={7} className="table-empty">Không có dữ liệu</td></tr>
                    : users.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{u.fullName || '—'}</div>
                          <div className="text-sm text-muted">{u.email}</div>
                        </td>
                        <td><RoleBadge role={u.role} /></td>
                        <td>{u.position || '—'}</td>
                        <td>{u.department || '—'}</td>
                        <td>
                          <span className="badge" style={{
                            background: u.isActive ? '#f0fdf4' : '#fef2f2',
                            color: u.isActive ? 'var(--success)' : 'var(--danger)'
                          }}>
                            {u.isActive ? 'Hoạt động' : 'Chưa kích hoạt'}
                          </span>
                        </td>
                        <td className="text-sm text-muted">{formatDate(u.createdAt)}</td>
                        <td>
                          <div className="flex gap-2">
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(u)}><Edit2 size={14} /></button>
                            {!u.isActive && (
                              <button className="btn btn-ghost btn-sm btn-icon" title="Gửi lại email" onClick={() => handleResend(u.id)}>
                                <Mail size={14} />
                              </button>
                            )}
                            <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={() => setConfirmDelete(u)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>

          <div style={{ padding: '12px 20px' }}>
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={load} />
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        open={modal === 'create'}
        onClose={() => setModal(null)}
        title="Thêm tài khoản mới"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModal(null)}>Hủy</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input className="form-input" type="email" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="email@company.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Họ tên</label>
          <input className="form-input" value={form.fullName}
            onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Vai trò</label>
            <select className="form-select" value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Chức vụ</label>
            <input className="form-input" value={form.position}
              onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Phòng ban</label>
          <DeptSelect value={form.department} onChange={handleDeptChange} depts={depts} />
        </div>
        <ManagerSelect />
        <DirectorDisplay />
        <div className="alert alert-info" style={{ fontSize: 12 }}>
          <Mail size={14} /> Email kích hoạt sẽ được gửi tự động.
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={modal === 'edit'}
        onClose={() => setModal(null)}
        title="Chỉnh sửa user"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModal(null)}>Hủy</button>
          <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">Họ tên</label>
          <input className="form-input" value={form.fullName}
            onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Vai trò</label>
            <select className="form-select" value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Trạng thái</label>
            <select className="form-select" value={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}>
              <option value="true">Hoạt động</option>
              <option value="false">Vô hiệu hóa</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Chức vụ</label>
          <input className="form-input" value={form.position}
            onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Phòng ban</label>
          <DeptSelect value={form.department} onChange={handleDeptChange} depts={depts} />
        </div>
        <ManagerSelect />
        <DirectorDisplay />
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Xóa user"
        message={`Bạn có chắc muốn xóa tài khoản "${confirmDelete?.fullName || confirmDelete?.email}"?`}
      />
    </>
  );
}