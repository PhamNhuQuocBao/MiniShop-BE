import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDb, closeDb } from '../config/db';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { MarketingSnippet } from '../models/MarketingSnippet';
import { Order } from '../models/Order';
import { Partner } from '../models/Partner';
import { Coupon } from '../models/Coupon';

const products=[
  {name:'Chuột không dây Aero',slug:'chuot-aero',description:'Chuột không dây cầm vừa tay, bề mặt nhám dễ bám và nút cuộn êm. Chuyển nhanh giữa laptop và máy tính bàn qua Bluetooth hoặc đầu thu USB 2.4 GHz.',image:'/products/wireless-mouse.webp',price:349000,stock:25,specifications:['Kết nối Bluetooth và USB 2.4 GHz','Cảm biến quang học 1.600 DPI','Thiết kế thuận tay phải, trọng lượng khoảng 90 g']},
  {name:'Bàn phím cơ Mini 68',slug:'ban-phim-mini-68',description:'Bàn phím cơ 68 phím tiết kiệm diện tích bàn làm việc nhưng vẫn có cụm phím điều hướng. Keycap PBT nhám, kết nối bằng cáp USB-C tháo rời.',image:'/products/keyboard-68.webp',price:1290000,stock:12,specifications:['Bố cục 68 phím gọn cho bàn nhỏ','Keycap PBT bền màu','Cáp USB-C tháo rời, switch linear']},
  {name:'Tai nghe Studio Lite',slug:'tai-nghe-studio-lite',description:'Tai nghe chụp tai với đệm mềm và âm thanh cân bằng để nghe nhạc, học online hoặc gọi video. Gập gọn khi mang theo, sạc lại qua USB-C.',image:'/products/headphones.webp',price:790000,stock:18,specifications:['Driver 40 mm, kết nối Bluetooth 5.3','Thời gian nghe tham khảo đến 25 giờ','Micro tích hợp và cổng sạc USB-C']},
  {name:'USB-C Hub 6 cổng',slug:'usb-c-hub-6',description:'Hub nhôm nhỏ gọn mở rộng một cổng USB-C thành HDMI, USB-A, khe thẻ nhớ và cổng sạc. Phù hợp cho laptop mỏng khi cần kết nối màn hình và phụ kiện.',image:'/products/usb-c-hub.webp',price:590000,stock:20,specifications:['HDMI hỗ trợ tối đa 4K ở 30 Hz','2 cổng USB-A, đầu đọc SD và microSD','USB-C Power Delivery passthrough đến 100 W']},
  {name:'Giá đỡ laptop Fold',slug:'gia-do-laptop-fold',description:'Giá đỡ hợp kim nhôm có thể gấp phẳng khi không dùng. Sáu nấc điều chỉnh giúp nâng màn hình lên ngang tầm mắt và tạo khoảng thoáng cho máy tản nhiệt.',image:'/products/laptop-stand.webp',price:420000,stock:30,specifications:['Hợp kim nhôm, đệm silicon chống trượt','6 nấc điều chỉnh độ cao','Phù hợp laptop kích thước đến 16 inch']},
  {name:'Cáp USB-C 2m',slug:'cap-usb-c-2m',description:'Cáp USB-C dài 2 m với lớp bọc dù chắc tay, tiện sạc thiết bị ở bàn làm việc hoặc cạnh giường. Hai đầu cắm được gia cố để hạn chế gãy gập khi sử dụng hằng ngày.',image:'/products/usb-c-cable.webp',price:159000,stock:40,specifications:['Chiều dài 2 m, hai đầu USB-C','Sạc Power Delivery tối đa 60 W','Truyền dữ liệu chuẩn USB 2.0']},
  {name:'Webcam Full HD',slug:'webcam-full-hd',description:'Webcam 1080p gắn gọn trên viền màn hình, hỗ trợ lấy nét cố định cho các cuộc họp trực tuyến. Có micro tích hợp và nắp che ống kính khi cần riêng tư.',image:'/products/webcam.webp',price:890000,stock:10,specifications:['Video Full HD 1080p ở 30 fps','Micro tích hợp, kết nối USB-A','Kẹp màn hình và nắp che ống kính']},
  {name:'Lót chuột Desk Mat',slug:'lot-chuot-desk-mat',description:'Tấm lót bàn rộng cho cả bàn phím và chuột, bề mặt vải mịn giúp chuột di chuyển ổn định. Mép may viền và đáy cao su bám bàn, dễ cuộn lại khi chuyển chỗ làm.',image:'/products/desk-mat.webp',price:270000,stock:35,specifications:['Kích thước 80 × 30 cm','Bề mặt vải mịn, mép may viền','Đáy cao su chống trượt']},
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
  {
    name: 'Campaign analytics', provider: 'custom', placement: 'beforeInteractive', enabled: false,
    scriptBody: `window.minishopCampaign = { source: 'agency', campaign: 'q1-accessories' };`,
  },
] as const;

