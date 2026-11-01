import { Schema, model } from 'mongoose';
const schema = new Schema({name:{type:String,required:true},email:{type:String,required:true,unique:true,lowercase:true},passwordHash:{type:String,required:true},role:{type:String,enum:['customer','admin'],required:true}},{timestamps:true});
export const User = model('User',schema);
