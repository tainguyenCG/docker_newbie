# Backend — REST API (Node.js + Express + MSSQL)

API server cho Landing Page. Cung cấp endpoint đăng nhập (JWT) và CRUD nội dung landing page, lưu trữ trên SQL Server. **Tự khởi tạo database** (tạo DB, bảng, dữ liệu mẫu) ngay khi chạy lần đầu — không cần chạy script migration thủ công.

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Runtime | Node.js 22 |
| Framework | Express 4 |
| Database | SQL Server 2022 (tương thích 2019+) qua package `mssql` |
| Auth | JWT (`jsonwebtoken`), mật khẩu hash bằng `bcryptjs` |
| Dev | `nodemon` (hot reload), `dotenv`, `cors` |

## Chức năng

1. **Đăng nhập**: nhận `username`/`password`, so với hash bcrypt trong bảng `Users`, trả về JWT hết hạn sau 8 giờ.
2. **CRUD nội dung landing**: bảng `SiteContent` — đọc (công khai), thêm/sửa/xóa (cần JWT).
3. **Tự init database**: kết nối `master` → tạo DB nếu chưa có → tạo bảng `Users`, `SiteContent` nếu chưa có → seed tài khoản `admin/admin123` và 6 mục nội dung mẫu nếu bảng rỗng. Nếu SQL Server chưa sẵn sàng, tự thử lại tối đa **20 lần x 3 giây** (phù hợp khi chạy Docker, phải chờ container DB khởi động).

## Cấu trúc source

```
backend/
├── Dockerfile              # Image production (node:22-alpine)
├── .env                    # Env chạy local (đã có giá trị mặc định)
├── .env.example            # Mẫu env
└── src/
    ├── server.js           # Entry point: tạo express app, đăng ký routes, start
    ├── config/
    │   └── db.js           # Cấu hình kết nối MSSQL + waitAndInitDb() (tạo DB/bảng/seed + retry)
    ├── middleware/
    │   └── auth.js         # Verify JWT từ header Authorization: Bearer <token>
    └── routes/
        ├── auth.js         # POST /api/auth/login
        └── content.js      # GET/POST/PUT/DELETE /api/content
```

## Các bước: Clone → Cài đặt → Chạy

> Yêu cầu: Node.js 20+ (khuyến nghị 22 LTS) và một SQL Server đang chạy ở `localhost:1433` (dùng Docker chạy riêng DB là nhanh nhất — xem bước 1).

```bash
# Bước 1 (nếu chưa có SQL Server): chạy DB bằng Docker từ thư mục gốc repo
docker compose up -d sqlserver

# Bước 2: vào thư mục backend và cài dependencies
cd backend
npm install

# Bước 3: cấu hình env (nếu SQL Server của bạn khác mặc định)
#   Sửa file .env: MSSQL_HOST, MSSQL_PORT, MSSQL_USER, MSSQL_PASSWORD...
cp .env.example .env    # rồi mở .env sửa mật khẩu nếu cần

# Bước 4: chạy dev (hot reload với nodemon)
npm run dev

# Hoặc chạy production
npm start
```

Lần đầu khởi động sẽ thấy:

```
[db] Database connected and schema ready
[db] Seeded default admin user (admin / admin123)
[db] Seeded default landing content
[server] API running at http://localhost:3000
```

Kiểm tra nhanh: mở http://localhost:3000/api/health → `{"status":"ok"}`

## Biến môi trường (`backend/.env`)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `3000` | Cổng API |
| `MSSQL_HOST` | `localhost` | Địa chỉ SQL Server (trong Docker Compose là `sqlserver`) |
| `MSSQL_PORT` | `1433` | Cổng SQL Server |
| `MSSQL_USER` | `sa` | User kết nối |
| `MSSQL_PASSWORD` | `YourStrong@Passw0rd` | Mật khẩu |
| `MSSQL_DATABASE` | `LandingDB` | Tên database (tự tạo nếu chưa có) |
| `JWT_SECRET` | `dev_secret_change_me` | Khóa ký JWT — đổi khi triển khai thật |

> Khi chạy bằng Docker Compose (từ thư mục gốc), các biến này được set sẵn trong `docker-compose.yml`, không cần file `.env` trong image.

## API

Base URL: `http://localhost:3000`

| Method | Endpoint | Auth | Body | Mô tả |
|---|---|---|---|---|
| GET | `/api/health` | — | — | Health check |
| POST | `/api/auth/login` | — | `{ username, password }` | Trả `{ token, username }` |
| GET | `/api/content` | — | — | Danh sách nội dung (sắp theo `SortOrder`) |
| POST | `/api/content` | JWT | `{ sectionKey, title?, subtitle?, description?, sortOrder? }` | Tạo mục (trùng `sectionKey` → 409) |
| PUT | `/api/content/:id` | JWT | `{ title?, subtitle?, description?, sortOrder? }` | Cập nhật (không đổi `SectionKey`) |
| DELETE | `/api/content/:id` | JWT | — | Xóa mục |

Endpoint có Auth cần header: `Authorization: Bearer <token>` (JWT hết hạn sau 8 giờ).

Ví dụ:

```bash
# Đăng nhập lấy token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Đọc nội dung (công khai)
curl http://localhost:3000/api/content

# Sửa mục Id=1
curl -X PUT http://localhost:3000/api/content/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"title":"Tieu de moi","sortOrder":1}'
```

## Database schema

```sql
Users (
  Id INT IDENTITY PRIMARY KEY,
  Username NVARCHAR(50) UNIQUE NOT NULL,
  PasswordHash NVARCHAR(200) NOT NULL,   -- bcrypt
  CreatedAt DATETIME DEFAULT GETDATE()
)

SiteContent (
  Id INT IDENTITY PRIMARY KEY,
  SectionKey NVARCHAR(50) UNIQUE NOT NULL,  -- hero | about | feature_1..N | contact
  Title NVARCHAR(200), Subtitle NVARCHAR(500),
  Description NVARCHAR(MAX),
  SortOrder INT DEFAULT 0,
  UpdatedAt DATETIME DEFAULT GETDATE()
)
```

## Chạy bằng Docker (riêng phần backend)

```bash
# Từ thư mục gốc repo (backend đã được khai báo trong docker-compose.yml)
docker compose up --build -d backend
docker compose logs -f backend
```

Hoặc build image riêng:

```bash
cd backend
docker build -t landing-backend .
docker run -p 3000:3000 -e MSSQL_HOST=host.docker.internal -e MSSQL_PASSWORD=YourStrong@Passw0rd landing-backend
```

## Lỗi thường gặp

| Lỗi | Xử lý |
|---|---|
| `Failed to connect to localhost:1433` lặp lại | SQL Server chưa chạy hoặc sai host/port trong `.env`. Chờ retry hoặc kiểm tra DB. |
| `Login failed for user 'sa'` | Sai mật khẩu trong `.env` so với mật khẩu của SQL Server. |
| `🔐` password policy khi tạo container SQL Server | Mật khẩu SA phải ≥ 8 ký tự, gồm hoa + thường + số + ký tự đặc biệt. |
| Port 3000 bị chiếm (`EADDRINUSE`) | Đổi `PORT` trong `.env` (nhớ cập nhật `PUBLIC_API_URL` ở frontend). |
