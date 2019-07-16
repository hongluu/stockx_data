const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductAskSchema = new Schema({
        id: { type: String, unique: true, dropDups: true },
        product_id: String,
        productName: String,
        activity: Object
});

var ProductAsk = mongoose.model("product_ask", ProductAskSchema);
module.exports = ProductAsk;
