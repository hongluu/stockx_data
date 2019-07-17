const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductAskCsvSchema = new Schema({
    product_id: String,
    productName: String,
    color: String,
    season: String,
    retailPrice: Number,
    releaseDate: String,
    createdAt: String,
    size: String,
    amount:Number,
    frequency: Number,
    localAmount: Number,
    customerId:String,
    skuUuid: String
});

var ProductAskCsv = mongoose.model("product_ask_csv", ProductAskCsvSchema);
module.exports = ProductAskCsv;