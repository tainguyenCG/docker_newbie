# Landing Page Full-Stack (Astro + Node.js + MSSQL + Docker)

Dự án Landing Page cơ bản gồm 3 phần:

| Thành phần | Công nghệ | Địa chỉ | Mô tả |
|---|---|---|---|
| **Client** (landing page) | Astro 5 + Tailwind CSS 4 | http://localhost:4321 | Trang landing, nội dung lấy động từ API |
| **Admin** | Astro 5 + Tailwind CSS 4 | http://localhost:4322 | Đăng nhập, thêm/sửa/xóa nội dung landing |
| **Backend API** | Node.js 22 + Express + mssql | http://localhost:3000 | REST API + JWT auth, kết nối SQL Server |
| **Database** | SQL Server 2022 (Docker) | localhost:1433 | Tự tạo DB, bảng và dữ liệu mẫu khi chạy lần đầu |

Điểm nổi bật:
- **Chạy được 2 kiểu**: bằng Docker Compose (một lệnh) hoặc chạy local với `npm run dev`.
- **Tự khởi tạo database**: lần đầu chạy, backend tự tạo database `LandingDB`, 2 bảng (`Users`, `SiteContent`) và dữ liệu mẫu (kể cả tài khoản admin).
- Tài khoản admin mặc định: **`admin` / `admin123`**

---

## 1. Cấu trúc thư mục

> Mỗi thư mục source có **README riêng** mô tả chi tiết chức năng và cách chạy từng phần: [backend/README.md](backend/README.md) · [frontend-client/README.md](frontend-client/README.md) · [frontend-admin/README.md](frontend-admin/README.md)

```
Full_Stack_docker/
├── docker-compose.yml        # Chạy toàn bộ hệ thống bằng Docker
├── .env.example              # Biến môi trường cho Docker Compose (copy thành .env)
│
├── backend/                  # API - Node.js + Express + MSSQL
│   ├── Dockerfile
│   ├── .env                  # Env chạy local (đã có sẵn giá trị mặc định)
│   ├── .env.example
│   └── src/
│       ├── server.js         # Entry point: express app + routes
│       ├── config/db.js      # Cấu hình kết nối + tự tạo DB/bảng/seed
│       ├── middleware/auth.js# Kiểm tra JWT
│       └── routes/
│           ├── auth.js       # POST /api/auth/login
│           └── content.js    # CRUD /api/content
│
├── frontend-client/          # Landing page - Astro + Tailwind
│   ├── Dockerfile
│   ├── astro.config.mjs
│   └── src/
│       ├── layouts/Layout.astro
│       ├── pages/index.astro # Landing page (fetch nội dung từ API)
│       └── styles/global.css
│
└── frontend-admin/           # Admin panel - Astro + Tailwind
    ├── Dockerfile
    ├── astro.config.mjs
    └── src/
        ├── layouts/AdminLayout.astro
        └── pages/
            ├── login.astro       # Trang đăng nhập
            └── dashboard.astro   # Quản lý nội dung (CRUD)
```

---

## 2. Yêu cầu môi trường

| Cách chạy | Cần cài đặt |
|---|---|
| **Docker** | Docker Desktop 4.x trở lên (đã bật và đang chạy). Không cần cài Node.js hay SQL Server. |
| **Local (dev)** | Node.js **20+** (khuyến nghị 22 LTS), npm, và SQL Server đang chạy ở `localhost:1433` (có thể dùng Docker chỉ chạy riêng SQL Server — xem mục 3.2). |

Cổng sử dụng: `1433` (SQL Server), `3000` (API), `4321` (client), `4322` (admin). Đảm bảo các cổng này chưa bị chiếm.

---

## 3. Chạy dự án

### Cách 1 — Chạy toàn bộ bằng Docker (khuyên dùng)

> Bật Docker Desktop và đợi nó chạy xong trước khi thực hiện.

```bash
# (Tuỳ chọn) Tạo file .env để đổi mật khẩu SA, JWT secret...
# Nếu bỏ qua, hệ thống dùng giá trị mặc định trong docker-compose.yml
cp .env.example .env

# Build và chạy tất cả (lần đầu sẽ mất vài phút để build image)
docker compose up --build -d

# Xem log (đợi thấy "[db] Database connected and schema ready")
docker compose logs -f backend
```

Sau khi xong, mở trình duyệt:

| Ứng dụng | URL |
|---|---|
| Landing page | http://localhost:4321 |
| Admin panel | http://localhost:4322 (đăng nhập `admin` / `admin123`) |
| API health check | http://localhost:3000/api/health |

Dừng / xóa:

```bash
docker compose down          # Dừng, giữ dữ liệu database
docker compose down -v       # Dừng VÀ xóa toàn bộ dữ liệu database
```

> Backend được cấu hình tự chờ và thử kết nối lại SQL Server (tối đa 20 lần x 3 giây), nên lần đầu chạy chậm chút là bình thường.

### Cách 2 — Chạy local để phát triển (hot reload)

Chạy SQL Server bằng Docker (không cần cài SQL Server lên máy), còn lại 3 project chạy bằng Node.js để có hot reload:

**Cách nhanh — chạy tất cả từ thư mục gốc bằng `concurrently` (1 terminal duy nhất):**

```bash
# Bước 1: Cài dependencies của cả 4 thư mục (root + backend + 2 frontend)
npm install && npm --prefix backend install && npm --prefix frontend-client install && npm --prefix frontend-admin install

# Bước 2: Chỉ chạy SQL Server
npm run sql

# Bước 3: Chạy đồng thời cả 3 src (backend + client + admin) với log có tiền tố màu
npm run dev
```

Lệnh `npm run dev` ở gốc sẽ khởi động cả 3 project cùng lúc, log mỗi project có nhãn riêng: `[backend]` (vàng), `[client]` (xanh cyan), `[admin]` (tím). Dừng tất cả bằng `Ctrl + C`.

**Hoặc cách thủ công — mỗi project một terminal:**

```bash
# Bước 0: Chạy SQL Server
docker compose up -d sqlserver

# Bước 1: Backend (cổng 3000)
cd backend
npm install
npm run dev

# Bước 2: Client (cổng 4321) — mở terminal mới
cd frontend-client
npm install
npm run dev

# Bước 3: Admin (cổng 4322) — mở terminal mới
cd frontend-admin
npm install
npm run dev
```

Backend tự tạo database/bảng/dữ liệu mẫu khi khởi động — lần đầu `npm run dev` sẽ thấy log:

```
[db] Database connected and schema ready
[db] Seeded default admin user (admin / admin123)
[db] Seeded default landing content
[server] API running at http://localhost:3000
```

> Nếu máy bạn **đã có SQL Server sẵn** ở `localhost:1433`: bỏ qua Bước 1, chỉ cần sửa mật khẩu trong `backend/.env` cho khớp.

---

## 4. Biến môi trường

### Docker Compose (file `.env` ở thư mục gốc)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `SA_PASSWORD` | `YourStrong@Passw0rd` | Mật khẩu sa của SQL Server. **Bắt buộc**: tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số, ký tự đặc biệt. |
| `MSSQL_DATABASE` | `LandingDB` | Tên database |
| `JWT_SECRET` | `dev_secret_change_me` | Khóa ký JWT — nên đổi khi triển khai thật |

### Backend (file `backend/.env` khi chạy local)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `3000` | Cổng API |
| `MSSQL_HOST` | `localhost` | Địa chỉ SQL Server (trong Docker là `sqlserver`) |
| `MSSQL_PORT` | `1433` | Cổng SQL Server |
| `MSSQL_USER` | `sa` | User SQL Server |
| `MSSQL_PASSWORD` | `YourStrong@Passw0rd` | Mật khẩu |
| `MSSQL_DATABASE` | `LandingDB` | Tên database |
| `JWT_SECRET` | `dev_secret_change_me` | Khóa ký JWT |

### Frontend (client & admin)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PUBLIC_API_URL` | `http://localhost:3000` | Địa chỉ API mà **trình duyệt** gọi tới. Lưu ý: biến này được nhúng vào code **lúc build**, nên nếu thay đổi phải build lại (`npm run build` hoặc `docker compose up --build`). |

---

## 5. API

Base URL: `http://localhost:3000`

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/health` | Không | Kiểm tra API sống |
| POST | `/api/auth/login` | Không | Đăng nhập, trả về JWT (`{ token, username }`) |
| GET | `/api/content` | Không | Danh sách toàn bộ nội dung, sắp theo `SortOrder` |
| POST | `/api/content` | JWT | Tạo mục mới: `{ sectionKey, title, subtitle, description, sortOrder }` |
| PUT | `/api/content/:id` | JWT | Cập nhật: `{ title, subtitle, description, sortOrder }` |
| DELETE | `/api/content/:id` | JWT | Xóa mục |

Các endpoint có Auth cần header: `Authorization: Bearer <token>` (token hết hạn sau 8 giờ).

Ví dụ với curl:

```bash
# Đăng nhập lấy token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Xem nội dung landing
curl http://localhost:3000/api/content

