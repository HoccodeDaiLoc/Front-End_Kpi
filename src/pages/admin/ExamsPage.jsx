import React, { useState, useEffect, useCallback } from 'react';
import Header from '../../components/layout/Header';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import './ExamsPage.scss';
import {
    getExams, getExamById, createExam, updateExam, deleteExam,
    sendExam, getAssignments, revokeAssignment
} from '../../api/exams';
import { getDepartments } from '../../api/departments';
import toast from 'react-hot-toast';
import {
    Plus, Search, Edit2, Trash2, Send, ChevronDown,
    ChevronUp, Clock, CheckCircle, XCircle, FileText, Users, Eye
} from 'lucide-react';

const STATUS_COLORS = {
    active: { bg: '#f0fdf4', color: '#16a34a', label: 'Đang hoạt động' },
    inactive: { bg: '#fef9c3', color: '#ca8a04', label: 'Vô hiệu' },
};

function QuestionForm({ question, index, onChange, onRemove }) {
    const q = question;
    const addOption = () => {
        const keys = ['A', 'B', 'C', 'D', 'E', 'F'];
        const next = keys[q.options?.length || 0];
        onChange(index, { ...q, options: [...(q.options || []), { key: next, text: '' }] });
    };
    const removeOption = (i) => {
        const opts = q.options.filter((_, idx) => idx !== i);
        onChange(index, { ...q, options: opts });
    };
    const updateOption = (i, text) => {
        const opts = q.options.map((o, idx) => idx === i ? { ...o, text } : o);
        onChange(index, { ...q, options: opts });
    };

    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 12, background: '#fafafa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-2)' }}>Câu {index + 1}</span>
                <button className="btn btn-danger btn-sm" onClick={() => onRemove(index)}>
                    <XCircle size={13} /> Xóa
                </button>
            </div>

            <div className="form-group">
                <label className="form-label">Nội dung câu hỏi *</label>
                <textarea className="form-input" rows={2} value={q.content}
                    onChange={e => onChange(index, { ...q, content: e.target.value })} />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label className="form-label">Loại câu hỏi</label>
                    <select className="form-select" value={q.question_type}
                        onChange={e => onChange(index, { ...q, question_type: e.target.value, options: [], correct_answer: '' })}>
                        <option value="multiple_choice">Trắc nghiệm 1 đáp án</option>
                        <option value="multi_select">Trắc nghiệm nhiều đáp án</option>
                        <option value="true_false">Đúng / Sai</option>
                        <option value="short_answer">Tự luận</option>
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Điểm</label>
                    <input type="number" className="form-input" min={1} value={q.points}
                        onChange={e => onChange(index, { ...q, points: parseInt(e.target.value) || 1 })} />
                </div>
            </div>

            {/* Options cho trắc nghiệm */}
            {['multiple_choice', 'multi_select'].includes(q.question_type) && (
                <div className="form-group">
                    <label className="form-label">Các lựa chọn</label>
                    {(q.options || []).map((opt, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                            <span style={{ width: 20, fontWeight: 600, color: 'var(--primary)' }}>{opt.key}.</span>
                            <input className="form-input" style={{ flex: 1 }} value={opt.text}
                                placeholder={`Lựa chọn ${opt.key}`}
                                onChange={e => updateOption(i, e.target.value)} />
                            <button className="btn btn-secondary btn-sm" onClick={() => removeOption(i)}>✕</button>
                        </div>
                    ))}
                    {(q.options?.length || 0) < 6 && (
                        <button className="btn btn-secondary btn-sm" onClick={addOption}>
                            <Plus size={13} /> Thêm lựa chọn
                        </button>
                    )}
                </div>
            )}

            {/* Đáp án đúng */}
            <div className="form-group">
                <label className="form-label">Đáp án đúng</label>
                {q.question_type === 'true_false' ? (
                    <select className="form-select" value={q.correct_answer}
                        onChange={e => onChange(index, { ...q, correct_answer: e.target.value })}>
                        <option value="">-- Chọn --</option>
                        <option value="true">Đúng</option>
                        <option value="false">Sai</option>
                    </select>
                ) : q.question_type === 'multiple_choice' ? (
                    <select className="form-select" value={q.correct_answer}
                        onChange={e => onChange(index, { ...q, correct_answer: e.target.value })}>
                        <option value="">-- Chọn đáp án đúng --</option>
                        {(q.options || []).map(o => <option key={o.key} value={o.key}>{o.key}. {o.text}</option>)}
                    </select>
                ) : q.question_type === 'multi_select' ? (
                    <input className="form-input" value={q.correct_answer}
                        placeholder="Ví dụ: A,C (phân cách bằng dấu phẩy)"
                        onChange={e => onChange(index, { ...q, correct_answer: e.target.value })} />
                ) : (
                    <textarea className="form-input" rows={2} value={q.correct_answer}
                        placeholder="Đáp án mẫu cho AI chấm điểm"
                        onChange={e => onChange(index, { ...q, correct_answer: e.target.value })} />
                )}
            </div>
        </div>
    );
}

