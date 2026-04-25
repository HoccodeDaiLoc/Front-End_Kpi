import s from './Table.module.css'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Table({ columns, data, loading, emptyText='Không có dữ liệu' }) {
  if (loading) return <div className={s.loading}><div className={s.spinner}/><span>Đang tải...</span></div>
  return (
    <div className={s.wrap}>
      <table className={s.table}>
        <thead><tr>{columns.map(c => <th key={c.key} style={{width:c.width}}>{c.title}</th>)}</tr></thead>
        <tbody>
          {data?.length ? data.map((row,i) => (
            <tr key={row.id||i}>{columns.map(c => <td key={c.key}>{c.render ? c.render(row[c.key], row) : (row[c.key] ?? '--')}</td>)}</tr>
          )) : <tr><td colSpan={columns.length} className={s.empty}>{emptyText}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

export function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null
  const pages = []
  for (let i = Math.max(1, page-2); i <= Math.min(totalPages, page+2); i++) pages.push(i)
  return (
    <div className={s.pagination}>
      <button disabled={page<=1} onClick={() => onPage(page-1)}><ChevronLeft size={16}/></button>
      {pages[0]>1 && <><button onClick={()=>onPage(1)}>1</button>{pages[0]>2&&<span>…</span>}</>}
      {pages.map(p => <button key={p} className={p===page?s.active:''} onClick={()=>onPage(p)}>{p}</button>)}
      {pages[pages.length-1]<totalPages && <><span>…</span><button onClick={()=>onPage(totalPages)}>{totalPages}</button></>}
      <button disabled={page>=totalPages} onClick={()=>onPage(page+1)}><ChevronRight size={16}/></button>
    </div>
  )
}