# Cập nhật tiêu đề hero (thay <TOKEN> bằng token vừa lấy)
curl -X PUT http://localhost:3000/api/content/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"title":"Tiêu đề mới","subtitle":"Sub mới","sortOrder":1}'
```

### Cấu trúc dữ liệu

- **`Users`**: `Id`, `Username` (unique), `PasswordHash` (bcrypt), `CreatedAt`
- **`SiteContent`**: `Id`, `SectionKey` (unique: `hero`, `about`, `feature_1`...), `Title`, `Subtitle`, `Description`, `SortOrder`, `UpdatedAt`

Landing page map nội dung theo `SectionKey`:
- `hero` → `Title`, `Subtitle`
- `about` → `Title`, `Description`
- `feature_1`, `feature_2`, `feature_3` → `Title`, `Description`
- `contact` → `Title`, `Subtitle`

---

## 6. Sử dụng Admin

1. Mở http://localhost:4322 → đăng nhập `admin` / `admin123`.
2. **Dashboard** hiển thị bảng toàn bộ mục nội dung.
3. **+ Thêm mục mới**: nhập `SectionKey` mới (ví dụ `feature_4`) + các trường nội dung.
   - Mục mới sẽ **không tự hiển thị** ở landing page trừ khi trùng `SectionKey` có sẵn trong thiết kế (`hero`, `about`, `feature_N`, `contact`) — dùng để **sửa nội dung** các section này, hoặc mở rộng ở `frontend-client/src/pages/index.astro`.
4. **Sửa / Xóa** từng mục; thay đổi có hiệu lực ngay khi refresh landing page.
5. **Đăng xuất** ở góc phải trên.

---

## 7. Xử lý sự cố (Troubleshooting)

| Vấn đề | Nguyên nhân & cách xử lý |
|---|---|
| `docker compose up` báo không kết nối được Docker | Docker Desktop chưa bật. Mở Docker Desktop, đợi icon ở góc màn hình báo "running" rồi chạy lại. |
| SQL Server không start, log báo password policy | `SA_PASSWORD` không đạt yêu cầu (≥8 ký tự, hoa + thường + số + ký tự đặc biệt). Sửa file `.env` rồi `docker compose down -v && docker compose up --build -d`. |
| Backend báo `Login failed for user 'sa'` | Mật khẩu trong `backend/.env` (local) hoặc `SA_PASSWORD` (Docker) không khớp SQL Server. Nếu SQL Server đã tạo với mật khẩu cũ, phải `docker compose down -v` để xóa volume rồi chạy lại. |
| Cổng bị chiếm (`port already allocated` / `EADDRINUSE`) | Đổi cổng: với Docker sửa phần `ports` trong `docker-compose.yml`; với local sửa `PORT`/`server.port` tương ứng. |
| Landing page hiển thị nội dung mặc định (không phải nội dung đã sửa) | Trình duyệt không gọi được API. Kiểm tra backend chạy chưa (`/api/health`) và `PUBLIC_API_URL` đúng chưa. |
| Sửa `PUBLIC_API_URL` nhưng không có hiệu lực | Biến này được nhúng lúc **build**. Chạy lại `npm run build`, hoặc với Docker: `docker compose up --build -d client admin`. |
| Image SQL Server không tải được trên máy Apple Silicon | Image chính thức chỉ có bản amd64, thêm `platform: linux/amd64` vào service `sqlserver` (chạy qua Rosetta). Trên Windows không gặp lỗi này. |
| Muốn reset toàn bộ database về dữ liệu mẫu | `docker compose down -v` rồi `docker compose up -d`. Khi chạy local, xóa database `LandingDB` trong SQL Server rồi khởi động lại backend. |

---

## 8. Lệnh thường dùng

| Vị trí | Lệnh | Mô tả |
|---|---|---|
| Gốc | `docker compose up --build -d` | Build + chạy toàn bộ hệ thống |
| Gốc | `npm run dev` | Chạy đồng thời backend + client + admin (concurrently) |
| Gốc | `npm run sql` | Chỉ chạy SQL Server bằng Docker (cho chế độ dev local) |
| Gốc | `docker compose logs -f backend` | Xem log backend |
| Gốc | `docker compose down` / `down -v` | Dừng / dừng + xóa dữ liệu DB |
| Gốc | `docker compose up -d sqlserver` | Chỉ chạy SQL Server (cho chế độ dev local) |
| backend | `npm run dev` / `npm start` | Chạy dev (nodemon) / chạy production |
| frontend-client | `npm run dev` / `npm run build` | Dev server (4321) / build |
| frontend-admin | `npm run dev` / `npm run build` | Dev server (4322) / build |
