import s from './Button.module.css'
const variants = { primary: s.primary, secondary: s.secondary, danger: s.danger, ghost: s.ghost, success: s.success }
export default function Button({ children, variant='primary', size='md', loading, icon, full, ...p }) {
  return (
    <button className={[s.btn, variants[variant]||s.primary, s[size]||s.md, full?s.full:'', loading?s.loading:''].join(' ')} disabled={loading||p.disabled} {...p}>
      {loading ? <span className={s.spinner}/> : icon && <span className={s.icon}>{icon}</span>}
      {children}
    </button>
  )
}
