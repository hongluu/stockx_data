const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductCsvSchema = new Schema({
    product_id: String,
    productName: String,
    color: String,
    season: String,
    retailPrice: Number,
    releaseDate: String,
    size: String,
    resellPrice:Number,
    saleDate:String,
    saleTime:String,
});

var ProductCsv = mongoose.model("product_csv", ProductCsvSchema);
module.exports = ProductCsv;