import s from './StatCard.module.css'

export default function StatCard({ title, value, icon, color='blue', sub, trend }) {
  const colors = { blue:'#1a56db', green:'#0e9f6e', orange:'#ff6b35', purple:'#7c3aed', red:'#e02424' }
  const bgs = { blue:'#e8efff', green:'#d1fae5', orange:'#ffedd5', purple:'#ede9fe', red:'#fee2e2' }
  return (
    <div className={s.card}>
      <div className={s.top}>
        <div className={s.info}>
          <p className={s.title}>{title}</p>
          <p className={s.value}>{value}</p>
          {sub && <p className={s.sub}>{sub}</p>}
        </div>
        <div className={s.iconWrap} style={{background:bgs[color],color:colors[color]}}>{icon}</div>
      </div>
      {trend !== undefined && (
        <div className={s.trend} style={{color: trend>=0 ? '#059669':'#dc2626'}}>
          <span>{trend>=0?'↑':'↓'} {Math.abs(trend)}%</span>
          <span className={s.trendLabel}>so với kỳ trước</span>
        </div>
      )}
    </div>
  )
}
