import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { getEvaluations } from '../../api/kpiEvaluations';
import { getTemplates } from '../../api/kpiTemplates';
import { StatusBadge } from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import { useAuth } from '../../context/AuthContext';
import { formatDate, getScoreColor, getScoreLabel } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { Plus, Eye, ChevronRight, Filter } from 'lucide-react';

const STATUS_OPTIONS = ['draft','submitted','manager_reviewed','director_approved','rejected'];

export default function EvaluationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [evals, setEvals] = useState([]);
  const [pagination, setPagination] = useState({ page:1, totalPages:1, total:0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [templates, setTemplates] = useState([]);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await getEvaluations({ page, limit:15, status: statusFilter });
      setEvals(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Lỗi tải danh sách'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(1); }, [load]);
  useEffect(() => { getTemplates({ isActive: true }).then(r => setTemplates(r.data.data)).catch(()=>{}); }, []);

  const canCreate = ['employee','manager','admin'].includes(user?.role);

  const getActionLabel = (status) => {
    if (user?.role === 'manager' && status === 'submitted') return 'Duyệt ngay';
    if (user?.role === 'director' && status === 'manager_reviewed') return 'Phê duyệt';
    return 'Xem';
  };

  return (
    <>
      <Header title={user?.role === 'employee' ? 'KPI của tôi' : user?.role === 'manager' ? 'Duyệt KPI nhân viên' : 'Quản lý đánh giá KPI'}
        subtitle={`${pagination.total} đánh giá`}
        actions={canCreate && <button className="btn btn-primary btn-sm" onClick={() => navigate('/evaluation/new')}><Plus size={14}/> Tạo đánh giá</button>} />
      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <div className="flex gap-2 flex-wrap">
              <Filter size={16} style={{color:'var(--text-3)'}} />
              <select className="form-select" style={{width:180}} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">Tất cả trạng thái</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'draft' ? 'Bản nháp' : s === 'submitted' ? 'Đã nộp' : s === 'manager_reviewed' ? 'Quản lý đã duyệt' : s === 'director_approved' ? 'Đã phê duyệt' : 'Bị từ chối'}</option>)}
              </select>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Nhân viên</th><th>Mẫu KPI</th><th>Kỳ</th><th>Trạng thái</th><th>Điểm TĐ</th><th>Điểm QL</th><th>Điểm cuối</th><th>Ngày nộp</th><th></th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={9} className="table-empty">Đang tải...</td></tr> :
                 evals.length === 0 ? <tr><td colSpan={9} className="table-empty">Không có đánh giá nào</td></tr> :
                 evals.map(ev => (
                  <tr key={ev.id} style={{cursor:'pointer'}} onClick={() => navigate(`/evaluation/${ev.id}`)}>
                    <td>
                      <div style={{fontWeight:600}}>{ev.employee?.fullName || '—'}</div>
                      <div className="text-sm text-muted">{ev.employee?.department}</div>
                    </td>
                    <td className="text-sm">{ev.template?.name}</td>
                    <td><span className="mono" style={{fontSize:12}}>{ev.period}</span></td>
                    <td><StatusBadge status={ev.status} /></td>
                    <td>{ev.selfTotalScore ? <span style={{fontWeight:600}}>{parseFloat(ev.selfTotalScore).toFixed(2)}</span> : '—'}</td>
                    <td>{ev.managerTotalScore ? <span style={{fontWeight:600}}>{parseFloat(ev.managerTotalScore).toFixed(2)}</span> : '—'}</td>
                    <td>{ev.finalTotalScore ? <span style={{fontWeight:700,color:getScoreColor(ev.finalTotalScore)}}>{parseFloat(ev.finalTotalScore).toFixed(2)}</span> : '—'}</td>
                    <td className="text-sm text-muted">{formatDate(ev.submittedAt)}</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); navigate(`/evaluation/${ev.id}`); }}>{getActionLabel(ev.status)} <ChevronRight size={13}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{padding:'12px 20px'}}>
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={load} />
          </div>
        </div>
      </div>
    </>
  );
}