const emptyExam = {
    title: '', description: '', time_limit: 30, passing_score: 60, questions: []
};
const emptyQuestion = {
    content: '', question_type: 'multiple_choice', options: [
        { key: 'A', text: '' }, { key: 'B', text: '' },
        { key: 'C', text: '' }, { key: 'D', text: '' },
    ], correct_answer: '', points: 1
};
function DeptTree({ nodes, allDepts, selectedIds, sentIds, onToggle, depth = 0 }) {
    return (
        <>
            {nodes.map(dept => {
                const children = allDepts.filter(d => d.parentId === dept.id);
                const alreadySent = sentIds?.includes(dept.id);
                const isSelected = selectedIds.includes(dept.id);
                const isRoot = depth === 0;

                return (
                    <div key={dept.id} style={{ marginLeft: depth * 20 }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '6px 10px',
                            borderRadius: 6,
                            cursor: alreadySent ? 'not-allowed' : 'pointer',  // ← bỏ isRoot
                            background: isSelected ? '#eff6ff' : 'transparent',
                            border: isSelected ? '1px solid #bfdbfe' : '1px solid transparent',
                            marginBottom: 3,
                            transition: 'background 0.15s',
                        }}>
                            {depth > 0 && (
                                <span style={{
                                    width: 16, height: 16, marginLeft: -4,
                                    borderLeft: '2px solid #d1d5db',
                                    borderBottom: '2px solid #d1d5db',
                                    borderRadius: '0 0 0 4px',
                                    flexShrink: 0,
                                    marginRight: -4,
                                }} />
                            )}

                            <span style={{ fontSize: 14 }}>
                                {children.length > 0 ? '📁' : '📂'}
                            </span>

                            {/* ← Bỏ điều kiện !isRoot, tất cả đều có checkbox */}
                            <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={alreadySent}
                                onChange={() => !alreadySent && onToggle(dept.id)}
                                style={{ accentColor: '#3b82f6', width: 14, height: 14 }}
                            />

                            <span style={{
                                fontSize: 13,
                                fontWeight: isRoot ? 700 : 500,
                                color: alreadySent ? '#9ca3af' : isRoot ? 'var(--text-1)' : 'var(--text-2)',
                                flex: 1,
                            }}>
                                {dept.name}
                            </span>

                            {alreadySent && (
                                <span style={{
                                    fontSize: 10, color: '#f59e0b', background: '#fef3c7',
                                    padding: '1px 6px', borderRadius: 999, fontWeight: 600,
                                }}>
                                    Đã gửi
                                </span>
                            )}
                            {!alreadySent && isRoot && (
                                <span style={{
                                    fontSize: 10, color: '#6b7280', background: '#f3f4f6',
                                    padding: '1px 6px', borderRadius: 999,
                                }}>
                                    Cấp cha
                                </span>
                            )}
                        </label>

                        {children.length > 0 && (
                            <DeptTree
                                nodes={children}
                                allDepts={allDepts}
                                selectedIds={selectedIds}
                                sentIds={sentIds}
                                onToggle={onToggle}
                                depth={depth + 1}
                            />
                        )}
                    </div>
                );
            })}
        </>
    );
}
export default function ExamsPage() {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState(null); // 'create' | 'edit' | 'send' | 'results'
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(emptyExam);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [depts, setDepts] = useState([]);
    const [sendForm, setSendForm] = useState({ departmentIds: [], deadline: '' });
    const [assignments, setAssignments] = useState([]);
    const [expandedExam, setExpandedExam] = useState(null);
    const [confirmRevoke, setConfirmRevoke] = useState(null);
    const [viewModal, setViewModal] = useState(null);
    useEffect(() => {
        getDepartments().then(r => setDepts(r.data.data)).catch(() => { });
        loadAssignments();
    }, []);

    const loadAssignments = async () => {
        try {
            const res = await getAssignments();
            setAssignments(res.data.data);
        } catch { }
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getExams();
            setExams(res.data.data);
        } catch { toast.error('Không tải được danh sách đề thi'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = exams.filter(e =>
        e.title?.toLowerCase().includes(search.toLowerCase())
    );
    const openView = async (exam) => {
        try {
            const res = await getExamById(exam.id);
            setViewModal(res.data.data);
        } catch { toast.error('Không tải được đề thi'); }
    };
    const openCreate = () => {
        setForm({ ...emptyExam, questions: [{ ...emptyQuestion }] });
        setModal('create');
    };

    const openEdit = (exam) => {
        setSelected(exam);
        setForm({
            title: exam.title,
            description: exam.description || '',
            time_limit: exam.time_limit || 30,
            passing_score: exam.passing_score || 60,
            questions: exam.questions || [],
        });
        setModal('edit');
    };

    const openSend = (exam) => {
        setSelected(exam);
        console.log('depts sample:', depts[0]); // ← xem field name
        // Lấy danh sách deptId đã gửi cho exam này
        const sentDeptIds = examAssignments(exam.id).map(a => a.department_id);
        setSendForm({ departmentIds: [], deadline: '', sentDeptIds });
        setModal('send');
    };

    const handleQuestionChange = (index, updated) => {
        setForm(f => {
            const qs = [...f.questions];
            qs[index] = updated;
            return { ...f, questions: qs };
        });
    };

    const handleQuestionRemove = (index) => {
        setForm(f => ({ ...f, questions: f.questions.filter((_, i) => i !== index) }));
    };

    const handleAddQuestion = () => {
        setForm(f => ({ ...f, questions: [...f.questions, { ...emptyQuestion }] }));
    };

    const handleCreate = async () => {
        if (!form.title.trim()) return toast.error('Tiêu đề không được để trống');
        if (!form.questions.length) return toast.error('Phải có ít nhất 1 câu hỏi');
        setSaving(true);
        try {
            await createExam(form);
            toast.success('Tạo đề thi thành công');
            setModal(null); load();
        } catch (err) { toast.error(err.response?.data?.message || 'Lỗi tạo đề thi'); }
        finally { setSaving(false); }
    };

    const handleEdit = async () => {
        setSaving(true);
        try {
            await updateExam(selected.id, form);
            toast.success('Cập nhật thành công');
            setModal(null); load();
        } catch (err) { toast.error(err.response?.data?.message || 'Lỗi cập nhật'); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        try {
            await deleteExam(confirmDelete.id);
            toast.success('Đã xóa đề thi');
            setConfirmDelete(null); load();
        } catch (err) { toast.error(err.response?.data?.message || 'Lỗi xóa đề thi'); }
    };

    const handleSend = async () => {
        if (!sendForm.departmentIds.length) return toast.error('Chọn ít nhất 1 phòng ban');
        setSaving(true);
        try {
            const res = await sendExam(selected.id, {
                departmentIds: sendForm.departmentIds,
                deadline: sendForm.deadline || null,
            });
            toast.success(res.data.message);
            setModal(null); loadAssignments();
        } catch (err) { toast.error(err.response?.data?.message || 'Lỗi gửi đề thi'); }
        finally { setSaving(false); }
    };
    const handleRevoke = async () => {
        try {
            await revokeAssignment(confirmRevoke.id);
            toast.success(`Đã thu hồi khỏi ${confirmRevoke.department_name}`);
            setConfirmRevoke(null);
            loadAssignments();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi thu hồi đề thi');
        }
    };
    const toggleDept = (id) => {
        setSendForm(f => ({
            ...f,
            departmentIds: f.departmentIds.includes(id)
                ? f.departmentIds.filter(d => d !== id)
                : [...f.departmentIds, id],
        }));
    };

    const examAssignments = (examId) => assignments.filter(a => a.exam_id === examId);

    const ExamForm = () => (
        <>
            <div className="form-group">
                <label className="form-label">Tiêu đề đề thi *</label>
                <input className="form-input" value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Ví dụ: Kiểm tra nội quy tháng 5" />
            </div>
            <div className="form-group">
                <label className="form-label">Mô tả</label>
                <textarea className="form-input" rows={2} value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-row">
                <div className="form-group">
                    <label className="form-label">Thời gian làm bài (phút)</label>
                    <input type="number" className="form-input" min={5} value={form.time_limit}
                        onChange={e => setForm(f => ({ ...f, time_limit: parseInt(e.target.value) || 30 }))} />
                </div>
                <div className="form-group">
                    <label className="form-label">Điểm đạt (%)</label>
                    <input type="number" className="form-input" min={0} max={100} value={form.passing_score}
                        onChange={e => setForm(f => ({ ...f, passing_score: parseInt(e.target.value) || 60 }))} />
                </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                        Câu hỏi ({form.questions.length})
                    </span>
                    <button className="btn btn-secondary btn-sm" onClick={handleAddQuestion}>
                        <Plus size={13} /> Thêm câu hỏi
                    </button>
                </div>
                {form.questions.map((q, i) => (
                    <QuestionForm key={i} question={q} index={i}
                        onChange={handleQuestionChange} onRemove={handleQuestionRemove} />
                ))}
                {!form.questions.length && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-3)', fontSize: 13 }}>
                        Chưa có câu hỏi nào — nhấn "Thêm câu hỏi" để bắt đầu
                    </div>
                )}
            </div>
        </>
    );

    return (
        <>
            <Header title="Quản lý Đề thi" subtitle={`${exams.length} đề thi`}
                actions={<button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} /> Tạo đề thi</button>} />

            <div className="page-content exams-page">
                <div className="card">
                    <div className="card-header">
                        <div className="filter-bar" style={{ margin: 0 }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                                <input className="form-input" placeholder="Tìm kiếm đề thi..."
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    style={{ paddingLeft: 36, width: 260 }} />
                            </div>
                        </div>
                    </div>

                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Tên đề thi</th>
                                    <th>Số câu</th>
                                    <th>Thời gian</th>
                                    <th>Điểm đạt</th>
                                    <th>Đã gửi</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} className="table-empty">Đang tải...</td></tr>
                                ) : !filtered.length ? (
                                    <tr><td colSpan={6} className="table-empty">Chưa có đề thi nào</td></tr>
                                ) : filtered.map(exam => {
                                    const examAssigns = examAssignments(exam.id);
                                    const isExpanded = expandedExam === exam.id;
                                    return (
                                        <React.Fragment key={exam.id}>
                                            <tr key={exam.id}>
                                                <td className="td-name">
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{exam.title}</div>
                                                    {exam.description && (
                                                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{exam.description}</div>
                                                    )}
                                                </td>
                                                <td className="td-hide">
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <FileText size={13} color="var(--text-3)" />
                                                        {exam.question_count || 0} câu
                                                    </span>
                                                </td>
                                                <td className="td-hide">
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <Clock size={13} color="var(--text-3)" />
                                                        {exam.time_limit || '—'} phút
                                                    </span>
                                                </td>
                                                <td className="td-hide">{exam.passing_score}%</td>
                                                <td className="td-hide">
                                                    {examAssigns.length > 0 ? (
                                                        <button className="btn btn-secondary btn-sm"
                                                            onClick={() => setExpandedExam(isExpanded ? null : exam.id)}
                                                            style={{ fontSize: 11 }}>
                                                            {examAssigns.length} phòng ban
                                                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                        </button>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-3)', fontSize: 12 }}>Chưa gửi</span>
                                                    )}
                                                </td>
                                                <td className="td-actions">
                                                    <div className="actions-wrap">
                                                        <button className="btn btn-secondary btn-sm action-btn hide-mobile" title="Xem đề thi" onClick={() => openView(exam)}>
                                                            <Eye size={13} />
                                                        </button>
                                                        <button className="btn btn-secondary btn-sm action-btn" title="Gửi cho phòng ban" onClick={() => openSend(exam)}>
                                                            <Send size={13} />
                                                        </button>
                                                        <button className="btn btn-secondary btn-sm action-btn" title="Chỉnh sửa" onClick={() => openEdit(exam)}>
                                                            <Edit2 size={13} />
                                                        </button>
                                                        <button className="btn btn-danger btn-sm action-btn" title="Xóa" onClick={() => setConfirmDelete(exam)}>
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {isExpanded && examAssigns.map(a => (
                                                <tr key={a.id} style={{ background: '#f8fafc' }}>
                                                    <td colSpan={6} style={{ paddingLeft: 32, paddingTop: 8, paddingBottom: 8 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                                                                <Users size={12} style={{ marginRight: 6 }} />
                                                                {a.department_name} — {a.submitted_count || 0}/{a.total_submissions || 0} đã nộp
                                                                {a.deadline && ` · Hạn: ${new Date(a.deadline).toLocaleDateString('vi-VN')}`}
                                                            </span>
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                style={{ fontSize: 11, marginRight: 16 }}
                                                                onClick={() => setConfirmRevoke(a)}
                                                            >
                                                                <XCircle size={12} /> Thu hồi
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Tạo đề thi */}
            <Modal open={modal === 'create'} onClose={() => setModal(null)}
                title="Tạo đề thi mới"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setModal(null)}>Hủy</button>
                    <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                        {saving ? 'Đang lưu...' : 'Tạo đề thi'}
                    </button>
                </>}>
                <ExamForm />
            </Modal>
            <Modal open={!!viewModal} onClose={() => setViewModal(null)}
                title={`Xem đề thi: ${viewModal?.title}`}
                footer={<button className="btn btn-secondary" onClick={() => setViewModal(null)}>Đóng</button>}>
                {viewModal && (
                    <div>
                        {/* Thông tin chung */}
                        <div style={{ display: 'flex', gap: 16, marginBottom: 16, padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
                            <span style={{ fontSize: 13 }}>⏱ {viewModal.time_limit} phút</span>
                            <span style={{ fontSize: 13 }}>🎯 Điểm đạt: {viewModal.passing_score}%</span>
                            <span style={{ fontSize: 13 }}>📝 {viewModal.questions?.length || 0} câu hỏi</span>
                        </div>

                        {/* Danh sách câu hỏi */}
                        {viewModal.questions?.map((q, i) => (
                            <div key={i} style={{
                                border: '1px solid var(--border)', borderRadius: 8,
                                padding: 14, marginBottom: 10
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                                        Câu {i + 1}: {q.content}
                                    </span>
                                    <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0, marginLeft: 8 }}>
                                        {q.points} điểm
                                    </span>
                                </div>

                                {/* Options */}
                                {q.options?.length > 0 && (
                                    <div style={{ marginBottom: 8 }}>
                                        {q.options.map(opt => (
                                            <div key={opt.key} style={{
                                                fontSize: 13, padding: '4px 8px', borderRadius: 4,
                                                background: q.correct_answer?.includes(opt.key) ? '#f0fdf4' : 'transparent',
                                                color: q.correct_answer?.includes(opt.key) ? '#16a34a' : 'var(--text-2)',
                                                fontWeight: q.correct_answer?.includes(opt.key) ? 600 : 400,
                                            }}>
                                                {opt.key}. {opt.text}
                                                {q.correct_answer?.includes(opt.key)}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Đáp án */}
                                <div style={{ fontSize: 12, color: '#16a34a', marginTop: 4 }}>
                                    Đáp án: {
                                        q.question_type === 'true_false'
                                            ? (q.correct_answer === 'true' ? 'Đúng' : 'Sai')
                                            : q.correct_answer || '(Tự luận — AI chấm)'
                                    }
                                </div>

                                {/* Loại câu */}
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                                    {{
                                        multiple_choice: 'Trắc nghiệm 1 đáp án',
                                        multi_select: 'Trắc nghiệm nhiều đáp án',
                                        true_false: 'Đúng / Sai',
                                        short_answer: 'Tự luận',
                                    }[q.question_type]}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>
            {/* Modal Chỉnh sửa */}
            <Modal open={modal === 'edit'} onClose={() => setModal(null)}
                title={`Chỉnh sửa: ${selected?.title}`}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setModal(null)}>Hủy</button>
                    <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>
                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </>}>
                <ExamForm />
            </Modal>

            {/* Modal Gửi đề thi */}
            <Modal open={modal === 'send'} onClose={() => setModal(null)}
                title={`Gửi đề thi: ${selected?.title}`}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setModal(null)}>Hủy</button>
                    <button className="btn btn-primary" onClick={handleSend} disabled={saving}>
                        {saving ? 'Đang gửi...' : `Gửi (${sendForm.departmentIds.length} phòng ban)`}
                    </button>
                </>}>
                <div className="form-group">
                    <label className="form-label">
                        Chọn phòng ban *
                        {sendForm.departmentIds.length > 0 && (
                            <span style={{ marginLeft: 8, fontSize: 12, color: '#3b82f6', fontWeight: 400 }}>
                                ({sendForm.departmentIds.length} đã chọn)
                            </span>
                        )}
                    </label>
                    <div style={{
                        border: '1px solid var(--border)', borderRadius: 8,
                        maxHeight: 280, overflowY: 'auto', padding: '8px 10px',
                        background: '#fafafa',
                    }}>
                        {/* Render root departments (parentId null/undefined) */}
                        <DeptTree
                            nodes={depts.filter(d => d.parentId === null || d.parentId === undefined)}
                            allDepts={depts}
                            selectedIds={sendForm.departmentIds}
                            sentIds={sendForm.sentDeptIds}
                            onToggle={toggleDept}
                            depth={0}
                        />
                        {depts.length === 0 && (
                            <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, padding: 12 }}>
                                Không có phòng ban nào
                            </div>
                        )}
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Hạn nộp bài (không bắt buộc)</label>
                    <input type="datetime-local" className="form-input"
                        value={sendForm.deadline}
                        onChange={e => setSendForm(f => ({ ...f, deadline: e.target.value }))} />
                </div>
            </Modal>

            {/* Modal Kết quả */}


            <ConfirmDialog
                open={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDelete}
                title="Xóa đề thi"
                message={`Bạn có chắc muốn xóa đề thi "${confirmDelete?.title}"?`}
            />
            <ConfirmDialog
                open={!!confirmRevoke}
                onClose={() => setConfirmRevoke(null)}
                onConfirm={handleRevoke}
                title="Thu hồi đề thi"
                message={`Thu hồi đề thi khỏi "${confirmRevoke?.department_name}"? Toàn bộ bài làm chưa nộp sẽ bị hủy.`}
            />
        </>
    );
}