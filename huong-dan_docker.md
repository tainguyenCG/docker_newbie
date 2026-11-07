# Hướng dẫn chi tiết Docker

Tài liệu này ghi lại toàn bộ cách vận hành dự án bằng Docker: chạy, dừng, xem log, xem và tra cứu dữ liệu SQL Server, xử lý lỗi thường gặp.

---

## 1. Kiến trúc Docker của dự án

File `docker-compose.yml` định nghĩa **4 container**:

| Container | Image | Cổng trên máy bạn | Vai trò |
|---|---|---|---|
| `landing_sqlserver` | `mcr.microsoft.com/mssql/server:2022-latest` | `1433` | Database, dữ liệu lưu trong volume `mssql_data` (không mất khi restart) |
| `landing_backend` | tự build từ `backend/Dockerfile` | `3000` | REST API, tự tạo DB + bảng + seed khi chạy lần đầu |
| `landing_client` | tự build từ `frontend-client/Dockerfile` | `4321` | Landing page |
| `landing_admin` | tự build từ `frontend-admin/Dockerfile` | `4322` | Admin panel |

Thứ tự khởi động được đảm bảo tự động: `sqlserver` phải **healthy** (healthcheck bằng `sqlcmd`) thì `backend` mới được start; backend có sẵn retry 20 lần x 3 giây nên sẽ tự chờ DB.

```
[Trình duyệt] ──> client:4321 ─┐
[Trình duyệt] ──> admin:4322 ──┼──> backend:3000 ──> sqlserver:1433 ──> volume mssql_data
[Trình duyệt] ── gọi API trực tiếp ─┘
```

---

## 2. Chạy lần đầu

**Yêu cầu**: Docker Desktop đã bật và đang chạy (icon trạng thái góc màn hình báo "running").

```bash
# Ở thư mục gốc dự án:
docker compose up --build -d
```

Tùy chọn giải thích:
- `--build`: build lại 3 image (backend, client, admin) từ source. **Lần đầu bắt buộc**, các lần sau chỉ cần khi bạn **sửa code**.
- `-d` (detached): chạy ngầm, không chiếm terminal.

Lần đầu mất **3–10 phút** vì phải: tải image SQL Server (~1.5GB) + image Node, chạy `npm ci` bên trong mỗi image. Các lần sau chỉ vài giây.

Chờ DB sẵn sàng:

```bash
docker compose logs -f backend
# Chờ thấy các dòng:
#   [db] Database connected and schema ready
#   [db] Seeded default admin user (admin / admin123)
#   [db] Seeded default landing content
#   [server] API running at http://localhost:3000
# (Ctrl+C để thoát log — container vẫn chạy)
```

Mở trình duyệt kiểm tra:

| URL | Mong đợi |
|---|---|
| http://localhost:4321 | Landing page |
| http://localhost:4322 | Admin → đăng nhập `admin` / `admin123` |
| http://localhost:3000/api/health | `{"status":"ok"}` |

---

## 3. Các lệnh Docker thường dùng (chạy tại thư mục gốc)

```bash
# Chạy (lần đầu hoặc sau khi sửa code)
docker compose up --build -d

# Chạy lại khi KHÔNG sửa code (image đã build sẵn, lên cực nhanh)
docker compose up -d

# Xem danh sách container đang chạy + trạng thái (Up / Exit)
docker compose ps

# Xem log
docker compose logs -f backend      # log của backend
docker compose logs -f sqlserver    # log của SQL Server
docker compose logs -f              # log tất cả

# Dừng toàn bộ (GIỮ nguyên dữ liệu DB trong volume)
docker compose down

# Dừng + XÓA SẠCH dữ liệu DB (reset về dữ liệu mẫu ban đầu)
docker compose down -v

# Khởi động lại 1 service
docker compose restart backend

# Xem bên trong container
docker exec -it landing_backend sh        # vào shell của backend
docker exec -it landing_sqlserver bash    # vào shell của SQL Server
```

> Chú ý phân biệt `down` và `down -v`: muốn **giữ** nội dung đã sửa trong Admin thì chỉ dùng `down`; muốn **reset** DB về ban đầu thì dùng `down -v`.

