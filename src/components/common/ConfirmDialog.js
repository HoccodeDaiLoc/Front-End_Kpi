import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ open, onClose, onConfirm, title = 'Xác nhận', message, loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Hủy</button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
          {loading ? 'Đang xử lý...' : 'Xác nhận'}
        </button>
      </>}>
      <div className="flex-center" style={{gap:14,flexDirection:'column',padding:'8px 0'}}>
        <div style={{width:52,height:52,background:'#fef2f2',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <AlertTriangle size={26} color="var(--danger)" />
        </div>
        <p style={{textAlign:'center',color:'var(--text-2)'}}>{message}</p>
      </div>
    </Modal>
  );
}
