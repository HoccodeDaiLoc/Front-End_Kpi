# KPI Evaluation System - Frontend (ReactJS)

## Yêu cầu
- Node.js >= 16
- Backend đang chạy tại localhost:5000

## Cài đặt & Chạy

```bash
# 1. Cài thư viện
npm install

# 2. Tạo file môi trường
cp .env.example .env
# Sửa REACT_APP_API_URL nếu backend ở địa chỉ khác

# 3. Chạy development
npm start
# Mở http://localhost:3000

# 4. Build production
npm run build
```

## Cấu trúc
```
src/
├── api/           # Gọi API backend
├── components/
│   ├── common/    # Badge, Modal, Spinner, Pagination...
│   └── layout/    # Sidebar, Header, AppLayout
├── context/       # AuthContext (JWT + user state)
├── pages/
│   ├── auth/      # Login, Activate, ForgotPassword
│   ├── admin/     # Users, Departments, KPI Templates, Reports
│   ├── manager/   # Team, Evaluations review
│   ├── employee/  # My evaluations
│   ├── director/  # Approve, Reports
│   └── shared/    # Dashboard, EvaluationDetail, Profile, Notifications
└── utils/         # helpers (score colors, labels, formatDate)
```

## Tài khoản mặc định
- **Admin**: admin@company.com / Admin@123456

## Tính năng
- ✅ Đăng nhập / Kích hoạt tài khoản / Quên mật khẩu
- ✅ Dashboard (biểu đồ KPI theo phòng ban, top nhân viên, trend)
- ✅ Quản lý User (tạo, sửa, xóa, phân quyền)
- ✅ Phòng ban (CRUD)
- ✅ Mẫu KPI (tạo form với tiêu chí, trọng số)
- ✅ Tạo đánh giá KPI (chọn mẫu → nhập điểm → nộp)
- ✅ Workflow duyệt: Employee → Manager → Director
- ✅ Thông báo real-time
- ✅ Hồ sơ cá nhân / Chọn quản lý
- ✅ Báo cáo tổng hợp (Admin/Director)
- ✅ Phân quyền: Admin / Employee / Manager / Director
