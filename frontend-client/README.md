# Frontend Client — Landing Page (Astro 5 + Tailwind CSS 4)

Trang landing page cho người xem. Chạy ở **http://localhost:4321**. Layout render sẵn bằng Astro (SSR), còn **nội dung** (tiêu đề, mô tả từng section) được trình duyệt fetch động từ Backend API và điền vào trang qua thuộc tính `data-field` — nên sửa nội dung ở Admin là landing page cập nhật ngay khi refresh.

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Framework | Astro 5, output `server` + adapter `@astrojs/node` (standalone) |
| CSS | Tailwind CSS 4 (qua plugin Vite `@tailwindcss/vite`) |
| Data | Vanilla JS `fetch` tới API của backend |

## Chức năng & cấu trúc trang

Trang `index.astro` gồm 4 section, mỗi phần tử nội dung có thuộc tính `data-field="<SectionKey>:<Trường>"`:

| Section | SectionKey | Trường dùng |
|---|---|---|
| Hero (banner gradient) | `hero` | `Title`, `Subtitle` |
| Giới thiệu | `about` | `Title`, `Description` |
| Tính năng (3 card) | `feature_1`, `feature_2`, `feature_3` | `Title`, `Description` |
| Liên hệ | `contact` | `Title`, `Subtitle` |

Logic hiển thị (script cuối `index.astro`):
1. Fetch `GET {PUBLIC_API_URL}/api/content`
2. Map kết quả theo `SectionKey`
3. Với mỗi phần tử có `data-field`, điền `textContent` từ dữ liệu API
4. **Nếu API lỗi/chưa chạy**: giữ nguyên text mặc định viết sẵn trong HTML — trang vẫn hiển thị đẹp, không vỡ

## Cấu trúc source

```
frontend-client/
├── Dockerfile              # Build 2 stage: astro build → chạy dist/server/entry.mjs
├── astro.config.mjs        # SSR mode + node adapter + tailwind vite plugin, port 4321
├── tsconfig.json
├── .env.example            # PUBLIC_API_URL
└── src/
    ├── layouts/
    │   └── Layout.astro    # HTML shell: header nav, footer, import global.css
    ├── pages/
    │   └── index.astro     # Landing page: 4 section + script fetch nội dung
    └── styles/
        └── global.css      # @import "tailwindcss"
```

## Các bước: Clone → Cài đặt → Chạy

> Yêu cầu: Node.js 20+ (khuyến nghị 22 LTS). Muốn thấy nội dung động thì Backend phải đang chạy ở cổng 3000 (xem `backend/README.md`) — nếu chưa có, trang vẫn chạy với nội dung mặc định.

```bash
# Bước 1: vào thư mục và cài dependencies
cd frontend-client
npm install

# Bước 2: cấu hình địa chỉ API (mặc định http://localhost:3000 — thường không cần sửa)
cp .env.example .env

# Bước 3: chạy dev server (hot reload)
npm run dev
```

Mở **http://localhost:4321** — thấy landing page. F12 tab Network sẽ thấy request tới `/api/content`.

### Chạy production / Docker

```bash
# Build + chạy bản production local
npm run build
node dist/server/entry.mjs        # phục vụ ở cổng 4321

# Hoặc bằng Docker (từ thư mục gốc repo)
docker compose up --build -d client
```

> Lưu ý: `PUBLIC_API_URL` được **nhúng vào code lúc build**. Nếu đổi địa chỉ API, phải build lại (`npm run build` hoặc `docker compose up --build -d client`).

## Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PUBLIC_API_URL` | `http://localhost:3000` | Địa chỉ API mà **trình duyệt** gọi tới |

## Tùy chỉnh / mở rộng

**Đổi màu, style**: sửa class Tailwind trực tiếp trong `index.astro` và `Layout.astro`.

**Thêm section mới** (ví dụ `feature_4`):
1. Ở Admin panel thêm mục với `SectionKey = feature_4`
2. Trong `index.astro`, thêm markup với `data-field="feature_4:Title"` và `data-field="feature_4:Description"` (kèm text fallback)

**Lệnh hay dùng**:

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Dev server tại http://localhost:4321 |
| `npm run build` | Build production ra `dist/` |
| `npm run preview` | Xem thử bản build |
