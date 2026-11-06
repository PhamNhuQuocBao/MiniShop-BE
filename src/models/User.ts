import { Schema, model } from 'mongoose';
const address = new Schema({
  label: {type:String,required:true},
  name: {type:String,required:true},
  phone: {type:String,required:true},
  address: {type:String,required:true},
},{_id:true});
const schema = new Schema({name:{type:String,required:true},email:{type:String,required:true,unique:true,lowercase:true},phone:{type:String},passwordHash:{type:String,required:true},role:{type:String,enum:['CUSTOMER','ADMIN'],required:true},addresses:{type:[address],default:[]}},{timestamps:true});
export const User = model('User',schema);
