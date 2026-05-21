// MyProposalsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { getMyProposals } from '../../api/proposals';
import toast from 'react-hot-toast';
import { ClipboardList, Clock, CheckCircle, ChevronRight } from 'lucide-react';

export default function MyProposalsPage() {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyProposals()
      .then(r => setProposals(r.data.data))
      .catch(() => toast.error('Không tải được dữ liệu'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header title="Khảo sát của tôi" subtitle={`${proposals.length} khảo sát`} />
      <div className="page-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner spinner-lg" /></div>
        ) : !proposals.length ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 0' }}>
            <ClipboardList size={36} color="var(--text-3)" style={{ margin: '0 auto 10px' }} />
            <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Chưa có khảo sát nào</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {proposals.map(p => {
              const done = p.answered_count >= p.question_count && p.question_count > 0;
              return (
                <div key={p.id} className="card"
                  onClick={() => !done && p.status === 'active' && navigate(`/my-proposals/${p.id}/take`)}
                  style={{ padding: '16px 20px', cursor: done || p.status === 'closed' ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: done ? '#f0fdf4' : p.status === 'active' ? '#eff6ff' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {done
                      ? <CheckCircle size={20} color="#16a34a" />
                      : <ClipboardList size={20} color={p.status === 'active' ? '#3b82f6' : '#94a3b8'} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3, display: 'flex', gap: 12 }}>
                      {p.deadline && <span><Clock size={11} style={{ display: 'inline', marginRight: 3 }} />{new Date(p.deadline).toLocaleDateString('vi-VN')}</span>}
                      <span>{p.question_count} câu hỏi</span>
                      <span style={{ color: done ? '#16a34a' : '#f59e0b', fontWeight: 600 }}>
                        {done ? '✓ Đã trả lời' : p.status === 'closed' ? 'Đã đóng' : 'Chưa trả lời'}
                      </span>
                    </div>
                  </div>
                  {!done && p.status === 'active' && <ChevronRight size={16} color="var(--text-3)" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}