import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDb, closeDb } from '../config/db';
import { Product } from '../models/Product';
import { User } from '../models/User';

const products=[
  ['Chuột không dây Aero','chuot-aero','Chuột gọn nhẹ, kết nối ổn định cho bàn làm việc.','mouse',349000,25],
  ['Bàn phím cơ Mini 68','ban-phim-mini-68','Bàn phím 68 phím, cảm giác gõ rõ ràng.','keyboard',1290000,12],
  ['Tai nghe Studio Lite','tai-nghe-studio-lite','Âm thanh trong trẻo cho học tập và giải trí.','headphones',790000,18],
  ['USB-C Hub 6 cổng','usb-c-hub-6','Mở rộng HDMI, USB và khe thẻ nhớ.','hub',590000,20],
  ['Giá đỡ laptop Fold','gia-do-laptop-fold','Giá đỡ nhôm gấp gọn, điều chỉnh độ cao.','stand',420000,30],
  ['Cáp USB-C 2m','cap-usb-c-2m','Cáp sạc và truyền dữ liệu bền bỉ.','cable',159000,40],
  ['Webcam Full HD','webcam-full-hd','Hình ảnh sắc nét cho cuộc họp trực tuyến.','webcam',890000,10],
  ['Lót chuột Desk Mat','lot-chuot-desk-mat','Bề mặt rộng, mềm, chống trượt.','mat',270000,35],
] as const;
async function main(){await connectDb();for(const [name,slug,description,image,price,stock] of products){await Product.updateOne({slug},{$set:{name,description,image,price,stock}}, {upsert:true});}const accounts=[['Khách hàng mẫu','customer@minishop.demo','customer',process.env.SEED_CUSTOMER_PASSWORD],['Quản trị mẫu','admin@minishop.demo','admin',process.env.SEED_ADMIN_PASSWORD]] as const;for(const [name,email,role,password] of accounts){if(!password || password.length<8)throw new Error(`Set seed password (at least 8 chars) for ${email}`);await User.updateOne({email},{$set:{name,role,passwordHash:await bcrypt.hash(password,12)}},{upsert:true});}console.log('Seeded 8 products and 2 demo users');}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(closeDb);