// CVE-2026-44580 fixture. Kept disabled so a normal seed never ships it.
// Enable it with `npm run lab:44580` (or by running the lab script) while
// LOCAL_CVE_MODE=1. The `</script>` payload breaks out of the serialized
// beforeInteractive script that Next.js embeds in the document.
const labSnippets = [{
  name: 'CVE-2026-44580 demo',
  provider: 'custom',
  placement: 'beforeInteractive',
  enabled: false,
  scriptBody: `</script><script>document.documentElement.dataset.cve44580="xss";alert('CVE-2026-44580: '+document.domain)</script>`,
}] as const;

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
const categories: Record<string,string> = {
  'chuot-aero':'input', 'ban-phim-mini-68':'input', 'tai-nghe-studio-lite':'audio',
  'usb-c-hub-6':'connectivity', 'gia-do-laptop-fold':'desk', 'cap-usb-c-2m':'connectivity',
  'webcam-full-hd':'video', 'lot-chuot-desk-mat':'desk',
};
const couponExpiry = new Date('2030-12-31T23:59:59Z');
const coupons = [
  {code:'SUMMER10',type:'percent',value:10,rules:{op:'and',rules:[{op:'mutualExclusionGroup',group:'seasonal'}]},stackable:true,maxUses:1000},
  {code:'SHIP50',type:'fixed',value:50000,rules:{op:'and',rules:[]},stackable:true,maxUses:1000},
  {code:'BOGOMOUSE',type:'bogo',value:1,rules:{op:'minQuantity',productSlug:'chuot-aero',min:2},stackable:false,maxUses:200},
  {code:'BUNDLE150',type:'bundle',value:150000,rules:{op:'and',rules:[{op:'minQuantity',productSlug:'chuot-aero',min:1},{op:'minQuantity',productSlug:'ban-phim-mini-68',min:1}]},stackable:true,maxUses:300},
  {code:'STACK5',type:'percent',value:5,rules:{op:'and',rules:[{op:'coupon',code:'SUMMER10'},{op:'coupon',code:'SHIP50'},{op:'coupon',code:'BUNDLE150'},{op:'mutualExclusionGroup',group:'bonus'}]},stackable:true,maxUses:100},
  {code:'WELCOME5',type:'percent',value:5,rules:{op:'and',rules:[{op:'mutualExclusionGroup',group:'seasonal'}]},stackable:true,maxUses:500},
  {code:'AUDIO20',type:'percent',value:20,rules:{op:'category',category:'audio',min:1},stackable:false,maxUses:250},
  {code:'DESK80',type:'fixed',value:80000,rules:{op:'category',category:'desk',min:2},stackable:true,maxUses:300},
] as const;

async function main(){
  await connectDb();
  for(const product of products){await Product.updateOne({slug:product.slug},{$set:{name:product.name,description:product.description,image:product.image,category:categories[product.slug],specifications:product.specifications,price:product.price,stock:product.stock}}, {upsert:true});}
  const accounts=[['Khách hàng mẫu','customer@minishop.demo','CUSTOMER',process.env.SEED_CUSTOMER_PASSWORD],['Quản trị mẫu','admin@minishop.demo','ADMIN',process.env.SEED_ADMIN_PASSWORD]] as const;
  for(const [name,email,role,password] of accounts){if(!password || password.length<8)throw new Error(`Set seed password (at least 8 chars) for ${email}`);await User.updateOne({email},{$set:{name,role,passwordHash:await bcrypt.hash(password,12)}},{upsert:true});}
  const qaPasswordHash = await bcrypt.hash('Minishop@123',12);
  for(const account of qaAccounts){await User.updateOne({email:account.email},{$setOnInsert:{...account,passwordHash:qaPasswordHash}},{upsert:true});}
  for(const snippet of snippets){await MarketingSnippet.updateOne({name:snippet.name},{$setOnInsert:snippet},{upsert:true});}
  if(process.env.LOCAL_CVE_MODE==='1'){for(const snippet of labSnippets){await MarketingSnippet.updateOne({name:snippet.name},{$setOnInsert:snippet},{upsert:true});}}
  for(const partner of partners){await Partner.updateOne({_id:partner.id},{$setOnInsert:{name:partner.name,trackingUrl:partner.trackingUrl,enabled:partner.enabled}},{upsert:true});}
  for(const coupon of coupons){await Coupon.updateOne({code:coupon.code},{$setOnInsert:{...coupon,expiresAt:couponExpiry,uses:0}},{upsert:true});}
  for(const [code,email,slug,quantity,shippingStatus,trackingNumber] of qaOrders){
    const [user,product] = await Promise.all([User.findOne({email}).lean(),Product.findOne({slug}).lean()]);
    if(!user || !product)throw new Error(`Missing QA seed reference for ${code}`);
    const shipping = email.startsWith('alice') ? {name:'Nguyễn Alice',phone:'0901234567',address:'12 Nguyễn Trãi, Quận 1, TP.HCM'} : {name:'Trần Bob',phone:'0912345678',address:'45 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội'};
    await Order.updateOne({code},{$setOnInsert:{code,userId:user._id,shipping,items:[{productId:product._id,name:product.name,unitPrice:product.price,quantity}],total:product.price*quantity,status:'placed',shippingStatus,trackingNumber}},{upsert:true});
  }
  console.log(`Seeded 8 products, 5 demo users, 8 QA orders, ${snippets.length + (process.env.LOCAL_CVE_MODE==='1'?labSnippets.length:0)} disabled marketing snippets, 3 partners, and 8 coupons`);
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(closeDb);
