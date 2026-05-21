import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/layout/Header';
import {
    getProposals, getProposalById, createProposal, deleteProposal, closeProposal, updateProposal,
    sendProposalToDept, revokeProposalFromDept
} from '../../api/proposals';
import { getDepartments } from '../../api/departments';
import toast from 'react-hot-toast';
import {
    Plus, Trash2, BarChart2, XCircle, Search, ClipboardList,
    Clock, Users, CheckCircle, ChevronRight, X, Pencil, Send, RotateCcw, Building2
} from 'lucide-react';

const StatusBadge = ({ status }) => {
    const cfg = status === 'active'
        ? { label: 'Đang mở', color: '#16a34a', bg: '#f0fdf4' }
        : { label: 'Đã đóng', color: '#6b7280', bg: '#f3f4f6' };
    return (
        <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 20 }}>
            {cfg.label}
        </span>
    );
};

// ── Shared Form Steps ────────────────────────────────────────
function ProposalFormModal({ mode = 'create', initial, onClose, onSaved, departments, user }) {
    const isEdit = mode === 'edit';
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
        title: initial?.title || '',
        description: initial?.description || '',
        deadline: initial?.deadline ? initial.deadline.slice(0, 16) : '',
    });
    const [questions, setQuestions] = useState(
        initial?.questions?.length
            ? initial.questions.map(q => ({
                ...q,
                options: q.question_type === 'multiple_choice'
                    ? (Array.isArray(q.options)
                        ? q.options.map((o, i) => ({ key: String.fromCharCode(65 + i), label: typeof o === 'string' ? o : o.label }))
                        : [{ key: 'A', label: '' }, { key: 'B', label: '' }])
                    : []
            }))
            : [{ content: '', question_type: 'multiple_choice', options: [{ key: 'A', label: '' }, { key: 'B', label: '' }] }]
    );
    // Only parent departments (parentId === null)
    const parentDepts = (() => {
        if (user?.role !== 'director') {
            return departments.filter(d => d.parentId === null);
        }
        // Tìm các phòng cha mà director là head
        const myParentDepts = departments.filter(d => d.parentId === null && d.head?.id === user?.id);
        const myParentIds = myParentDepts.map(d => d.id);
        // Lấy tất cả phòng con thuộc các phòng cha đó
        return departments.filter(d => d.parentId !== null && myParentIds.includes(d.parentId));
    })();
    const [selectedDepts, setSelectedDepts] = useState(initial?.departmentIds || []);
    const [loading, setLoading] = useState(false);

    const addQuestion = () => setQuestions(prev => [
        ...prev,
        { content: '', question_type: 'multiple_choice', options: [{ key: 'A', label: '' }, { key: 'B', label: '' }] }
    ]);
    const removeQuestion = (i) => setQuestions(prev => prev.filter((_, idx) => idx !== i));
    const updateQuestion = (i, field, value) => {
        setQuestions(prev => prev.map((q, idx) => {
            if (idx !== i) return q;
            const updated = { ...q, [field]: value };
            if (field === 'question_type') {
                updated.options = value === 'multiple_choice'
                    ? [{ key: 'A', label: '' }, { key: 'B', label: '' }]
                    : [];
            }
            return updated;
        }));
    };
    const updateOption = (qi, oi, value) => {
        setQuestions(prev => prev.map((q, idx) => {
            if (idx !== qi) return q;
            const opts = q.options.map((o, oidx) => oidx === oi ? { ...o, label: value } : o);
            return { ...q, options: opts };
        }));
    };
    const addOption = (qi) => {
        setQuestions(prev => prev.map((q, idx) => {
            if (idx !== qi) return q;
            const key = String.fromCharCode(65 + q.options.length);
            return { ...q, options: [...q.options, { key, label: '' }] };
        }));
    };
    const removeOption = (qi, oi) => {
        setQuestions(prev => prev.map((q, idx) => {
            if (idx !== qi) return q;
            const opts = q.options.filter((_, oidx) => oidx !== oi)
                .map((o, i) => ({ ...o, key: String.fromCharCode(65 + i) }));
            return { ...q, options: opts };
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                ...form,
                questions: questions.map(q => ({
                    ...q,
                    options: q.question_type === 'multiple_choice'
                        ? q.options.map(o => o.label)
                        : null,
                })),
                departmentIds: selectedDepts,
            };
            if (isEdit) {
                await updateProposal(initial.id, payload);
                toast.success('Cập nhật khảo sát thành công!');
            } else {
                await createProposal(payload);
                toast.success('Tạo khảo sát thành công!');
            }
            onSaved();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || (isEdit ? 'Lỗi cập nhật' : 'Lỗi tạo khảo sát'));
        } finally {
            setLoading(false);
        }
    };


    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{isEdit ? 'Chỉnh sửa khảo sát' : 'Tạo khảo sát mới'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                            Bước {step}/3 — {['Thông tin', 'Câu hỏi', 'Phòng ban'][step - 1]}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        <X size={18} color="var(--text-3)" />
                    </button>
                </div>

                {/* Step indicator */}
                <div style={{ display: 'flex', gap: 0, padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
                    {['Thông tin', 'Câu hỏi', 'Phòng ban'].map((s, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{
                                width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 700,
                                background: step > i + 1 ? '#10b981' : step === i + 1 ? 'var(--primary)' : '#e2e8f0',
                                color: step >= i + 1 ? '#fff' : '#94a3b8',
                            }}>{step > i + 1 ? '✓' : i + 1}</div>
                            <span style={{ fontSize: 12, color: step === i + 1 ? 'var(--primary)' : 'var(--text-3)', fontWeight: step === i + 1 ? 600 : 400 }}>{s}</span>
                            {i < 2 && <div style={{ flex: 1, height: 1, background: '#e2e8f0', margin: '0 8px' }} />}
                        </div>
                    ))}
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Tiêu đề *</label>
                                <input className="form-input" placeholder="Nhập tiêu đề khảo sát..."
                                    value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Mô tả</label>
                                <textarea className="form-input" placeholder="Mô tả mục đích khảo sát..." rows={3}
                                    value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                    style={{ resize: 'vertical' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Deadline</label>
                                <input className="form-input" type="datetime-local"
                                    value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {questions.map((q, qi) => (
                                <div key={qi} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <span style={{ fontSize: 13, fontWeight: 600 }}>Câu {qi + 1}</span>
                                        {questions.length > 1 && (
                                            <button onClick={() => removeQuestion(qi)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ marginBottom: 10 }}>
                                        <select className="form-input" style={{ marginBottom: 8, fontSize: 13 }}
                                            value={q.question_type}
                                            onChange={e => updateQuestion(qi, 'question_type', e.target.value)}>
                                            <option value="multiple_choice">Trắc nghiệm</option>
                                            <option value="rating">Thang điểm 1-5</option>
                                            <option value="text">Văn bản tự do</option>
                                        </select>
                                        <input className="form-input" placeholder="Nội dung câu hỏi..."
                                            value={q.content} onChange={e => updateQuestion(qi, 'content', e.target.value)} />
                                    </div>
                                    {q.question_type === 'multiple_choice' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {q.options.map((opt, oi) => (
                                                <div key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    <span style={{ width: 20, fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>{opt.key}.</span>
                                                    <input className="form-input" style={{ flex: 1 }} placeholder={`Đáp án ${opt.key}...`}
                                                        value={opt.label} onChange={e => updateOption(qi, oi, e.target.value)} />
                                                    {q.options.length > 2 && (
                                                        <button onClick={() => removeOption(qi, oi)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                                            <X size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            {q.options.length < 6 && (
                                                <button onClick={() => addOption(qi)}
                                                    style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: '1px dashed var(--primary)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', alignSelf: 'flex-start', marginTop: 4 }}>
                                                    + Thêm đáp án
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {q.question_type === 'rating' && (
                                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                            {[1, 2, 3, 4, 5].map(n => (
                                                <div key={n} style={{ width: 32, height: 32, borderRadius: 6, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'var(--text-3)' }}>{n}</div>
                                            ))}
                                            <span style={{ fontSize: 12, color: 'var(--text-3)', alignSelf: 'center', marginLeft: 4 }}>← Thang điểm 1-5</span>
                                        </div>
                                    )}
                                    {q.question_type === 'text' && (
                                        <div style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                                            Nhân viên sẽ nhập câu trả lời tự do
                                        </div>
                                    )}
                                </div>
                            ))}
                            <button onClick={addQuestion} className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
                                <Plus size={14} /> Thêm câu hỏi
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <div>
                            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>
                                {user?.role === 'director' ? 'Chọn phòng ban bạn quản lý:' : 'Chọn phòng ban cha nhận khảo sát:'}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {parentDepts.length === 0 && (
                                    <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: 20 }}>
                                        Không có phòng ban nào
                                    </div>
                                )}
                                {parentDepts.map(d => (
                                    <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1px solid ${selectedDepts.includes(d.id) ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', background: selectedDepts.includes(d.id) ? '#f0f4ff' : '#fff' }}>
                                        <input type="checkbox" checked={selectedDepts.includes(d.id)}
                                            onChange={e => setSelectedDepts(prev =>
                                                e.target.checked ? [...prev, d.id] : prev.filter(id => id !== d.id)
                                            )} />
                                        <Building2 size={14} color={selectedDepts.includes(d.id) ? 'var(--primary)' : 'var(--text-3)'} />
                                        <span style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                    <button className="btn btn-secondary" onClick={() => step === 1 ? onClose() : setStep(s => s - 1)}>
                        {step === 1 ? 'Hủy' : '← Quay lại'}
                    </button>
                    {step < 3
                        ? <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}
                            disabled={step === 1 && !form.title.trim()}>
                            Tiếp theo →
                        </button>
                        : <button className="btn btn-primary" onClick={handleSubmit}
                            disabled={loading || selectedDepts.length === 0}>
                            {loading ? (isEdit ? 'Đang lưu...' : 'Đang tạo...') : (isEdit ? 'Lưu thay đổi' : 'Tạo khảo sát')}
                        </button>
                    }
                </div>
            </div>
        </div>
    );
}
// Thêm user vào props
function ManageProposalModal({ proposal, onClose, onSaved, departments, user }) {

    // Thay dòng filter parentDepts:
    const parentDepts = (() => {
        if (user?.role !== 'director') {
            return departments.filter(d => d.parentId === null);
        }
        // Director: lấy phòng con thuộc khối mình quản lý
        const myParentIds = departments
            .filter(d => d.parentId === null && d.head?.id === user?.id)
            .map(d => d.id);
        return departments.filter(d => d.parentId !== null && myParentIds.includes(d.parentId));
    })();
    const [sentDeptIds, setSentDeptIds] = useState([]);
    const [loadingId, setLoadingId] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true); // ✅ thêm

    // ✅ Fetch dept IDs hiện tại khi mở modal
    useEffect(() => {
        getProposalById(proposal.id)
            .then(res => {
                const depts = res.data.data.departments || [];
                setSentDeptIds(depts.map(d => d.id));
            })
            .catch(() => toast.error('Không tải được thông tin phòng ban'))
            .finally(() => setInitialLoading(false));
    }, [proposal.id]);

    const handleSend = async (deptId) => {
        setLoadingId(deptId);
        try {
            await sendProposalToDept(proposal.id, deptId);
            setSentDeptIds(prev => [...prev, deptId]);
            toast.success('Đã gửi khảo sát đến phòng ban');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi gửi khảo sát');
        } finally {
            setLoadingId(null);
        }
    };

    const handleRevoke = async (deptId) => {
        if (!window.confirm('Thu hồi khảo sát khỏi phòng ban này?')) return;
        setLoadingId(deptId);
        try {
            await revokeProposalFromDept(proposal.id, deptId);
            setSentDeptIds(prev => prev.filter(id => id !== deptId));
            toast.success('Đã thu hồi khảo sát');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi thu hồi khảo sát');
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>Quản lý gửi khảo sát</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{proposal.title}</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        <X size={18} color="var(--text-3)" />
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 14 }}>
                        Gửi hoặc thu hồi khảo sát theo từng phòng ban cha:
                    </div>

                    {/* ✅ Hiện loading khi đang fetch */}
                    {initialLoading ? (
                        <div style={{ textAlign: 'center', padding: 30 }}>
                            <div className="spinner" />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {parentDepts.length === 0 && (
                                <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: 20 }}>
                                    Không có phòng ban nào
                                </div>
                            )}
                            {parentDepts.map(d => {
                                const isSent = sentDeptIds.includes(d.id);
                                const isLoading = loadingId === d.id;
                                return (
                                    <div key={d.id} style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '12px 14px',
                                        border: `1px solid ${isSent ? '#bbf7d0' : 'var(--border)'}`,
                                        borderRadius: 10,
                                        background: isSent ? '#f0fdf4' : '#fff',
                                    }}>
                                        <Building2 size={16} color={isSent ? '#16a34a' : 'var(--text-3)'} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                                            <div style={{ fontSize: 11, color: isSent ? '#16a34a' : 'var(--text-3)', marginTop: 1 }}>
                                                {isSent ? '✓ Đã gửi' : 'Chưa gửi'}
                                            </div>
                                        </div>
                                        {isSent ? (
                                            <button className="btn btn-danger btn-sm" onClick={() => handleRevoke(d.id)}
                                                disabled={isLoading} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <RotateCcw size={12} />
                                                {isLoading ? 'Đang thu hồi...' : 'Thu hồi'}
                                            </button>
                                        ) : (
                                            <button className="btn btn-primary btn-sm" onClick={() => handleSend(d.id)}
                                                disabled={isLoading} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Send size={12} />
                                                {isLoading ? 'Đang gửi...' : 'Gửi'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={() => { onSaved(); onClose(); }}>Đóng</button>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ProposalsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [proposals, setProposals] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingProposal, setEditingProposal] = useState(null);   // for edit form
    const [managingProposal, setManagingProposal] = useState(null); // for send/revoke modal
    const [editLoading, setEditLoading] = useState(null);

    const load = () => {
        setLoading(true);
        Promise.all([getProposals(), getDepartments()])
            .then(([pRes, dRes]) => {
                setProposals(pRes.data.data);
                setDepartments(dRes.data.data);
            })
            .catch(() => toast.error('Không tải được dữ liệu'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Xóa khảo sát này?')) return;
        try {
            await deleteProposal(id);
            toast.success('Đã xóa');
            load();
        } catch { toast.error('Lỗi xóa'); }
    };

    const handleClose = async (id) => {
        if (!window.confirm('Đóng khảo sát này?')) return;
        try {
            await closeProposal(id);
            toast.success('Đã đóng khảo sát');
            load();
        } catch { toast.error('Lỗi đóng'); }
    };
    const handleEdit = async (p) => {
        setEditLoading(p.id);
        try {
            const res = await getProposalById(p.id);
            setEditingProposal(res.data.data);
        } catch {
            toast.error('Không tải được dữ liệu khảo sát');
        } finally {
            setEditLoading(null);
        }
    };

    const filtered = proposals.filter(p =>
        p.title?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ minHeight: '100vh' }}>
            <Header title="Quản lý khảo sát" subtitle={`${proposals.length} khảo sát`} />

            <div className="page-content">
                {/* Toolbar */}
                <div className="card" style={{ marginBottom: 16 }}>
                    <div style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>

                        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                            <input className="form-input" placeholder="Tìm khảo sát..."
                                value={search} onChange={e => setSearch(e.target.value)}
                                style={{ paddingLeft: 34 }} />
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                            <Plus size={14} /> Tạo khảo sát
                        </button>
                    </div>
                </div>

                {/* List */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner spinner-lg" /></div>
                ) : !filtered.length ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px 0' }}>
                        <ClipboardList size={36} color="var(--text-3)" style={{ margin: '0 auto 10px' }} />
                        <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Chưa có khảo sát nào</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {filtered.map(p => {
    console.log('p.created_by:', p.created_by, '| user.id:', user?.id, '| role:', user?.role);
     console.log('user full:', JSON.stringify(user));
    return (
    <div key={p.id} className="card" style={{ padding: '16px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <span style={{ fontWeight: 700, fontSize: 14 }}>{p.title}</span>
                                            <StatusBadge status={p.status} />
                                        </div>
                                        {p.description && (
                                            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {p.description}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-3)' }}>
                                            <span><Users size={11} style={{ display: 'inline', marginRight: 3 }} />
                                                {p.response_count}/{p.total_recipients || '?'} đã trả lời
                                            </span>
                                            {p.deadline && (
                                                <span><Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
                                                    {new Date(p.deadline).toLocaleDateString('vi-VN')}
                                                </span>
                                            )}
                                            <span>{p.question_count} câu hỏi</span>
                                            <span>Tạo bởi: {p.created_by_name}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                        {/* Nút chỉnh sửa */}
                                        <button className="btn btn-secondary btn-sm"
                                            onClick={() => handleEdit(p)}
                                            disabled={editLoading === p.id}>
                                            <Pencil size={12} /> {editLoading === p.id ? '...' : 'Sửa'}
                                        </button>

                                        {/* Nút quản lý gửi/thu hồi */}
                                        <button className="btn btn-secondary btn-sm"
                                            onClick={() => setManagingProposal(p)}
                                            title="Gửi / Thu hồi theo phòng ban"
                                            style={{ color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff' }}>
                                            <Send size={12} /> Gửi / Thu hồi
                                        </button>

{(user?.role !== 'director' || p.created_by_name === user?.fullName) && (
    <button className="btn btn-primary btn-sm"
        onClick={() => navigate(`/proposals/${p.id}/results`)}>
        <BarChart2 size={12} /> Kết quả
    </button>
)}
                                    
                                        {p.status === 'active' && (
                                            <button className="btn btn-secondary btn-sm" onClick={() => handleClose(p.id)}>
                                                <XCircle size={12} /> Đóng
                                            </button>
                                        )}

                                        {/* Xóa */}
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
        );
})}
                    </div>
                )}
            </div>

            {/* Modal tạo mới */}
            {showCreateModal && (
                <ProposalFormModal
                    mode="create"
                    onClose={() => setShowCreateModal(false)}
                    onSaved={load}
                    departments={departments}
                    user={user}   // ← thêm
                />
            )}

            {editingProposal && (
                <ProposalFormModal
                    mode="edit"
                    initial={editingProposal}
                    onClose={() => setEditingProposal(null)}
                    onSaved={load}
                    departments={departments}
                    user={user}   // ← thêm
                />
            )}


            {managingProposal && (
                <ManageProposalModal
                    proposal={managingProposal}
                    onClose={() => setManagingProposal(null)}
                    onSaved={load}
                    departments={departments}
                    user={user}
                />
            )}
        </div>
    );
}