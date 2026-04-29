import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { getEvaluations, deleteEvaluation } from '../../api/kpiEvaluations';
import { getDepartments } from '../../api/departments';
import { StatusBadge } from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import { useAuth } from '../../context/AuthContext';
import { formatDate, getScoreColor } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { Plus, ChevronRight, Filter, Search, Trash2 } from 'lucide-react';

const STATUS_OPTIONS = ['draft', 'submitted', 'manager_reviewed', 'director_approved', 'rejected'];
const STATUS_LABELS = {
  draft: 'Bản nháp',
  submitted: 'Đã nộp',
  manager_reviewed: 'Quản lý đã duyệt',
  director_approved: 'Đã phê duyệt',
  rejected: 'Bị từ chối'
};

function calcRank(score) {
  const t = parseFloat(score) || 0;
  if (t >= 95) return 'A';
  if (t >= 86) return 'B';
  if (t >= 76) return 'C';
  if (t >= 66) return 'D';
  if (t > 0) return 'E';
  return '';
}

export default function EvaluationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isSelfMode = location.pathname === '/employee/evaluations';

  const [evals, setEvals] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(15);
  const [departments, setDepartments] = useState([]);
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Xóa đánh giá này?')) return;
    try {
      await deleteEvaluation(id);
      toast.success('Đã xóa đánh giá');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi xóa');
    }
  };
  const canCreate = user?.role !== 'admin' && (
    !isSelfMode
      ? ['employee', 'manager', 'director'].includes(user?.role)
      : true
  );

  useEffect(() => {
    if (isSelfMode) return;
    getDepartments()
      .then(r => setDepartments(r.data.data.filter(d => !d.parentId))) // ← chỉ lấy phòng ban cha
      .catch(() => { });
  }, [isSelfMode]);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit, status: statusFilter, search, department: deptFilter };

      if (isSelfMode) {
        // Trang "KPI của tôi" → chỉ xem KPI của bản thân
        params.employeeId = user.id;
      }
      // Trang duyệt KPI → KHÔNG truyền employeeId → backend tự lọc cấp dưới thôi

      const res = await getEvaluations(params);
      setEvals(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Lỗi tải danh sách'); }
    finally { setLoading(false); }
  }, [statusFilter, deptFilter, search, limit, isSelfMode, user]);

  // Debounce 400ms cho search, immediate cho các filter còn lại
  useEffect(() => {
    const timer = setTimeout(() => load(1), 400);
    return () => clearTimeout(timer);
  }, [load]);

  const pageTitle = () => {
    if (isSelfMode) return 'KPI của tôi';
    if (user?.role === 'manager') return 'Duyệt KPI nhân viên';
    if (user?.role === 'director') return 'Phê duyệt & Chấm KPI';
    return 'Quản lý đánh giá KPI';
  };

  const getActionLabel = (ev) => {
    if (isSelfMode) return 'Xem';
    if (user?.role === 'admin') return 'Xem';
    if (user?.role === 'manager' && ev.status === 'submitted') return 'Duyệt ngay';
    if (user?.role === 'director' && ev.status === 'manager_reviewed') return 'Phê duyệt';
    if (user?.role === 'director' && ev.status === 'submitted' && ev.employee?.managerId === user.id) return 'Chấm điểm';
    return 'Xem';
  };

  return (
    <>
      <Header
        title={pageTitle()}
        subtitle={`${pagination.total} đánh giá`}
        actions={canCreate && (
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/evaluation/new')}>
            <Plus size={14} /> Tạo đánh giá
          </button>
        )}
      />

      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <div className="flex gap-2 flex-wrap" style={{ alignItems: 'center' }}>
              <Filter size={16} style={{ color: 'var(--text-3)' }} />

              {/* Tìm kiếm tên */}
                {!isSelfMode && <div style={{ position: 'relative' }}>
                <Search size={14} style={{
                  position: 'absolute', left: 8, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none'
                }} />
                <input
                  className="form-input"
                  style={{ width: 200, paddingLeft: 28 }}
                  placeholder="Tìm tên nhân viên..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>}

              {/* Phòng ban — ẩn ở selfMode */}
              {!isSelfMode && (
                <select className="form-select" style={{ width: 170 }} value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}>
                  <option value="">Tất cả phòng ban</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              )}

            {!isSelfMode && <select className="form-select" style={{ width: 190 }} value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}>
                <option value="">Tất cả trạng thái</option>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>}

            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Mẫu KPI</th>
                  <th>Kỳ</th>
                  <th>Trạng thái</th>
                  <th>Tự đánh giá</th>
                  <th>Điểm QL</th>
                  <th>Điểm cuối</th>
                  <th>Ngày nộp</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? <tr><td colSpan={9} className="table-empty">Đang tải...</td></tr>
                  : evals.length === 0
                    ? <tr><td colSpan={9} className="table-empty">Không có đánh giá nào</td></tr>
                    : evals.map(ev => (
                      <tr key={ev.id} style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/evaluation/${ev.id}`)}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{ev.employee?.fullName || '—'}</div>
                          <div className="text-sm text-muted">{ev.employee?.department}</div>
                        </td>
                        <td className="text-sm">{ev.template?.name}</td>
                        <td><span className="mono" style={{ fontSize: 12 }}>{ev.period}</span></td>
                        <td><StatusBadge status={ev.status} /></td>
                        <td>
                          {ev.selfTotalScore
                            ? <span style={{ fontWeight: 600 }}>{parseFloat(ev.selfTotalScore).toFixed(0)}</span>
                            : '—'}
                        </td>
                        <td>
                          {ev.managerTotalScore
                            ? <span style={{ fontWeight: 600 }}>{parseFloat(ev.managerTotalScore).toFixed(0)}</span>
                            : '—'}
                        </td>
                        <td>
                          {ev.finalTotalScore ? (
                            <span style={{ fontWeight: 700, color: getScoreColor(ev.finalTotalScore) }}>
                              {parseFloat(ev.finalTotalScore).toFixed(0)}
                              <span style={{
                                fontSize: 12, fontWeight: 700, marginLeft: 5,
                                background: getScoreColor(ev.finalTotalScore) + '1a',
                                color: getScoreColor(ev.finalTotalScore),
                                borderRadius: 4, padding: '1px 6px'
                              }}>
                                {calcRank(ev.finalTotalScore)}
                              </span>
                            </span>
                          ) : '—'}
                        </td>
                        <td className="text-sm text-muted">{formatDate(ev.submittedAt)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <button className="btn btn-ghost btn-sm"
                              onClick={e => { e.stopPropagation(); navigate(`/evaluation/${ev.id}`); }}>
                              {getActionLabel(ev)} <ChevronRight size={13} />
                            </button>

                            {/* Admin xóa được tất cả, user chỉ xóa draft/rejected của mình */}
                            {(user?.role === 'admin' ||
                              (['draft', 'rejected'].includes(ev.status) && ev.employee?.id === user?.id)
                            ) && (
                                <button
                                  className="btn btn-ghost btn-sm btn-icon"
                                  style={{ color: 'var(--danger)' }}
                                  title="Xóa đánh giá"
                                  onClick={e => handleDelete(e, ev.id)}>
                                  <Trash2 size={13} />
                                </button>
                              )}
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
    </>
  );
}