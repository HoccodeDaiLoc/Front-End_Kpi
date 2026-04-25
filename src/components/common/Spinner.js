import React from 'react';
export default function Spinner({ size = '', center = false }) {
  const el = <div className={`spinner ${size === 'lg' ? 'spinner-lg' : ''}`} />;
  return center ? <div className="loading-page">{el}</div> : el;
}
