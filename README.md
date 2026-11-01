# MiniShop Backend

Express + TypeScript + MongoDB/Mongoose. Đây là repo backend độc lập; frontend nằm tại [MiniShop-FE](https://github.com/PhamNhuQuocBao/MiniShop-FE).

## Chạy local

Node.js 22.18.0 và MongoDB. Tạo `.env` từ `.env.example`; đặt `MONGODB_URI`, `JWT_SECRET` (ít nhất 32 ký tự) và mật khẩu seed.

```bash
npm ci
npm run build
npm run seed
npm run dev
# API: http://localhost:4000/api/health
```

`npm run seed` upsert 8 sản phẩm, tài khoản `customer@minishop.demo` và `admin@minishop.demo`; mật khẩu lấy từ `SEED_CUSTOMER_PASSWORD` và `SEED_ADMIN_PASSWORD` bạn đặt. Seed không xóa đơn hàng. `npm run db:reset -- --confirm` xóa **toàn bộ sản phẩm, tài khoản và đơn hàng** của DB `minishop`; không chạy trên DB cần giữ.

Production: `npm run build && npm start`. BE chỉ bắt đầu nghe cổng sau khi kết nối MongoDB thành công. Health `/api/health` trả 503 khi DB không sẵn sàng.

## Render + MongoDB Atlas

1. Tạo Atlas cluster, database user, IP access list và lấy URI ứng dụng kết thúc bằng `/minishop` (có thể kèm query). Giữ URI riêng trong Render BE.
2. Tạo **Web Service** từ repo này, root directory để trống, build `npm ci && npm run build`, start `npm start`, health `/api/health`, Node `22.18.0`. Có thể dùng `render.yaml` của repo.
3. Điền `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGINS` (origin FE thật, ví dụ `https://<frontend>.onrender.com`). `PORT` do Render cấp. Không commit `.env`.
4. Seed **một lần** từ môi trường có quyền kết nối Atlas: đặt `MONGODB_URI`, `SEED_CUSTOMER_PASSWORD`, `SEED_ADMIN_PASSWORD`, chạy `npm ci && npm run build && npm run seed`. Sau đó xác nhận health BE và cấu hình `API_BASE_URL` trong FE.

API chính: `GET /api/products`, `GET /api/products/:id`, `POST /api/auth/login`, `POST /api/orders`. Giá và tổng đơn do backend tính. Dữ liệu nằm trong Atlas, tồn tại qua restart/redeploy nếu dùng cùng DB.

Tham khảo [Render Blueprint](https://render.com/docs/blueprint-spec) và [Atlas connection](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/).
