import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import { getProposalResults } from '../../api/proposals';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, Cell
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 2 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill }} />
                    <span style={{ color: '#64748b' }}>{p.dataKey}:</span>
                    <span style={{ fontWeight: 600 }}>{p.value}</span>
                </div>
            ))}
        </div>
    );
};

const CustomRatingTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{d.answer} — {d.total} người</div>
            {d.depts.map((dept, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 2 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                    <span style={{ color: '#64748b' }}>{dept.name}:</span>
                    <span style={{ fontWeight: 600 }}>{dept.count}</span>
                </div>
            ))}
        </div>
    );
};

function ChartBlock({ question, index }) {
    const [open, setOpen] = useState(index === 0);

    const buildChartData = () => {
        if (question.question_type === 'multiple_choice') {
            const answerMap = {};
            const depts = new Set();
            question.chart_data.forEach(row => {
                depts.add(row.dept_name);
                if (!answerMap[row.answer]) answerMap[row.answer] = { answer: row.answer };
                answerMap[row.answer][row.dept_name] = parseInt(row.count);
            });
            return { data: Object.values(answerMap), depts: [...depts], type: 'multiple_choice' };
        }
        if (question.question_type === 'rating') {
            const ratingMap = {};
            question.chart_data.forEach(row => {
                const key = `${row.rating}⭐`;
                if (!ratingMap[key]) ratingMap[key] = { answer: key, total: 0, depts: [] };
                ratingMap[key].total += parseInt(row.count);
                ratingMap[key].depts.push({ name: row.dept_name, count: parseInt(row.count) });
            });
            return { data: Object.values(ratingMap), depts: null, type: 'rating' };
        }
        return { data: [], depts: [], type: 'text' };
    };

    const { data, depts, type } = buildChartData();
    const totalAnswers = question.chart_data?.length || 0;

    const typeLabel = {
        multiple_choice: '📊 Trắc nghiệm',
        rating: '⭐ Thang điểm',
        text: '💬 Văn bản tự do',
    }[question.question_type];

    return (
        <div style={{ border: '1px solid #e8edf5', borderRadius: 14, marginBottom: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div onClick={() => setOpen(o => !o)} style={{
                padding: '16px 20px', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: open ? 'linear-gradient(135deg, #f0f4ff, #f8faff)' : '#fff',
                transition: 'background 0.2s'
            }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {index + 1}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{question.content}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3, display: 'flex', gap: 8 }}>
                            <span>{typeLabel}</span>
                            <span>·</span>
                            <span style={{ color: '#10b981', fontWeight: 600 }}>{totalAnswers} phản hồi</span>
                        </div>
                    </div>
                </div>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
            </div>

            {open && (
                <div style={{ padding: '20px', borderTop: '1px solid #f1f5f9' }}>
                    {question.chart_type === 'text' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {question.chart_data.length === 0 ? (
                                <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>Chưa có câu trả lời</div>
                            ) : question.chart_data.map((row, i) => (
                                <div key={i} style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 10, borderLeft: '3px solid var(--primary)' }}>
                                    <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.5 }}>{row.answer}</div>
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, display: 'flex', gap: 12 }}>
                                        <span>👤 {row.user_name}</span>
                                        <span>🏢 {row.dept_name}</span>
                                        <span>📅 {new Date(row.answered_at).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : data.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>Chưa có câu trả lời</div>
                    ) : type === 'rating' ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }} barCategoryGap="40%">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="answer" tick={{ fontSize: 13, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomRatingTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                                <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={70}>
                                    {data.map((entry, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }} barCategoryGap="35%">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="answer" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                {depts.map((dept, i) => (
                                    <Bar key={dept} dataKey={dept} fill={COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} maxBarSize={60} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ProposalResultsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getProposalResults(id)
            .then(r => setData(r.data.data))
            .catch(() => toast.error('Không tải được kết quả'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>;
    if (!data) return null;

    const { proposal, stats, questions } = data;
    const responsePct = stats.total_recipients > 0
        ? Math.round((stats.total_responded / stats.total_recipients) * 100)
        : 0;

    return (
        <div style={{ minHeight: '100vh' }}>
            <Header title={proposal.title} subtitle={`Kết quả khảo sát · ${questions.length} câu hỏi`} />
            <div className="page-content">
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/proposals')}>
                        <ChevronLeft size={13} /> Quay lại
                    </button>
                    {[
                        { label: 'Tổng người nhận', value: stats.total_recipients, color: '#3b82f6' },
                        { label: 'Đã trả lời', value: stats.total_responded, color: '#10b981' },
                        { label: 'Tỉ lệ', value: `${responsePct}%`, color: '#f59e0b' },
                    ].map((s, i) => (
                        <div key={i} className="card" style={{ padding: '12px 20px', textAlign: 'center', minWidth: 110 }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.label}</div>
                        </div>
                    ))}
                    <div className="card" style={{ flex: 1, padding: '12px 20px', minWidth: 200 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                            <span style={{ color: 'var(--text-3)' }}>Tiến độ phản hồi</span>
                            <span style={{ fontWeight: 600 }}>{responsePct}%</span>
                        </div>
                        <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${responsePct}%`, background: '#10b981', borderRadius: 4, transition: 'width 0.5s' }} />
                        </div>
                    </div>
                </div>
                {questions.map((q, i) => (
                    <ChartBlock key={q.id} question={q} index={i} />
                ))}
            </div>
        </div>
    );
}