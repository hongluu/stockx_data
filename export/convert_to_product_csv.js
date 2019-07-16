const Product = require('../product')
const ProductCsv = require('../model/product_csv')
const ProductTuan = require('../product_tuan')
const ProductCustom = require('../model/product_custom')
const ProductActivity = require('../product_activity')
import mongoose from 'mongoose';
const fs = require('fs');
const readline = require('readline');
var dateFormat = require('dateformat');
const XLSX = require('xlsx');

export default class Convert {
    constructor() {
        mongoose.connect('mongodb://localhost/my_database', { useNewUrlParser: true });
        mongoose.set('useCreateIndex', true);
    }
    async convertToProductCustom() {
        console.log('Start convert to product Custom');
        let products = await Product.find();
        console.log('Product lenght :' + products.length );
        for (let productIndex = 0; productIndex < products.length; productIndex++) {
            let product = products[productIndex];
            let productCustom = new ProductCustom();
            productCustom.uuid = product.id;
            productCustom.category = product.category;
            productCustom.colorway = product.colorway;
            productCustom.condition = product.condition;
            productCustom.minimumBid = product.minimumBid;
            productCustom.gender = product.gender;
            if (product.media)
                productCustom.media_imageUrl = product.media.imageUrl;
            productCustom.releaseDate = product.releaseDate;
            productCustom.releaseTime = product.releaseTime;
            productCustom.belowRetail = product.belowRetail;
            productCustom.retailPrice = product.retailPrice;
            productCustom.title = product.title;
            if(product.traits && product.traits.length >0){
                productCustom.name = product.traits[0].name;
                productCustom.value = product.traits[0].value;
            }
            productCustom.urlKey = product.urlKey;
            if (product.market){
                productCustom.lowestAsk = product.market.lowestAsk;
                productCustom.lowestAskSize = product.market.lowestAskSize;
                productCustom.productUuid = product.market.productUuid;
                productCustom.parentLowestAsk = product.market.parentLowestAsk;
                productCustom.numberOfAsks = product.market.numberOfAsks;
                productCustom.salesThisPeriod = product.market.salesThisPeriod;
                productCustom.salesLastPeriod = product.market.salesLastPeriod;
                productCustom.highestBid = product.market.highestBid;
                productCustom.highestBidSize = product.market.highestBidSize;
                productCustom.numberOfBids = product.market.numberOfBids;
                productCustom.annualHigh = product.market.annualHigh;
                productCustom.annualLow = product.market.annualLow;
                productCustom.deadstockRangeLow = product.market.deadstockRangeLow;
                productCustom.deadstockRangeHigh = product.market.deadstockRangeHigh;
                productCustom.volatility = product.market.volatility;
                productCustom.deadstockSold = product.market.deadstockSold;
                productCustom.pricePremium = product.market.pricePremium;
                productCustom.averageDeadstockPrice = product.market.averageDeadstockPrice;
                productCustom.lastSale = product.market.lastSale;
                productCustom.lastSaleSize = product.market.lastSaleSize;
                productCustom.salesLast72Hours = product.market.salesLast72Hours;
                productCustom.changeValue = product.market.changeValue;
                productCustom.changePercentage = product.market.changePercentage;
                productCustom.totalDollars = product.market.totalDollars;
                productCustom.updatedAt = product.market.updatedAt;
                productCustom.lastLowestAskTime = product.market.lastLowestAskTime;
                productCustom.lastHighestBidTime = product.market.lastHighestBidTime;
                productCustom.lastSaleDate = product.market.lastSaleDate;
                productCustom.createdAt = product.market.createdAt;
                productCustom.deadstockSoldRank = product.market.deadstockSoldRank;
                productCustom.pricePremiumRank = product.market.pricePremiumRank;
                productCustom.averageDeadstockPriceRank = product.market.averageDeadstockPriceRank;
            }
            if (product._tags)
                productCustom.tags_t_shirts = product._tags[3];
            await productCustom.save();

        }
    }
    
    async execute() {
        let products = await Product.find();
        for (let productIndex = 0; productIndex < products.length; productIndex++) {
            let product = products[productIndex];
            console.log("Execute:" + product.id);
            let product_activities = await ProductActivity.find({ product_id: product.id });
            let productCsvs = [];
            product_activities.forEach(product_activity => {
                let productCsv = new ProductCsv();
                productCsv.product_id = product.id;
                productCsv.productName = product.title;
                productCsv.color = product.colorway;
                productCsv.season = product.traits[0].value;
                productCsv.retailPrice = product.retailPrice;
                productCsv.releaseDate = dateFormat(product.releaseDate, "fullDate");
                productCsv.size = product_activity.activity.shoeSize;
                productCsv.resellPrice = product_activity.activity.localAmount;
                productCsv.saleDate = dateFormat(product_activity.activity.createdAt, "fullDate");
                productCsv.saleTime = dateFormat(product_activity.activity.createdAt, "shortTime");
                productCsvs.push(productCsv);
            })
            await ProductCsv.insertMany(productCsvs);
        };
    }
    async fixData(){
        let productCsvs =await ProductCsv.find({ productName: null });
        console.log(productCsvs.length)
        for(let i =0; i < productCsvs.length;i ++){
            let productCsv = productCsvs[i];
            let product = await Product.find({ id: productCsv.product_id});
            productCsv.productName = product[0].name;
            productCsv.isNew = false;
            console.log(productCsv)
            await productCsv.save();
        }
    }
    async exportExcel() {
        
        let index = 1;
        let n_jump = 0;
        var header = ["No", "Id", "Product Name", "Color", "Season", "Retail Price", "Release Date", "Date", "Time","Size","Resell price"];
        
        while (true) {
            let fileName = 'product_7k6_' + (n_jump + 1) + '.xlsx';
            var workbook = XLSX.readFile(fileName);
            var ws = workbook.Sheets["Data"];
            let productCsvs = await ProductCsv.find().limit(200000).skip(n_jump * 200000);
            
            
            
            if (productCsvs.length == 0) {
                break;
            }
            let jsonData = [];
            productCsvs.forEach(productCsv => {
                jsonData.push([
                    index++,
                    productCsv.product_id,
                    productCsv.productName,
                    productCsv.color,
                    productCsv.season,
                    productCsv.retailPrice,
                    productCsv.releaseDate,
                    productCsv.saleDate,
                    productCsv.saleTime,
                    productCsv.size,
                    productCsv.resellPrice,

                ])
                console.log(index + "." + productCsv.productName)
            })
            
            XLSX.utils.sheet_add_json(ws, jsonData, { origin: -1, skipHeader: true});
            XLSX.writeFile(workbook, fileName);    
            n_jump++;

        }
        

    }
    async checkProductTuanInProduct(){
        let productTuans = await ProductTuan.find();
        let index = 0;
        for (let i = 0; i < productTuans.length; i ++){
            let product = await Product.findOne({id: productTuans[i].id });
            if(product && product.id){
                console.log(index++);
            }
            
        }
    }

}



let convert = new Convert();
async function run() {
    await convert.checkProductTuanInProduct();
    mongoose.disconnect();
}
run();