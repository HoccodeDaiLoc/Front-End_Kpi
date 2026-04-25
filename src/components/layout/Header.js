import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight } from 'lucide-react';

export default function Header({ title, subtitle, actions }) {
  const navigate = useNavigate();
  return (
    <header className="header">
      <div>
        <div className="header-title">{title}</div>
        {subtitle && <div className="header-sub">{subtitle}</div>}
      </div>
      <div className="header-spacer" />
      <div className="header-actions">
        {actions}
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('/notifications')}>
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
