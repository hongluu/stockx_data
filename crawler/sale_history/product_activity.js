const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductActivitySchema = new Schema({
  id: { type: String, unique: true, dropDups: true},
  product_id: String,
  name: String,
  productName: String,
  nameSearch: String,
  activity: Object
});

var ProductActivity = mongoose.model("product_activity", ProductActivitySchema);
module.exports = ProductActivity;