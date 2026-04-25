import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Mail, Lock, Target } from 'lucide-react'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import s from './AuthPage.module.css'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      toast.success(`Chào mừng, ${user.fullName || user.email}!`)
      navigate(user.role === 'employee' ? '/my-kpi' : '/dashboard')
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className={s.page}>
      <div className={s.bg}><div className={s.bgShape1}/><div className={s.bgShape2}/></div>
      <div className={s.card}>
        <div className={s.logo}><div className={s.logoIcon}><Target size={24}/></div><div><p className={s.logoTitle}>KPI System</p><p className={s.logoSub}>Đánh giá hiệu suất nội bộ</p></div></div>
        <h2 className={s.heading}>Đăng nhập</h2>
        <form onSubmit={handleSubmit} className={s.form}>
          <Input label="Email" type="email" placeholder="email@company.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} icon={<Mail size={16}/>} required />
          <Input label="Mật khẩu" type="password" placeholder="••••••••" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} icon={<Lock size={16}/>} required />
          <div className={s.forgotRow}><Link to="/forgot-password" className={s.forgot}>Quên mật khẩu?</Link></div>
          <Button type="submit" loading={loading} full size="lg">Đăng nhập</Button>
        </form>
      </div>
    </div>
  )
}
