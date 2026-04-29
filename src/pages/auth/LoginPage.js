import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { login as loginApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import './LoginPage.scss';

// Hình ảnh từ Cloudinary (giữ nguyên như mẫu)
const LOGO_URL = 'https://res.cloudinary.com/dwwkiuqp0/image/upload/v1776840490/Screenshot_2026-04-22_134744_qyinvb.png';
const SLIDE_1 = 'https://res.cloudinary.com/dwwkiuqp0/image/upload/v1776839961/ChatGPT_Image_13_38_57_22_thg_4_2026_nvmhbj.png';
const SLIDE_2 = 'https://res.cloudinary.com/dwwkiuqp0/image/upload/v1776840220/ChatGPT_Image_13_43_03_22_thg_4_2026_qxqn54.png';
const SLIDE_3 = 'https://res.cloudinary.com/dwwkiuqp0/image/upload/v1776840315/ChatGPT_Image_13_44_54_22_thg_4_2026_ouzvse.png';

// Fallback images
const FALLBACK_SLIDE = 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80';

// Component Floating Shapes
const FloatingShapes = () => {
  const containerRef = useRef(null);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const cfgs = [
      { type: 'circle', sizes: [50, 75, 100, 130] },
      { type: 'star', sizes: [45, 60, 80] },
      { type: 'half', sizes: [70, 90, 110] },
      { type: 'dot', sizes: [30, 45, 55] },
    ];
    
    const rnd = (a, b) => a + Math.random() * (b - a);
    
    const createShape = () => {
      const cfg = cfgs[Math.floor(Math.random() * cfgs.length)];
      const size = cfg.sizes[Math.floor(Math.random() * cfg.sizes.length)];
      
      const el = document.createElement('div');
      el.className = `shape shape-${cfg.type}`;
      
      const h = cfg.type === 'half' ? size / 2 : size;
      const dur = rnd(8, 16);
      const blur = rnd(0, 2);
      const scale = rnd(0.7, 1.3);
      
      el.style.cssText = `
        width: ${size}px;
        height: ${h}px;
        left: ${rnd(-5, 100)}vw;
        animation-duration: ${dur}s;
        animation-delay: ${rnd(0, 5)}s;
        transform: scale(${scale});
        filter: blur(${blur}px);
        opacity: ${rnd(0.4, 1)};
      `;
      
      container.appendChild(el);
      setTimeout(() => el.remove(), (dur + 2) * 1000);
    };
    
    // Tạo 22 shape ban đầu
    for (let i = 0; i < 22; i++) createShape();
    const interval = setInterval(createShape, 900);
    
    return () => clearInterval(interval);
  }, []);
  
  return <div className="shapes-container" ref={containerRef} />;
};

// Component Banner Slider
const BannerSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState({});
  const intervalRef = useRef(null);
  
  const slides = [
    {
      img: SLIDE_1,
      fallback: FALLBACK_SLIDE,
      tag: 'Hệ thống đánh giá KPI',
      title: 'Đánh giá hiệu suất\nnhân viên toàn diện',
      sub: 'Minh bạch – Chính xác – Tối ưu hiệu quả làm việc'
    },
    {
      img: SLIDE_2,
      fallback: FALLBACK_SLIDE,
      tag: 'Công nghệ thông minh',
      title: 'Tự động hóa quy trình\nđánh giá KPI',
      sub: 'Giảm sai sót, tiết kiệm thời gian, nâng cao hiệu suất'
    },
    {
      img: SLIDE_3,
      fallback: FALLBACK_SLIDE,
      tag: 'Phân tích nâng cao',
      title: 'Theo dõi hiệu suất\ntheo thời gian thực',
      sub: 'Dữ liệu trực quan giúp ra quyết định nhanh chóng'
    }
  ];
  
  const goToSlide = (index) => {
    const newIndex = (index + slides.length) % slides.length;
    setCurrentIndex(newIndex);
  };
  
  const nextSlide = () => goToSlide(currentIndex + 1);
  const prevSlide = () => goToSlide(currentIndex - 1);
  
  // Auto slide
  useEffect(() => {
    intervalRef.current = setInterval(nextSlide, 4500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentIndex]);
  
  // Handle image load
  const handleImageLoad = (index) => {
    setImagesLoaded(prev => ({ ...prev, [index]: true }));
  };
  
  return (
    <div className="banner-side">
      <button className="barrow barrow-prev" onClick={prevSlide}>‹</button>
      <button className="barrow barrow-next" onClick={nextSlide}>›</button>
      
      <div className="banner-track" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
        {slides.map((slide, idx) => (
          <div key={idx} className="banner-slide">
            <img 
              src={slide.img} 
              alt={slide.tag}
              onError={(e) => { e.target.src = slide.fallback; }}
              onLoad={() => handleImageLoad(idx)}
              style={{ opacity: imagesLoaded[idx] ? 1 : 0 }}
            />
            <div className="caption">
              <span className="caption-tag">{slide.tag}</span>
              <p className="caption-title">
                {slide.title.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < slide.title.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </p>
              <p className="caption-sub">{slide.sub}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="banner-nav">
        {slides.map((_, idx) => (
          <button
            key={idx}
            className={`bdot ${currentIndex === idx ? 'active' : ''}`}
            onClick={() => goToSlide(idx)}
          />
        ))}
      </div>
    </div>
  );
};

// Component chính LoginPage
export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    
    setLoading(true);
    try {
      const res = await loginApi(form);
      login(res.data.data.token, res.data.data.user);
      toast.success('Đăng nhập thành công!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="auth-page">
      {/* SVG Filters cho hiệu ứng grain */}
      <svg className="filters">
        <defs>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feBlend in="SourceGraphic" mode="multiply" result="blend" />
            <feComposite in="blend" in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
      </svg>
      
      <FloatingShapes />
      
      <div className="login-card">
        {/* Form Side */}
        <div className="form-side">
          <div className="brand">
            <img src={LOGO_URL} alt="Viet Huong Ceramics" />
            <div className="brand-text">
              <div className="brand-main">VIET HUONG CERAMICS</div>
              <div className="brand-sub">Luôn đồng hành cùng nhân viên</div>
            </div>
          </div>
          
          <h1 className="form-title">
            <span className="sub-title">Đánh giá cùng</span><br />
            <span className="main-title">Viet Huong Ceramics</span>
          </h1>
          <p className="form-sub">Đăng nhập để tiếp tục</p>
          
          <form onSubmit={handleSubmit}>
            <div className="field">
              <input
                type="email"
                placeholder=" "
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <label>Email</label>
            </div>
            
            <div className="field">
              <input
                type="password"
                placeholder=" "
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <label>Mật khẩu</label>
            </div>
            
            <button 
              type="submit" 
              className={`btn-submit ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              <span className="btn-text">
                {loading ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP →'}
              </span>
            </button>
          </form>
          
          <div style={{ textAlign: 'right', marginTop: '12px' }}>
            <Link to="/forgot-password" className="forgot-link">Quên mật khẩu?</Link>
          </div>
          
          <p className="terms">
            Bằng cách đăng nhập, bạn đồng ý với
            <a href="#"> Terms of Use</a> và <a href="#"> Privacy policy</a>
          </p>
        </div>
        
        {/* Banner Side */}
        <BannerSlider />
      </div>
    </div>
  );
}