import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useCallback } from 'react';
import Header from '../../components/layout/Header';
import {
    getAssignments, getAssignmentSubmissions, getSubmissionDetail
} from '../../api/exams';
import toast from 'react-hot-toast';
import {
    ChevronRight, ChevronDown, ChevronLeft, Users, CheckCircle,
    XCircle, Clock, AlertCircle, BarChart2, Eye, Search, BookOpen,
    Download, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import './ExamResultsPage.scss'

// ── Helpers ────────────────────────────────────────────────────
const pct = (v) => (v != null ? `${parseFloat(v).toFixed(1)}%` : '—');

const statusLabel = (s) => ({
    pending: 'Chưa làm',
    in_progress: 'Đang làm',
    submitted: 'Đã nộp',
    graded: 'Đã chấm',
}[s] || s || '—');

const StatusBadge = ({ status }) => {
    const cfg = {
        pending: { label: 'Chưa làm', color: '#f59e0b', bg: '#fef9c3' },
        in_progress: { label: 'Đang làm', color: '#3b82f6', bg: '#eff6ff' },
        submitted: { label: 'Đã nộp', color: '#8b5cf6', bg: '#f5f3ff' },
        graded: { label: 'Đã chấm', color: '#10b981', bg: '#f0fdf4' },
    }[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };
    return (
        <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 20 }}>
            {cfg.label}
        </span>
    );
};

const PassBadge = ({ passed, status }) => {
    if (!['submitted', 'graded'].includes(status)) return null;
    if (passed == null) return <span style={{ fontSize: 11, color: '#6b7280' }}>Chờ chấm</span>;
    return passed
        ? <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 3 }}><CheckCircle size={12} />Đạt</span>
        : <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 3 }}><XCircle size={12} />Không đạt</span>;
};

