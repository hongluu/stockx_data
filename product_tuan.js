const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductSchema = new Schema({
    id: { type: String, unique: true, dropDups: true },
    model: { type: String },
    product_category: { type: String },
    categories:[String],
    release_date: Date,
    url:String,
    media: Object,
    name:String,
    brand:String,
    description:String,
    short_description: String,
    colorway:String,
    nameSearch:String,
    nameSearch2:String,
    nameSearch3:String,
})

var ProductTuan = mongoose.model("product_tuan", ProductSchema);
module.exports = ProductTuan;