---

## 4. Sửa code xong, chạy lại sao?

| Thay đổi | Việc cần làm |
|---|---|
| Sửa code **backend** (`backend/src/**`) | `docker compose up --build -d backend` |
| Sửa code **client** (`frontend-client/src/**`) | `docker compose up --build -d client` |
| Sửa code **admin** (`frontend-admin/src/**`) | `docker compose up --build -d admin` |
| Sửa `docker-compose.yml` | `docker compose up -d` |
| Muốn dev có hot reload | Dùng cách khác: `npm run sql` + `npm run dev` (xem mục 8) |

---

## 5. Xem container trên giao diện Docker Desktop

Mở **Docker Desktop** → tab **Containers**:

- Thấy 4 container gộp theo group `full_stack_docker`
- Click tên container để xem **Logs** (log realtime), **Inspect**, **Exec** (terminal trong container)
- Nút tam giác/nhân để start/stop/restart từng container
- **Lưu ý**: Docker Desktop KHÔNG có giao diện xem dữ liệu DB — muốn xem bảng/dữ liệu SQL Server thì xem mục 6

---

## 6. Xem và tra cứu dữ liệu SQL Server

### Thông tin kết nối dùng chung

```
Server:   localhost,1433     ← dùng dấu PHẨY, không phải dấu hai chấm
User:     sa
Password: YourStrong@Passw0rd     (đổi trong file .env nếu muốn)
Database: LandingDB
```

### Cách A — `sqlcmd` ngay trong container (không cần cài gì)

Mở **PowerShell** (đừng dùng Git Bash — nó làm hỏng đường dẫn `/opt/...`):

```powershell
# Xem danh sách bảng trong DB
docker exec landing_sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -C -d LandingDB -Q "SELECT name FROM sys.tables"

# Xem TOÀN BỘ dữ liệu 1 bảng
docker exec landing_sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -C -d LandingDB -W -Q "SELECT * FROM SiteContent"

# Tra cứu item cụ thể theo điều kiện
docker exec landing_sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -C -d LandingDB -W -Q "SELECT * FROM SiteContent WHERE SectionKey = 'hero'"

# Đếm số dòng
docker exec landing_sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -C -d LandingDB -Q "SELECT COUNT(*) FROM SiteContent"

# Xem cấu trúc bảng (cột + kiểu dữ liệu)
docker exec landing_sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -C -d LandingDB -Q "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SiteContent'"
```

Giải thích cờ:
- `-S` server, `-U` user, `-P` password, `-d` database, `-Q` câu query
- `-W` trim khoảng trắng cho gọn kết quả
- `-C` tin cậy certificate (bắt buộc với sqlcmd v18)

### Cách B — Extension VS Code "SQL Server (mssql)" (khuyên dùng)

1. Cài extension **SQL Server (mssql)** (`ms-mssql.mssql`) trong marketplace
2. `Ctrl + Shift + P` → gõ `MS SQL: Connect` → Enter
3. Trả lời lần lượt các prompt:

| Prompt | Nhập |
|---|---|
| Server name or ADO.NET connection string | `localhost,1433` |
| Authentication Type | `SQL Login` |
| User name | `sa` |
| Password | `YourStrong@Passw0rd` |
| Save password? | `Yes` |
| Trust server certificate | `Yes` |
| Profile name (tùy chọn) | `LandingDB Local` |

4. Kết quả: bên thanh trái có **cây DB** — `LandingDB → Tables → dbo.SiteContent / dbo.Users`, xem cột, click phải bảng → **Select Top 1000** để xem dữ liệu, hoặc mở query editor gõ SQL bất kỳ rồi `Ctrl+Shift+E` chạy.

### Cách C — App GUI riêng (SSMS hoặc Azure Data Studio)

| App | Tải về | Phù hợp |
|---|---|---|
| SQL Server Management Studio (SSMS) | https://aka.ms/ssms | Đầy đủ nhất, quen thuộc với dân .NET |
| Azure Data Studio | https://learn.microsoft.com/sql/azure-data-studio | Nhẹ, giao diện hiện đại, đa nền tảng |

