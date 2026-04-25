import s from './Input.module.css'
export default function Input({ label, error, icon, hint, ...p }) {
  return (
    <div className={s.wrap}>
      {label && <label className={s.label}>{label}{p.required && <span className={s.req}>*</span>}</label>}
      <div className={s.inputWrap}>
        {icon && <span className={s.icon}>{icon}</span>}
        <input className={[s.input, error?s.hasError:'', icon?s.hasIcon:''].join(' ')} {...p} />
      </div>
      {error && <p className={s.error}>{error}</p>}
      {hint && !error && <p className={s.hint}>{hint}</p>}
    </div>
  )
}

export function Select({ label, error, children, ...p }) {
  return (
    <div className={s.wrap}>
      {label && <label className={s.label}>{label}{p.required && <span className={s.req}>*</span>}</label>}
      <select className={[s.input, s.select, error?s.hasError:''].join(' ')} {...p}>{children}</select>
      {error && <p className={s.error}>{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, ...p }) {
  return (
    <div className={s.wrap}>
      {label && <label className={s.label}>{label}{p.required && <span className={s.req}>*</span>}</label>}
      <textarea className={[s.input, s.textarea, error?s.hasError:''].join(' ')} {...p}/>
      {error && <p className={s.error}>{error}</p>}
    </div>
  )
}
