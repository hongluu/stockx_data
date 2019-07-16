const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductSchema = new Schema({
  id: { type: String, unique: true, dropDups: true},
  uuid: { type: String },
  brand: { type: String },
  breadcrumbs: [String],
  category: { type: String },
  charityCondition: 0,
  childId: String,
  colorway: String,
  condition: String,
  countryOfManufacture: Number,
  dataType: String,
  description: String,
  hidden: Boolean,
  ipoDate: Date,
  minimumBid: Number,
  gender: String,
  doppelgangers: [String],
  media: {
    imageUrl: String,
    smallImageUrl: String,
    thumbUrl: String,
    gallery: [String],
    hidden: Boolean
  },
  name: String,
  productCategory: String,
  releaseDate: Date,
  releaseTime: Number,
  belowRetail: Boolean,
  retailPrice: Number,
  shoe: String,
  shortDescription: String,
  styleId: String,
  tickerSymbol: String,
  title: String,
  traits: [
    Object
  ],
  type: 0,
  urlKey: String,
  year: Number,
  shoeSize: String,
  market: Object,
  _tags: [String],
  lock_selling: Boolean,
  selling_countries: [String
  ],
  buying_countries: [
    String
  ],
  objectID: String
});

var Product = mongoose.model("Product", ProductSchema);
module.exports = Product;