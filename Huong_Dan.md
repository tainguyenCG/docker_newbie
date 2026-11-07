# Hướng dẫn chạy dự án nhanh

## Kết quả test end-to-end (đã chạy thành công)

| Bước test | Kết quả |
|---|---|
| `docker compose up --build -d` | 4 container chạy, SQL Server healthy |
| Backend tự tạo DB + seed | Đã seed admin + 6 mục nội dung |
| Health check `:3000` | `{"status":"ok"}` |
| Landing `:4321` / Admin `:4322` | HTTP 200 |
| `GET /api/content` | Trả 6 mục từ SQL Server |
| Đăng nhập `admin`/`admin123` | Nhận JWT |
| Sửa nội dung qua API (JWT) | Đã cập nhật → đọc lại thấy giá trị mới → đã khôi phục gốc |

## Mở trình duyệt dùng thử

- **Landing page**: http://localhost:4321
- **Admin**: http://localhost:4322 → đăng nhập `admin` / `admin123` → sửa nội dung → F5 landing để thấy thay đổi

## Lần sau muốn chạy lại (Docker Desktop đã bật)

```bash
docker compose up -d        # không cần --build nữa (image đã build sẵn)
docker compose down         # dừng khi xong việc
```

## Hoặc chạy dev mode để sửa code có hot reload

```bash
npm run sql     # chạy riêng SQL Server bằng Docker
npm run dev     # chạy đồng thời backend + client + admin (concurrently)
```

> Chi tiết đầy đủ xem trong `README.md` (tổng quan, API, env, troubleshooting) hoặc README riêng của từng thư mục `backend/`, `frontend-client/`, `frontend-admin/`.
