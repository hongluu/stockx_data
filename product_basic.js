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
})

var ProductBasic = mongoose.model("product_basic", ProductSchema);
module.exports = ProductBasic;