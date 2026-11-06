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

`npm run seed` upsert 8 sản phẩm, hai tài khoản demo cũ, ba tài khoản QA `admin@minishop.local`, `alice@minishop.local`, `bob@minishop.local`, 8 đơn QA (4 của Alice, 4 của Bob), 3 marketing snippets mẫu đang tắt, 3 partner và 8 coupon. Chuột Aero có URL ảnh supplier mẫu. Mật khẩu QA là `Minishop@123` (bcrypt); mật khẩu hai tài khoản demo cũ lấy từ `SEED_CUSTOMER_PASSWORD` và `SEED_ADMIN_PASSWORD`. Seed lại không nhân đôi đơn QA/partner/coupon, không xóa đơn thật hoặc ghi đè partner/snippet/coupon đã sửa. `npm run db:reset -- --confirm` xóa **toàn bộ sản phẩm, tài khoản, đơn hàng, marketing snippets, partners, coupons và carts** của DB `minishop`; không chạy trên DB cần giữ.

## Account và đơn hàng

Các route `GET /api/account/orders`, `GET /api/account/orders/:id`, `PATCH /api/account/profile`, `GET /api/account/addresses`, `POST /api/account/addresses` yêu cầu Bearer token. Khách chỉ xem đơn gắn `userId` của mình; ID đơn của người khác trả 404. Các route `GET /api/admin/orders` và `GET /api/admin/orders/:id` yêu cầu role `ADMIN`. Role mới dùng `CUSTOMER`/`ADMIN`; API vẫn đọc được phiên và dữ liệu role viết thường cũ. Đơn hàng có thêm `shippingStatus` và `trackingNumber` để hiển thị tiến độ giao hàng.

## Marketing API

`GET /api/marketing/snippets/enabled` là endpoint public cho frontend, chỉ trả snippet đang bật. Các endpoint `GET /api/marketing/snippets`, `GET /api/marketing/snippets/:id`, `POST /api/marketing/snippets`, `PATCH /api/marketing/snippets/:id`, `DELETE /api/marketing/snippets/:id` yêu cầu Bearer token của admin. Body tạo/cập nhật gồm `name`, `provider` (`facebook`, `gtm`, `tiktok`, `hotjar`, `custom`), `scriptBody` (JavaScript thuần), `placement` (`beforeInteractive` hoặc `afterInteractive`) và `enabled` (boolean). ID MongoDB được trả về dưới dạng chuỗi `id`; lỗi theo dạng `{ "error": { "code": "...", "message": "..." } }`.

## Partner API

`GET /api/partners/:id` là endpoint public; chỉ trả partner đang bật với `{partner:{id,name,trackingUrl,enabled}}`. ID không hợp lệ trả 400, ID không tồn tại hoặc đã tắt trả 404. Seed tạo 3 partner với ID cố định lần lượt `700000000000000000000001`, `700000000000000000000002`, `700000000000000000000003`; tracking URL hiện là example.com để QA thay khi tích hợp đối tác thật.

## Cart và coupon

`GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/:lineId`, `DELETE /api/cart/items/:lineId`, `POST /api/cart/coupons`, `DELETE /api/cart/coupons/:code` hỗ trợ Bearer token hoặc cookie ký `minishop_guest_cart`. FE nhận `guestToken` sau mutation và đặt cookie HttpOnly cùng origin; backend xác minh chữ ký bằng `JWT_SECRET`. Cart của user nằm trong MongoDB, guest cart nằm trong JWT cookie 7 ngày. `POST /api/cart/merge` nhập giỏ guest vào tài khoản khi đăng nhập. Checkout đọc cart backend, xác nhận tồn kho, tính lại coupon, lưu `subtotal`, `discounts`, `total` vào Order và tăng `uses` của coupon. Sửa sản phẩm làm coupon mất điều kiện sẽ tự bỏ coupon trong giỏ.

Rule JSON hỗ trợ `and`/`or` lồng tối đa 5 tầng, `minQuantity` theo `productSlug` hoặc `productId`, `category`, `mutualExclusionGroup` và `coupon` tham chiếu mã coupon đang áp dụng. Tám mã seed: `SUMMER10`, `SHIP50`, `BOGOMOUSE`, `BUNDLE150`, `STACK5`, `WELCOME5`, `AUDIO20`, `DESK80`; hết hạn cuối năm 2030. Để dùng `STACK5`, giỏ cần Chuột Aero + Bàn phím Mini 68 và đã áp dụng lần lượt `SUMMER10`, `SHIP50`, `BUNDLE150`. `WELCOME5` và `SUMMER10` cùng nhóm loại trừ. `BOGOMOUSE` và `AUDIO20` không stack.

`POST /api/products/search` nhận `{filters: FilterNode[]}`; mỗi node có `field` (`name`, `category`, `price`), `operator` (`contains`, `eq`, `gte`, `lte`) và `value`; các node nối bằng AND. Product có thêm `category` để lọc và đánh giá rule.

Production: `npm run build && npm start`. BE chỉ bắt đầu nghe cổng sau khi kết nối MongoDB thành công. Health `/api/health` trả 503 khi DB không sẵn sàng.

## Render + MongoDB Atlas

1. Tạo Atlas cluster, database user, IP access list và lấy URI ứng dụng kết thúc bằng `/minishop` (có thể kèm query). Giữ URI riêng trong Render BE.
2. Tạo **Web Service** từ repo này, root directory để trống, build `npm ci && npm run build`, start `npm start`, health `/api/health`, Node `22.18.0`. Có thể dùng `render.yaml` của repo.
3. Điền `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGINS` (origin FE thật, ví dụ `https://<frontend>.onrender.com`). `PORT` do Render cấp. Không commit `.env`.
4. Seed **một lần** từ môi trường có quyền kết nối Atlas: đặt `MONGODB_URI`, `SEED_CUSTOMER_PASSWORD`, `SEED_ADMIN_PASSWORD`, chạy `npm ci && npm run build && npm run seed`. Sau đó xác nhận health BE và cấu hình `API_BASE_URL` trong FE.

API chính: `GET /api/products`, `GET /api/products/:id`, `POST /api/auth/login`, `POST /api/orders`. Giá và tổng đơn do backend tính. Dữ liệu nằm trong Atlas, tồn tại qua restart/redeploy nếu dùng cùng DB.

Tham khảo [Render Blueprint](https://render.com/docs/blueprint-spec) và [Atlas connection](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/).