// ── Export Excel theo từng phòng ban ──────────────────────────
async function exportDeptExcel(assignment) {
    const toastId = toast.loading(`Đang xuất Excel: ${assignment.department_name?.trim()}...`);
    try {
        const res = await getAssignmentSubmissions(assignment.id);
        const submissions = res.data.data || [];

        const deptName = assignment.department_name?.trim() || 'Phong_ban';
        const examTitle = assignment.exam_title || 'De_thi';
        const now = new Date().toLocaleDateString('vi-VN');

        const wb = XLSX.utils.book_new();

        // ── Sheet 1: Tổng hợp ──
        const summaryHeader = [
            [`BÁO CÁO KẾT QUẢ THI`],
            [`Đề thi: ${examTitle}`],
            [`Phòng ban: ${deptName}`],
            [`Ngày xuất: ${now}`],
            [],
            [
                'STT', 'Họ và tên', 'Email',
                'Trạng thái', 'Điểm số', 'Điểm tối đa',
                'Phần trăm (%)', 'Kết quả', 'Thời gian nộp'
            ],
        ];

        const summaryRows = submissions.map((s, i) => [
            i + 1,
            s.full_name || '—',
            s.email || '—',
            statusLabel(s.status),
            s.total_score != null ? parseFloat(s.total_score) : '—',
            s.max_score != null ? parseFloat(s.max_score) : '—',
            s.percentage != null ? parseFloat(parseFloat(s.percentage).toFixed(1)) : '—',
            s.passed == null
                ? (s.status === 'graded' || s.status === 'submitted' ? 'Chờ chấm' : '—')
                : s.passed ? 'Đạt' : 'Không đạt',
            s.submitted_at ? new Date(s.submitted_at).toLocaleString('vi-VN') : '—',
        ]);

        // Dòng tổng kết
        const gradedList = submissions.filter(s => s.percentage != null);
        const passedCount = submissions.filter(s => s.passed).length;
        const avgScore = gradedList.length
            ? (gradedList.reduce((a, s) => a + parseFloat(s.percentage), 0) / gradedList.length).toFixed(1)
            : '—';

        const summaryFooter = [
            [],
            ['TỔNG KẾT', '', '', '',
                '', '', '', '', ''],
            ['Tổng số người', submissions.length],
            ['Đã chấm', submissions.filter(s => s.status === 'graded').length],
            ['Đạt', passedCount],
            ['Không đạt', submissions.filter(s => s.passed === false).length],
            ['Điểm TB (%)', avgScore !== '—' ? `${avgScore}%` : '—'],
            ['Tỉ lệ đạt', submissions.length > 0 ? `${((passedCount / submissions.length) * 100).toFixed(1)}%` : '—'],
        ];

        const summaryData = [...summaryHeader, ...summaryRows, ...summaryFooter];
        const wsSum = XLSX.utils.aoa_to_sheet(summaryData);

        // Style cột
        wsSum['!cols'] = [
            { wch: 5 }, { wch: 25 }, { wch: 28 },
            { wch: 12 }, { wch: 10 }, { wch: 12 },
            { wch: 14 }, { wch: 12 }, { wch: 20 },
        ];

        // Merge title rows
        wsSum['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
            { s: { r: 3, c: 0 }, e: { r: 3, c: 8 } },
        ];

        XLSX.utils.book_append_sheet(wb, wsSum, 'Tổng hợp');

        // ── Sheet 2: Chi tiết từng người ──
        if (submissions.length > 0) {
            // Lấy detail 1 bài để biết số câu (lấy bài đầu tiên có submission_id)
            // Dùng dữ liệu summary đã có, không gọi thêm API để tránh chậm
            const detailHeader = [
                [`CHI TIẾT KẾT QUẢ THI — ${deptName}`],
                [`Đề thi: ${examTitle}   |   Ngày xuất: ${now}`],
                [],
                ['STT', 'Họ và tên', 'Email', 'Điểm số', 'Tối đa', 'Phần trăm', 'Kết quả', 'Trạng thái', 'Nộp lúc'],
            ];

            const detailRows = submissions.map((s, i) => [
                i + 1,
                s.full_name || '—',
                s.email || '—',
                s.total_score != null ? parseFloat(s.total_score) : '',
                s.max_score != null ? parseFloat(s.max_score) : '',
                s.percentage != null ? `${parseFloat(s.percentage).toFixed(1)}%` : '—',
                s.passed == null ? (s.status === 'graded' ? 'Chờ chấm' : '—') : (s.passed ? 'Đạt' : 'Không đạt'),
                statusLabel(s.status),
                s.submitted_at ? new Date(s.submitted_at).toLocaleString('vi-VN') : '—',
            ]);

            const wsDet = XLSX.utils.aoa_to_sheet([...detailHeader, ...detailRows]);
            wsDet['!cols'] = [
                { wch: 5 }, { wch: 25 }, { wch: 28 },
                { wch: 10 }, { wch: 10 }, { wch: 13 },
                { wch: 12 }, { wch: 12 }, { wch: 20 },
            ];
            wsDet['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
            ];
            XLSX.utils.book_append_sheet(wb, wsDet, 'Chi tiết');
        }

        // Xuất file
        const safeDept = deptName.replace(/[^a-zA-Z0-9À-ỹ\s]/g, '').trim().replace(/\s+/g, '_');
        const safeExam = examTitle.replace(/[^a-zA-Z0-9À-ỹ\s]/g, '').trim().replace(/\s+/g, '_').slice(0, 30);
        const fileName = `KetQua_${safeExam}_${safeDept}.xlsx`;

        XLSX.writeFile(wb, fileName);
        toast.success(`Xuất Excel thành công: ${deptName}`, { id: toastId });
    } catch (err) {
        console.error(err);
        toast.error('Lỗi xuất Excel', { id: toastId });
    }
}

