import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pages.push(i);
  return (
    <div className="pagination">
      <button className="page-btn" disabled={page === 1} onClick={() => onChange(page - 1)}><ChevronLeft size={14} /></button>
      {pages[0] > 1 && <><button className="page-btn" onClick={() => onChange(1)}>1</button>{pages[0] > 2 && <span style={{padding:'0 4px',color:'var(--text-3)'}}>…</span>}</>}
      {pages.map(p => <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => onChange(p)}>{p}</button>)}
      {pages[pages.length-1] < totalPages && <><span style={{padding:'0 4px',color:'var(--text-3)'}}>…</span><button className="page-btn" onClick={() => onChange(totalPages)}>{totalPages}</button></>}
      <button className="page-btn" disabled={page === totalPages} onClick={() => onChange(page + 1)}><ChevronRight size={14} /></button>
    </div>
  );
}
