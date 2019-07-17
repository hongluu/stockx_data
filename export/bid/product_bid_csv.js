const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductBidCsvSchema = new Schema({
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

var ProductBidCsv = mongoose.model("product_bid_csv", ProductBidCsvSchema);
module.exports = ProductBidCsv;