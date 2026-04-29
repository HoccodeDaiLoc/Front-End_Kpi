// src/utils/exportPdf.js
import html2pdf from 'html2pdf.js';

const getRank = (total) => {
  if (total >= 95) return 'A';
  if (total >= 86) return 'B';
  if (total >= 76) return 'C';
  if (total >= 66) return 'D';
  return 'E';
};

const formatDate = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const formatNumber = (num) => {
  if (num === undefined || num === null) return '—';
  return Number(num).toFixed(2);
};

export const exportKpiToPDF = ({ evaluation, template, scores, employee, selfTotal, managerTotal, finalTotal }) => {
  const criteria = template?.criteria || [];
  const selfRank = getRank(selfTotal);
  const managerRank = getRank(managerTotal);
  const finalRank = getRank(finalTotal);
  
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  document.body.appendChild(container);
  
  container.innerHTML = `
    <div class="kpi-pdf-wrapper" style="font-family: 'Times New Roman', Arial, sans-serif; max-width: 1100px; margin: 0 auto; padding: 40px; background: white;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #b22222; padding-bottom: 20px;">
        <div style="font-size: 24px; font-weight: bold; color: #b22222; margin-bottom: 8px;">BẢNG ĐÁNH GIÁ KPI</div>
        <div style="font-size: 14px; font-weight: 500; margin-bottom: 4px;">CÔNG TY CỔ PHẦN XÂY DỰNG GỐM SỨ VIỆT HƯƠNG</div>
        <div style="font-size: 12px; color: #666; margin-bottom: 10px;">(VIET HUONG CERAMICS)</div>
        <div style="font-size: 14px; font-weight: 500; margin-top: 10px;">${template?.name || 'Bảng đánh giá KPI'}</div>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <tr><td style="padding: 6px 0; width: 180px;"><strong>Họ và tên nhân sự:</strong></td><td style="padding: 6px 0;">${employee?.fullName || '—'}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Phòng ban:</strong></td><td style="padding: 6px 0;">${employee?.department || template?.department || '—'}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Chức danh:</strong></td><td style="padding: 6px 0;">${employee?.position || '—'}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Kỳ đánh giá:</strong></td><td style="padding: 6px 0;">${evaluation?.period || '—'}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Ngày đánh giá:</strong></td><td style="padding: 6px 0;">${formatDate(evaluation?.submittedAt) || formatDate(new Date())}</td></tr>
      </table>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
        <thead><tr style="background: #f5e6e6;"><th style="border: 1px solid #ddd; padding: 10px;">STT</th><th style="border: 1px solid #ddd; padding: 10px;">Tiêu chí đánh giá</th><th style="border: 1px solid #ddd; padding: 10px;">Trọng số</th><th style="border: 1px solid #ddd; padding: 10px;">Điểm tối đa</th><th style="border: 1px solid #ddd; padding: 10px;">Cá nhân</th><th style="border: 1px solid #ddd; padding: 10px;">Quản lý</th></tr></thead>
        <tbody>
          ${criteria.map((c, i) => {
            const s = scores[c.id] || {};
            return `<tr><td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${i + 1}</td><td style="border: 1px solid #ddd; padding: 8px;"><strong>${c.name}</strong>${c.description ? `<div style="font-size: 10px; color: #666;">${c.description}</div>` : ''}</td><td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${c.weight}%</td><td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${c.maxScore}</td><td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${s.selfScore ?? '—'}</td><td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${s.managerScore ?? '—'}</td></tr>`;
          }).join('')}
          <tr style="background: #fafafa; font-weight: bold;"><td colspan="4" style="border: 1px solid #ddd; padding: 10px; text-align: right;">TỔNG ĐIỂM:</td><td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${formatNumber(selfTotal)}<div style="font-size: 11px;">Xếp hạng: ${selfRank}</div></td><td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${formatNumber(managerTotal)}<div style="font-size: 11px;">Xếp hạng: ${managerRank}</div></td></tr>
        </tbody>
      </table>
      
      ${evaluation?.selfComment ? `<div style="margin-bottom: 15px;"><strong>Nhận xét của nhân viên:</strong><div style="margin-top: 5px; padding: 10px; background: #f8fafc; border-radius: 6px;">${evaluation.selfComment}</div></div>` : ''}
      ${evaluation?.managerComment ? `<div style="margin-bottom: 15px;"><strong>Nhận xét của quản lý:</strong><div style="margin-top: 5px; padding: 10px; background: #f8fafc; border-radius: 6px;">${evaluation.managerComment}</div></div>` : ''}
      
      <div style="margin-top: 30px; padding: 12px; background: ${finalRank === 'A' ? '#e8f5e9' : '#fff3e0'}; border-radius: 8px; text-align: center;">
        <strong>KẾT QUẢ XẾP LOẠI CUỐI CÙNG: </strong>
        <span style="display: inline-block; padding: 4px 20px; background: ${finalRank === 'A' ? '#059669' : finalRank === 'B' ? '#3b82f6' : finalRank === 'C' ? '#f59e0b' : '#ef4444'}; color: white; border-radius: 20px; font-weight: bold; font-size: 18px; margin-left: 10px;">${finalRank}</span>
      </div>
      
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #999;">
        Bộ đánh giá KPI lưu hành nội bộ | Ngày xuất: ${formatDate(new Date())}
      </div>
    </div>
  `;
  
  const opt = {
    margin: [0.5, 0.5, 0.5, 0.5],
    filename: `KPI_${employee?.fullName || 'danh_gia'}_${evaluation?.period || new Date().getFullYear()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, letterRendering: true, useCORS: true },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };
  
  html2pdf().set(opt).from(container).save().finally(() => {
    document.body.removeChild(container);
  });
};