// ── Export tất cả phòng ban (mỗi dept = 1 sheet) ─────────────
async function exportAllDeptExcel(exam) {
    const toastId = toast.loading(`Đang xuất Excel tất cả phòng ban...`);
    try {
        const wb = XLSX.utils.book_new();
        const now = new Date().toLocaleDateString('vi-VN');

        for (const assignment of exam.assignments) {
            const res = await getAssignmentSubmissions(assignment.id);
            const submissions = res.data.data || [];
            const deptName = assignment.department_name?.trim() || 'Phong_ban';

            const header = [
                [`BÁO CÁO KẾT QUẢ THI — ${deptName}`],
                [`Đề thi: ${exam.exam_title}   |   Ngày xuất: ${now}`],
                [],
                ['STT', 'Họ và tên', 'Email', 'Trạng thái', 'Điểm số', 'Tối đa', 'Phần trăm (%)', 'Kết quả', 'Nộp lúc'],
            ];

            const rows = submissions.map((s, i) => [
                i + 1,
                s.full_name || '—',
                s.email || '—',
                statusLabel(s.status),
                s.total_score != null ? parseFloat(s.total_score) : '',
                s.max_score != null ? parseFloat(s.max_score) : '',
                s.percentage != null ? parseFloat(parseFloat(s.percentage).toFixed(1)) : '',
                s.passed == null ? (s.status === 'graded' ? 'Chờ chấm' : '—') : (s.passed ? 'Đạt' : 'Không đạt'),
                s.submitted_at ? new Date(s.submitted_at).toLocaleString('vi-VN') : '—',
            ]);

            const gradedList = submissions.filter(s => s.percentage != null);
            const passedCount = submissions.filter(s => s.passed).length;
            const avgScore = gradedList.length
                ? (gradedList.reduce((a, s) => a + parseFloat(s.percentage), 0) / gradedList.length).toFixed(1)
                : '—';

            const footer = [
                [],
                ['Tổng số', submissions.length, '', '', '', '', '', '', ''],
                ['Đã chấm', submissions.filter(s => s.status === 'graded').length],
                ['Đạt', passedCount],
                ['Không đạt', submissions.filter(s => s.passed === false).length],
                ['Điểm TB (%)', avgScore !== '—' ? `${avgScore}%` : '—'],
            ];

            const ws = XLSX.utils.aoa_to_sheet([...header, ...rows, ...footer]);
            ws['!cols'] = [
                { wch: 5 }, { wch: 25 }, { wch: 28 },
                { wch: 12 }, { wch: 10 }, { wch: 10 },
                { wch: 14 }, { wch: 12 }, { wch: 20 },
            ];
            ws['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
            ];

            // Tên sheet tối đa 31 ký tự, bỏ ký tự đặc biệt
            const sheetName = deptName.replace(/[\/\\?\*\[\]:]/g, '').slice(0, 31);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }

        const safeExam = exam.exam_title.replace(/[^a-zA-Z0-9À-ỹ\s]/g, '').trim().replace(/\s+/g, '_').slice(0, 40);
        XLSX.writeFile(wb, `KetQua_TatCa_${safeExam}.xlsx`);
        toast.success('Xuất Excel tất cả phòng ban thành công!', { id: toastId });
    } catch (err) {
        console.error(err);
        toast.error('Lỗi xuất Excel', { id: toastId });
    }
}

