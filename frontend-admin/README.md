# Frontend Admin — Quản trị nội dung (Astro 5 + Tailwind CSS 4)

Panel quản trị để **thêm / sửa / xóa nội dung landing page**. Chạy ở **http://localhost:4322**. Đăng nhập bằng JWT, mọi thao tác CRUD gọi thẳng tới Backend API từ trình duyệt.

**Tài khoản mặc định: `admin` / `admin123`** (được backend tự seed lần đầu chạy).

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Framework | Astro 5, output `server` + adapter `@astrojs/node` (standalone), port 4322 |
| CSS | Tailwind CSS 4 (plugin `@tailwindcss/vite`) |
| Auth | JWT lưu `localStorage`, gửi qua header `Authorization: Bearer <token>` |
| UI | Table + `<dialog>` modal, vanilla JS (không dùng framework UI) |

## Các trang

| Đường dẫn | File | Chức năng |
|---|---|---|
| `/` | `src/pages/index.astro` | Tự redirect sang `/dashboard` |
| `/login` | `src/pages/login.astro` | Form đăng nhập → gọi `POST /api/auth/login` → lưu `token` + `username` vào `localStorage` → chuyển `/dashboard` |
| `/dashboard` | `src/pages/dashboard.astro` | Bảng toàn bộ mục nội dung; nút **Thêm**, **Sửa** (modal), **Xóa** (confirm); đăng xuất |

## Luồng xác thực

1. `/login`: submit form → `POST {API}/api/auth/login` → nhận `{ token, username }`
2. Lưu vào `localStorage` (`token`, `username`), redirect `/dashboard`
3. Mọi request ở dashboard gửi kèm `Authorization: Bearer <token>`
4. Nhận `401` (token hết hạn 8h / không hợp lệ) → tự xóa localStorage và quay về `/login`
5. Vào `/dashboard` mà chưa có token → redirect `/login` ngay

## Cấu trúc source

```
frontend-admin/
├── Dockerfile              # Build 2 stage: astro build → chạy dist/server/entry.mjs
├── astro.config.mjs        # SSR mode + node adapter + tailwind vite plugin, port 4322
├── tsconfig.json
├── .env.example            # PUBLIC_API_URL
└── src/
    ├── layouts/
    │   └── AdminLayout.astro  # Header: logo, nav, tên user, nút Đăng xuất
    ├── pages/
    │   ├── index.astro        # Redirect → /dashboard
    │   ├── login.astro        # Trang đăng nhập
    │   └── dashboard.astro    # Bảng CRUD + modal thêm/sửa
    └── styles/
        └── global.css         # @import "tailwindcss"
```

Chi tiết `dashboard.astro`:
- `load()`: fetch danh sách nội dung → `render()` vẽ bảng (escape HTML để chống XSS)
- Sự kiện click trong bảng (event delegation): `edit` mở modal điền sẵn dữ liệu (khóa `SectionKey`, không cho đổi), `delete` gọi `DELETE /api/content/:id`
- Modal `<dialog>`: submit → `POST` (thêm mới, bắt buộc `sectionKey`) hoặc `PUT` (sửa) → đóng modal → load lại danh sách

## Các bước: Clone → Cài đặt → Chạy

> Yêu cầu: Node.js 20+. Cần Backend đang chạy ở cổng 3000 (xem `backend/README.md`) — nếu chưa có sẽ thấy báo "Không kết nối được API".

```bash
# Bước 1: vào thư mục và cài dependencies
cd frontend-admin
npm install

# Bước 2: cấu hình địa chỉ API (mặc định http://localhost:3000 — thường không cần sửa)
cp .env.example .env

# Bước 3: chạy dev server (hot reload)
npm run dev
```

Mở **http://localhost:4322** → tự chuyển tới `/login` → đăng nhập `admin` / `admin123` → vào `/dashboard`.

### Chạy production / Docker

```bash
# Build + chạy bản production local
npm run build
node dist/server/entry.mjs        # phục vụ ở cổng 4322

# Hoặc bằng Docker (từ thư mục gốc repo)
docker compose up --build -d admin
```

> Lưu ý: `PUBLIC_API_URL` được **nhúng vào code lúc build**. Đổi địa chỉ API thì phải build lại.

## Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PUBLIC_API_URL` | `http://localhost:3000` | Địa chỉ API mà **trình duyệt** gọi tới |

## Hướng dẫn sử dụng

1. **Thêm mục mới**: nút `+ Thêm mục mới` → nhập `SectionKey` (chỉ chữ, số, `_`, `-`, không trùng), điền Tiêu đề/Subtitle/Mô tả/Thứ tự → Lưu
   - Mục trùng `SectionKey` có sẵn (`hero`, `about`, `feature_1..3`, `contact`) sẽ **ghi đè nội dung section tương ứng** trên landing page
   - `SectionKey` mới hoàn toàn chỉ lưu vào DB — muốn hiển thị section mới thì tự thêm markup `data-field` trong `frontend-client/src/pages/index.astro`
2. **Sửa**: nút `Sửa` trên dòng tương ứng → modal điền sẵn → Lưu
3. **Xóa**: nút `Xóa` → xác nhận. Cẩn thận xóa `hero`/`contact` — landing page sẽ rớt về text mặc định
4. **Đăng xuất**: nút góc phải trên (xóa token)

## Lệnh hay dùng

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Dev server tại http://localhost:4322 |
| `npm run build` | Build production ra `dist/` |
| `npm run preview` | Xem thử bản build |
