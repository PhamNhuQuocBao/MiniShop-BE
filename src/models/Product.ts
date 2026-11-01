import { Schema, model } from 'mongoose';
const schema = new Schema({ name: {type:String,required:true}, slug:{type:String,required:true,unique:true}, description:{type:String,required:true}, image:{type:String,required:true}, price:{type:Number,required:true,min:0}, stock:{type:Number,required:true,min:0} },{timestamps:true});
export const Product = model('Product',schema);