Kết nối: Server name `localhost,1433` → Authentication: SQL Server Authentication → `sa` / `YourStrong@Passw0rd` → **tick "Trust server certificate"** → Connect → chọn DB `LandingDB`.

### Câu query hay dùng (dán vào VS Code extension / SSMS)

```sql
-- Xem toàn bộ nội dung landing (đúng thứ tự hiển thị)
SELECT Id, SectionKey, Title, Subtitle, Description, SortOrder, UpdatedAt
FROM SiteContent ORDER BY SortOrder, Id;

-- Tìm item theo SectionKey
SELECT * FROM SiteContent WHERE SectionKey = 'hero';

-- Xem danh sách user admin
SELECT Id, Username, CreatedAt FROM Users;

-- Cập nhật trực tiếp trong DB (thay vì qua Admin)
UPDATE SiteContent SET Title = N'Tiêu đề mới' WHERE SectionKey = 'hero';
-- Lưu ý: tiếng Việt có dấu phải thêm chữ N đằng trước chuỗi: N'...'
```

---

## 7. Lỗi thường gặp khi chạy Docker

| Triệu chứng | Nguyên nhân & xử lý |
|---|---|
| `docker compose` báo cannot connect to Docker daemon | Docker Desktop chưa bật/chưa chạy xong. Mở nó, đợi báo "running" rồi chạy lại |
| Cổng `1433/3000/4321/4322` đã bị chiếm | Tắt app chiếm cổng, hoặc sửa phần `ports` trong `docker-compose.yml` |
| SQL Server không start, log nhắc password policy | Mật khẩu SA phải ≥ 8 ký tự, gồm HOA + thường + số + ký tự đặc biệt. Sửa `SA_PASSWORD` trong `.env` rồi `docker compose down -v` → chạy lại |
| Backend báo `Login failed for user 'sa'` | Mật khẩu không khớp với lúc tạo container. `docker compose down -v` (xóa volume DB cũ) rồi `up --build -d` lại |
| Landing hiển thị nội dung mặc định, không cập nhật từ DB | Backend chưa sẵn sàng hoặc API lỗi. Kiểm tra `http://localhost:3000/api/content` và `docker compose logs -f backend` |
| Sửa code nhưng trang không đổi | Quên `--build`: phải `docker compose up --build -d <service>` để build lại image |
| Máy Apple Silicon (M1/M2/M3) lỗi tải image mssql | Thêm `platform: linux/amd64` vào service `sqlserver` trong `docker-compose.yml` |

---

## 8. Chạy chế độ dev (hot reload, sửa code là trang tự cập nhật)

Chỉ SQL Server chạy bằng Docker, còn 3 src chạy bằng Node.js trên máy:

```bash
# Terminal 1 — chỉ chạy SQL Server (không build gì cả, vài giây)
npm run sql

# Terminal 2 — chạy đồng thời cả 3 src (backend + client + admin)
npm run dev
```

Khi đó:
- SQL Server vẫn ở `localhost:1433` (container), backend chạy trên máy kết nối vào → **DB chỉ có 1 bản, dùng chung**
- Sửa code frontend/backend là tự reload, không cần build lại image
- Dừng: `Ctrl + C` ở terminal `npm run dev`; SQL Server container vẫn chạy → `docker compose stop sqlserver` để dừng

> Lưu ý Windows: khi `Ctrl + C`, process Astro đôi khi còn sót cổng 4321/4322. Đóng terminal hoặc kill process theo cổng là hết.

---

## 9. Bảng tóm tắt nhanh

| Muốn... | Lệnh |
|---|---|
| Chạy lần đầu / sau khi sửa code | `docker compose up --build -d` |
| Chạy lại bình thường | `docker compose up -d` |
| Xem đang chạy gì | `docker compose ps` hoặc mở Docker Desktop |
| Xem log backend | `docker compose logs -f backend` |
| Dừng, giữ DB | `docker compose down` |
| Dừng, xóa sạch DB | `docker compose down -v` |
| Tra cứu DB nhanh | Cách A (sqlcmd) — mục 6 |
| Tra cứu DB bằng GUI | Cách B (VS Code extension) — mục 6 |
| Dev hot reload | `npm run sql` + `npm run dev` |
