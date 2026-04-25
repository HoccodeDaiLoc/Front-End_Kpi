import { useEffect } from 'react'
import { X } from 'lucide-react'
import s from './Modal.module.css'

export default function Modal({ open, onClose, title, children, size='md' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null
  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={[s.modal, s[size]].join(' ')}>
        <div className={s.header}>
          <h3 className={s.title}>{title}</h3>
          <button className={s.close} onClick={onClose}><X size={18}/></button>
        </div>
        <div className={s.body}>{children}</div>
      </div>
    </div>
  )
}
