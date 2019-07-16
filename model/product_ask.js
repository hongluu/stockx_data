const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductBidSchema = new Schema({
    id: { type: String, unique: true, dropDups: true },
    product_id: String,
    name: String,
    productName: String,
    frequency: String,
    customerId: Object,
    amount: String,
    localAmount: String
});

var ProductBid = mongoose.model("product_csv", ProductBidSchema);
module.exports = ProductBid;
