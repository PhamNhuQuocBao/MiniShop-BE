import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { z, ZodError } from 'zod';
import { connectDb, closeDb, dbReady } from './config/db';
import { Product } from './models/Product';
import { User } from './models/User';
import { Order } from './models/Order';
import { auth, signInToken } from './auth';
import { marketingRouter } from './routes/marketing';

const app = express();
app.disable('x-powered-by');
app.use(express.json({limit:'32kb'}));
const origins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(s=>s.trim());
app.use(cors({origin:(origin,cb)=>cb(null,!origin || origins.includes(origin))}));
const route=(fn:(req:Request,res:Response)=>Promise<void>)=>(req:Request,res:Response,next:NextFunction)=>{fn(req,res).catch(next);};
const error=(res:Response,status:number,code:string,message:string)=>res.status(status).json({error:{code,message}});
const productDto=(p:any)=>({id:String(p._id),name:p.name,slug:p.slug,description:p.description,image:p.image,price:p.price,stock:p.stock});
const userDto=(u:any)=>({id:String(u._id),name:u.name,email:u.email,role:u.role});

app.get('/api/health',(_req,res)=>res.status(dbReady()?200:503).json({status:dbReady()?'ok':'unavailable'}));
app.get('/api/products',route(async(req,res)=>{const q=typeof req.query.q==='string'?req.query.q.trim().slice(0,100):'';const filter=q?{name:{$regex:q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'}}:{};const products=await Product.find(filter).sort({name:1}).lean();res.json({products:products.map(productDto)});}));
app.get('/api/products/:id',route(async(req,res)=>{if(!mongoose.isValidObjectId(req.params.id)){error(res,400,'INVALID_ID','ID sản phẩm không hợp lệ');return;}const p=await Product.findById(req.params.id).lean();if(!p){error(res,404,'NOT_FOUND','Không tìm thấy sản phẩm');return;}res.json({product:productDto(p)});}));
const loginSchema=z.object({email:z.string().email(),password:z.string().min(1)});
app.post('/api/auth/login',route(async(req,res)=>{const input=loginSchema.parse(req.body);const user=await User.findOne({email:input.email.toLowerCase()});if(!user || !await bcrypt.compare(input.password,String(user.passwordHash))){error(res,401,'INVALID_CREDENTIALS','Email hoặc mật khẩu không đúng');return;}const token=signInToken(String(user._id),user.role);res.json({token,user:userDto(user)});}));
app.get('/api/auth/me',route(async(req,res)=>{const a=auth(req);if(!a){error(res,401,'UNAUTHORIZED','Vui lòng đăng nhập');return;}const user=await User.findById(a.id).lean();if(!user || user.role!==a.role){error(res,401,'UNAUTHORIZED','Phiên không hợp lệ');return;}res.json({user:userDto(user)});}));
const orderSchema=z.object({shipping:z.object({name:z.string().trim().min(2).max(100),phone:z.string().trim().regex(/^[0-9+(). -]{8,20}$/),address:z.string().trim().min(8).max(300)}),items:z.array(z.object({productId:z.string(),quantity:z.number().int().positive().max(99)})).min(1).max(30)});
app.post('/api/orders',route(async(req,res)=>{const input=orderSchema.parse(req.body);const ids=input.items.map(i=>i.productId);if(ids.some(id=>!mongoose.isValidObjectId(id))){error(res,400,'INVALID_ID','ID sản phẩm không hợp lệ');return;}if(new Set(ids).size!==ids.length){error(res,400,'DUPLICATE_ITEM','Sản phẩm bị lặp');return;}const products=await Product.find({_id:{$in:ids}}).lean();if(products.length!==ids.length){error(res,404,'NOT_FOUND','Có sản phẩm không tồn tại');return;}const byId=new Map(products.map(p=>[String(p._id),p]));const lines=[];for(const item of input.items){const p=byId.get(item.productId)!;if(p.stock<item.quantity){error(res,409,'OUT_OF_STOCK',`${p.name} không đủ hàng`);return;}lines.push({productId:p._id,name:p.name,unitPrice:p.price,quantity:item.quantity});}const total=lines.reduce((sum,i)=>sum+i.unitPrice*i.quantity,0);const a=auth(req);const user=a?await User.findById(a.id).lean():null;const code='MS-'+Date.now().toString(36).toUpperCase()+'-'+randomBytes(3).toString('hex').toUpperCase();const order=await Order.create({code,userId:user?user._id:undefined,shipping:input.shipping,items:lines,total,status:'placed'});res.status(201).json({order:{id:String(order._id),code,shipping:input.shipping,items:lines.map(i=>({productId:String(i.productId),name:i.name,unitPrice:i.unitPrice,quantity:i.quantity})),total,status:'placed'}});}));
app.get('/api/admin/summary',route(async(req,res)=>{const a=auth(req);const user=a?await User.findById(a.id).lean():null;if(!user||user.role!=='admin'||a?.role!=='admin'){error(res,403,'FORBIDDEN','Không có quyền truy cập');return;}const [productCount,orderCount,totals]=await Promise.all([Product.countDocuments(),Order.countDocuments(),Order.aggregate([{$group:{_id:null,revenue:{$sum:'$total'}}}])]);res.json({summary:{productCount,orderCount,revenue:totals[0]?.revenue||0}});}));
app.use('/api/marketing/snippets', marketingRouter);
app.use((err:unknown,_req:Request,res:Response,_next:NextFunction)=>{if(err instanceof ZodError){error(res,400,'VALIDATION_ERROR',err.issues.map(i=>i.message).join('; '));return;}console.error(err);error(res,500,'INTERNAL_ERROR','Đã có lỗi máy chủ');});

async function main(){await connectDb();const port=Number(process.env.PORT)||4000;const server=app.listen(port,'0.0.0.0',()=>console.log(`MiniShop API listening on ${port}`));const stop=()=>server.close(()=>{closeDb().finally(()=>process.exit(0));});process.on('SIGTERM',stop);process.on('SIGINT',stop);}
main().catch(e=>{console.error(e);process.exit(1);});
