import mongoose from 'mongoose';
const Product = require('../../product');
const ProductBidCsv = require('./product_bid_csv');
const ProductBid = require('../../crawler/bid/product_bid');
var dateFormat = require('dateformat');
export  class ConvertToProductBidCsv{
    async execute() {
        let products = await Product.find();
        for (let productIndex = 0; productIndex < products.length; productIndex++) {
            let product = products[productIndex];
            console.log("Execute:" + product.id);
            let product_activities = await ProductBid.find({ product_id: product.id });
            let productCsvs = [];
            product_activities.forEach(product_activity => {
                let productCsv = new ProductBidCsv();
                productCsv.product_id = product.id;
                productCsv.productName = product.title;
                productCsv.color = product.colorway;
                productCsv.season = product.traits[0].value;
                productCsv.retailPrice = product.retailPrice;
                productCsv.releaseDate = dateFormat(product.releaseDate, "fullDate");
                
                productCsv.createdAt = product_activity.activity.createdAt;
                productCsv.size = product_activity.activity.shoeSize;
                productCsv.amount = product_activity.activity.amount;
                productCsv.frequency = product_activity.activity.frequency;
                productCsv.localAmount = product_activity.activity.localAmount;
                productCsv.customerId = product_activity.activity.customerId;
                productCsv.skuUuid = product_activity.activity.skuUuid;
                
                productCsvs.push(productCsv);
            })
            await ProductBidCsv.insertMany(productCsvs);
        };
    }
}

mongoose.connect('mongodb://10.2.197.90/my_database', { useNewUrlParser: true });
mongoose.set('useCreateIndex', true);
let convert = new ConvertToProductBidCsv ();
async function run(){
    await convert.execute();
    mongoose.disconnect();
}
run();