// ── Panel chi tiết bài làm ────────────────────────────────────
function SubmissionDetailPanel({ submissionId, onClose }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSubmissionDetail(submissionId)
            .then(r => setDetail(r.data.data))
            .catch(() => toast.error('Không tải được chi tiết'))
            .finally(() => setLoading(false));
    }, [submissionId]);

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" />
        </div>
    );
    if (!detail) return null;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{detail.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{detail.email}</div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={onClose}>
                    <ChevronRight size={14} /> Đóng
                </button>
            </div>

            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 20 }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: detail.passed ? '#16a34a' : detail.status === 'graded' ? '#dc2626' : '#f59e0b' }}>
                        {detail.percentage != null ? pct(detail.percentage) : '—'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Điểm %</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>
                        {detail.total_score != null ? `${detail.total_score}/${detail.max_score}` : '—'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Điểm số</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <StatusBadge status={detail.status} />
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Trạng thái</div>
                </div>
                {detail.submitted_at && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>
                            {new Date(detail.submitted_at).toLocaleString('vi-VN')}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Nộp lúc</div>
                    </div>
                )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
                {!detail.answers?.length ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '30px 0', fontSize: 13 }}>
                        Chưa có câu trả lời nào
                    </div>
                ) : detail.answers.map((ans, i) => {
                    const isCorrect = ans.is_correct;
                    const isShort = ans.question_type === 'short_answer';
                    return (
                        <div key={i} style={{
                            border: `1px solid ${isCorrect ? '#bbf7d0' : isShort ? '#e2e8f0' : '#fecaca'}`,
                            borderRadius: 8, padding: 12, marginBottom: 10,
                            background: isCorrect ? '#f0fdf4' : isShort ? '#fafafa' : '#fef2f2',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', flex: 1, paddingRight: 12 }}>
                                    Câu {i + 1}: {ans.content}
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, color: isCorrect ? '#16a34a' : '#dc2626' }}>
                                    {ans.score != null ? `${ans.score}` : '—'}/{ans.points} đ
                                </span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <div>
                                    <span style={{ color: 'var(--text-3)' }}>Trả lời: </span>
                                    <strong style={{ color: isCorrect ? '#16a34a' : '#dc2626' }}>
                                        {ans.answer || '(Chưa trả lời)'}
                                    </strong>
                                </div>
                                {!isShort && (
                                    <div>
                                        <span style={{ color: 'var(--text-3)' }}>Đáp án: </span>
                                        <strong style={{ color: '#16a34a' }}>{ans.correct_answer}</strong>
                                    </div>
                                )}
                                {ans.ai_feedback && (
                                    <div style={{ marginTop: 4, padding: '5px 10px', background: '#f0f9ff', borderRadius: 6, borderLeft: '3px solid #3b82f6', fontSize: 11, color: '#1e40af' }}>
                                        💡 {ans.ai_feedback}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Panel danh sách nhân viên ────────────────────────────────
function AssignmentSubmissionsPanel({ assignment, onBack, onSelectSubmission }) {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        getAssignmentSubmissions(assignment.id)
            .then(r => setSubmissions(r.data.data))
            .catch(() => toast.error('Không tải được danh sách'))
            .finally(() => setLoading(false));
    }, [assignment.id]);

    const filtered = submissions.filter(s =>
        s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase())
    );

    const graded = submissions.filter(s => s.status === 'graded').length;
    const passed = submissions.filter(s => s.passed).length;
    const avgPct = submissions.filter(s => s.percentage != null).length > 0
        ? submissions.filter(s => s.percentage != null).reduce((a, s) => a + parseFloat(s.percentage), 0) / submissions.filter(s => s.percentage != null).length
        : null;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <button className="btn btn-secondary btn-sm" onClick={onBack}>
                        <ChevronLeft size={13} /> Quay lại
                    </button>
                    <button
                        className="btn btn-success btn-sm"
                        onClick={() => exportDeptExcel(assignment)}
                        title="Xuất Excel phòng ban này"
                    >
                        <FileSpreadsheet size={13} /> Xuất Excel
                    </button>
                </div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{assignment.department_name?.trim()}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{assignment.exam_title}</div>
            </div>

            <div style={{ display: 'flex', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                {[
                    { label: 'Tổng', value: submissions.length, color: '#3b82f6' },
                    { label: 'Đã chấm', value: graded, color: '#8b5cf6' },
                    { label: 'Đạt', value: passed, color: '#16a34a' },
                    { label: 'TB', value: avgPct != null ? pct(avgPct) : '—', color: '#f59e0b' },
                ].map((s, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', background: '#f8fafc', borderRadius: 8, padding: '8px 4px' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                    <input className="form-input" placeholder="Tìm nhân viên..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        style={{ paddingLeft: 30, fontSize: 13 }} />
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 30 }}><div className="spinner" /></div>
                ) : !filtered.length ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '20px 0', fontSize: 13 }}>Không có dữ liệu</div>
                ) : filtered.map(s => (
                    <div key={s.submission_id}
                        onClick={() => onSelectSubmission(s.submission_id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                            borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                            border: '1px solid var(--border)', background: '#fff',
                            transition: 'all 0.12s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                            {s.full_name?.split(' ').slice(-1)[0]?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.full_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.email}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: s.passed ? '#16a34a' : s.status === 'graded' ? '#dc2626' : 'var(--text-3)' }}>
                                {s.percentage != null ? pct(s.percentage) : '—'}
                            </div>
                            <StatusBadge status={s.status} />
                        </div>
                        <ChevronRight size={14} color="var(--text-3)" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ExamResultsPage() {
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedExam, setExpandedExam] = useState(null);
    const [panel, setPanel] = useState(null);

    useEffect(() => {
        getAssignments()
            .then(r => setAssignments(r.data.data))
            .catch(() => toast.error('Không tải được dữ liệu'))
            .finally(() => setLoading(false));
    }, []);

    const examMap = {};
    assignments.forEach(a => {
        if (!examMap[a.exam_id]) {
            examMap[a.exam_id] = {
                exam_id: a.exam_id,
                exam_title: a.exam_title,
                passing_score: a.passing_score,
                assignments: [],
            };
        }
        examMap[a.exam_id].assignments.push(a);
    });
    const exams = Object.values(examMap);

    const filtered = exams.filter(e =>
        e.exam_title?.toLowerCase().includes(search.toLowerCase())
    );

    const toggleExam = (examId) => {
        setExpandedExam(prev => prev === examId ? null : examId);
    };

    const totalStats = (assignments) => ({
        total: assignments.reduce((a, x) => a + (parseInt(x.total_submissions) || 0), 0),
        submitted: assignments.reduce((a, x) => a + (parseInt(x.submitted_count) || 0), 0),
        graded: assignments.reduce((a, x) => a + (parseInt(x.graded_count) || 0), 0),
        passed: assignments.reduce((a, x) => a + (parseInt(x.passed_count) || 0), 0),
    });

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 0px)', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
                <Header title="Kết quả đề thi" subtitle={`${exams.length} đề thi`} />

                <div className="page-content">
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div style={{ padding: '12px 16px' }}>
                            <div style={{ position: 'relative', maxWidth: 320 }}>
                                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                                <input className="form-input" placeholder="Tìm đề thi..."
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    style={{ paddingLeft: 34 }} />
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner spinner-lg" /></div>
                    ) : !filtered.length ? (
                        <div className="card" style={{ textAlign: 'center', padding: '40px 0' }}>
                            <BookOpen size={36} color="var(--text-3)" style={{ margin: '0 auto 10px' }} />
                            <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Chưa có đề thi nào được gửi</div>
                        </div>
                    ) : filtered.map(exam => {
                        const isExpanded = expandedExam === exam.exam_id;
                        const stats = totalStats(exam.assignments);
                        return (
                            <div key={exam.exam_id} className="card" style={{ marginBottom: 12 }}>
                                {/* Exam header */}
                                <div
                                    onClick={() => toggleExam(exam.exam_id)}
                                    style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{exam.exam_title}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, display: 'flex', gap: 14 }}>
                                            <span><Users size={11} style={{ display: 'inline', marginRight: 3 }} />{stats.total} người</span>
                                            <span style={{ color: '#8b5cf6' }}>{stats.graded} đã chấm</span>
                                            <span style={{ color: '#16a34a' }}>{stats.passed} đạt</span>
                                            <span>{exam.assignments.length} phòng ban</span>
                                        </div>
                                    </div>

                                    {/* Nút xuất tất cả */}
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        style={{ flexShrink: 0 }}
                                        onClick={e => { e.stopPropagation(); exportAllDeptExcel(exam); }}
                                        title="Xuất Excel tất cả phòng ban (mỗi dept 1 sheet)"
                                    >
                                        <Download size={12} /> Xuất tất cả
                                    </button>

                                    <div style={{ width: 120, flexShrink: 0 }}>
                                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Tiến độ</span>
                                            <span>{stats.total > 0 ? Math.round((stats.graded / stats.total) * 100) : 0}%</span>
                                        </div>
                                        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', background: 'var(--primary)', borderRadius: 3, width: `${stats.total > 0 ? (stats.graded / stats.total) * 100 : 0}%`, transition: 'width 0.3s' }} />
                                        </div>
                                    </div>

                                    {isExpanded ? <ChevronDown size={16} color="var(--text-3)" /> : <ChevronRight size={16} color="var(--text-3)" />}
                                </div>

                                {/* Departments table */}
                                {isExpanded && (
                                    <div style={{ borderTop: '1px solid var(--border)' }}>
                                        <table className="table" style={{ margin: 0 }}>
                                            <thead>
                                                <tr>
                                                    <th>Phòng ban</th>
                                                    <th>Tổng</th>
                                                    <th>Đã nộp</th>
                                                    <th>Đã chấm</th>
                                                    <th>Đạt</th>
                                                    <th>Gửi lúc</th>
                                                    <th></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {exam.assignments.map(a => (
                                                    <tr key={a.id}>
                                                        <td>
                                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{a.department_name?.trim()}</div>
                                                        </td>
                                                        <td>{a.total_submissions || 0}</td>
                                                        <td>
                                                            <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{a.submitted_count || 0}</span>
                                                            /{a.total_submissions || 0}
                                                        </td>
                                                        <td>
                                                            <span style={{ color: '#3b82f6', fontWeight: 600 }}>{a.graded_count || 0}</span>
                                                            /{a.total_submissions || 0}
                                                        </td>
                                                        <td>
                                                            <span style={{ color: '#16a34a', fontWeight: 600 }}>{a.passed_count || 0}</span>
                                                            /{a.total_submissions || 0}
                                                        </td>
                                                        <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                                                            {new Date(a.sent_at).toLocaleDateString('vi-VN')}
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: 6 }}>
                                                                <button
                                                                    className="btn btn-secondary btn-sm"
                                                                    onClick={() => navigate(`/admin/exam-results/${a.id}`)}
                                                                >
                                                                    <Eye size={12} /> Xem
                                                                </button>
                                                                <button
                                                                    className="btn btn-success btn-sm"
                                                                    onClick={() => exportDeptExcel({ ...a, exam_title: exam.exam_title })}
                                                                    title="Xuất Excel phòng ban này"
                                                                >
                                                                    <FileSpreadsheet size={12} /> Excel
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Side panel */}
            {panel && (
                <div style={{
                    width: 420, flexShrink: 0, borderLeft: '1px solid var(--border)',
                    background: '#fff', height: '100%', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '-4px 0 16px rgba(0,0,0,0.06)',
                }}>
                    {panel.type === 'submissions' && (
                        <AssignmentSubmissionsPanel
                            assignment={panel.assignment}
                            onBack={() => setPanel(null)}
                            onSelectSubmission={(id) => setPanel(prev => ({ type: 'detail', submissionId: id, assignment: prev.assignment }))}
                        />
                    )}
                    {panel.type === 'detail' && (
                        <SubmissionDetailPanel
                            submissionId={panel.submissionId}
                            onClose={() => setPanel({ type: 'submissions', assignment: panel.assignment })}
                        />
                    )}
                </div>
            )}
        </div>
    );
}