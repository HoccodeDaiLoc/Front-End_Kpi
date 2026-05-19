// src/pages/shared/ExamDonePage.jsx
export default function ExamDonePage() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#f8fafc', fontFamily: 'system-ui, sans-serif', padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 28px',
        maxWidth: 360, width: '100%', textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#16a34a', marginBottom: 10 }}>
          Nộp bài thành công!
        </div>
        <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
          Kết quả sẽ được gửi về tài khoản của bạn sau khi chấm xong.
          <br />Bạn có thể đóng trang này.
        </div>
      </div>
    </div>
  );
}