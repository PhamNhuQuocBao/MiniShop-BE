import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDb, closeDb } from '../config/db';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { MarketingSnippet } from '../models/MarketingSnippet';
import { Order } from '../models/Order';
import { Partner } from '../models/Partner';

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
const snippets = [
  {
    name: 'Facebook Pixel', provider: 'facebook', placement: 'afterInteractive', enabled: false,
    scriptBody: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','000000000000000');fbq('track','PageView');`,
  },
  {
    name: 'GTM container', provider: 'gtm', placement: 'beforeInteractive', enabled: false,
    scriptBody: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f)})(window,document,'script','dataLayer','GTM-XXXXXXX');`,
  },
  {
    name: 'Hotjar', provider: 'hotjar', placement: 'afterInteractive', enabled: false,
    scriptBody: `(function(h,o,t,j,a,r){h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};h._hjSettings={hjid:0,hjsv:6};a=o.getElementsByTagName('head')[0];r=o.createElement('script');r.async=1;r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;a.appendChild(r)})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');`,
  },
] as const;

const qaAccounts = [
  { name: 'Quản trị MiniShop', email: 'admin@minishop.local', role: 'ADMIN', addresses: [] },
  { name: 'Nguyễn Alice', email: 'alice@minishop.local', role: 'CUSTOMER', addresses: [{label:'Nhà',name:'Nguyễn Alice',phone:'0901234567',address:'12 Nguyễn Trãi, Quận 1, TP.HCM'}] },
  { name: 'Trần Bob', email: 'bob@minishop.local', role: 'CUSTOMER', addresses: [{label:'Văn phòng',name:'Trần Bob',phone:'0912345678',address:'45 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội'}] },
] as const;
const qaOrders = [
  ['QA-ALICE-01','alice@minishop.local','chuot-aero',1,'pending',''],
  ['QA-ALICE-02','alice@minishop.local','ban-phim-mini-68',1,'processing',''],
  ['QA-ALICE-03','alice@minishop.local','usb-c-hub-6',2,'shipped','VNPOST-A003'],
  ['QA-ALICE-04','alice@minishop.local','tai-nghe-studio-lite',1,'delivered','VNPOST-A004'],
  ['QA-BOB-01','bob@minishop.local','cap-usb-c-2m',2,'pending',''],
  ['QA-BOB-02','bob@minishop.local','gia-do-laptop-fold',1,'processing',''],
  ['QA-BOB-03','bob@minishop.local','webcam-full-hd',1,'shipped','GHN-B003'],
  ['QA-BOB-04','bob@minishop.local','lot-chuot-desk-mat',1,'cancelled',''],
] as const;
const partners = [
  { id: '700000000000000000000001', name: 'TechSupply US', trackingUrl: 'https://example.com/tech-supply-us', enabled: true },
  { id: '700000000000000000000002', name: 'EuroGadgets', trackingUrl: 'https://example.com/euro-gadgets', enabled: true },
  { id: '700000000000000000000003', name: 'Phụ kiện Việt', trackingUrl: 'https://example.com/phu-kien-viet', enabled: true },
] as const;

async function main(){
  await connectDb();
  for(const [name,slug,description,image,price,stock] of products){await Product.updateOne({slug},{$set:{name,description,image,price,stock}}, {upsert:true});}
  await Product.updateOne({slug:'chuot-aero'},{$set:{supplierImageUrl:'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&q=80'}});
  const accounts=[['Khách hàng mẫu','customer@minishop.demo','CUSTOMER',process.env.SEED_CUSTOMER_PASSWORD],['Quản trị mẫu','admin@minishop.demo','ADMIN',process.env.SEED_ADMIN_PASSWORD]] as const;
  for(const [name,email,role,password] of accounts){if(!password || password.length<8)throw new Error(`Set seed password (at least 8 chars) for ${email}`);await User.updateOne({email},{$set:{name,role,passwordHash:await bcrypt.hash(password,12)}},{upsert:true});}
  const qaPasswordHash = await bcrypt.hash('Minishop@123',12);
  for(const account of qaAccounts){await User.updateOne({email:account.email},{$setOnInsert:{...account,passwordHash:qaPasswordHash}},{upsert:true});}
  for(const snippet of snippets){await MarketingSnippet.updateOne({name:snippet.name},{$setOnInsert:snippet},{upsert:true});}
  for(const partner of partners){await Partner.updateOne({_id:partner.id},{$setOnInsert:{name:partner.name,trackingUrl:partner.trackingUrl,enabled:partner.enabled}},{upsert:true});}
  for(const [code,email,slug,quantity,shippingStatus,trackingNumber] of qaOrders){
    const [user,product] = await Promise.all([User.findOne({email}).lean(),Product.findOne({slug}).lean()]);
    if(!user || !product)throw new Error(`Missing QA seed reference for ${code}`);
    const shipping = email.startsWith('alice') ? {name:'Nguyễn Alice',phone:'0901234567',address:'12 Nguyễn Trãi, Quận 1, TP.HCM'} : {name:'Trần Bob',phone:'0912345678',address:'45 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội'};
    await Order.updateOne({code},{$setOnInsert:{code,userId:user._id,shipping,items:[{productId:product._id,name:product.name,unitPrice:product.price,quantity}],total:product.price*quantity,status:'placed',shippingStatus,trackingNumber}},{upsert:true});
  }
  console.log('Seeded 8 products, 5 demo users, 8 QA orders, 3 disabled marketing snippets, and 3 partners');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(closeDb);
