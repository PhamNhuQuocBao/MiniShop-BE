import 'dotenv/config';
import { connectDb, closeDb } from '../config/db';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { MarketingSnippet } from '../models/MarketingSnippet';
import { Partner } from '../models/Partner';
import { Coupon } from '../models/Coupon';
import { Cart } from '../models/Cart';
async function main(){if(!process.argv.includes('--confirm'))throw new Error('Pass --confirm to delete demo data');const uri=process.env.MONGODB_URI||'';if(!/\/minishop(?:\?|$)/.test(uri))throw new Error('Reset is limited to the minishop database');await connectDb();await Promise.all([Product.deleteMany({}),User.deleteMany({}),Order.deleteMany({}),MarketingSnippet.deleteMany({}),Partner.deleteMany({}),Coupon.deleteMany({}),Cart.deleteMany({})]);console.log('Deleted MiniShop products, users, orders, marketing snippets, partners, coupons, and carts');}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(closeDb);
