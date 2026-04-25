import React from 'react';
import { getStatusColor, getStatusLabel, getRoleLabel } from '../../utils/helpers';

export function StatusBadge({ status }) {
  const color = getStatusColor(status);
  return (
    <span className="badge" style={{ background: color + '1a', color }}>
      <span className="badge-dot" />
      {getStatusLabel(status)}
    </span>
  );
}

export function RoleBadge({ role }) {
  const colors = { admin: '#7c3aed', employee: '#0891b2', manager: '#d97706', director: '#059669' };
  const c = colors[role] || '#64748b';
  return (
    <span className="badge" style={{ background: c + '1a', color: c }}>
      {getRoleLabel(role)}
    </span>
  );
}
