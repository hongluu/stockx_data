const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductBidSchema = new Schema({
        id: { type: String, unique: true, dropDups: true },
        product_id: String,
        productName: String,
        activity: Object
});

var ProductBid = mongoose.model("product_bid", ProductBidSchema);
module.exports = ProductBid;
