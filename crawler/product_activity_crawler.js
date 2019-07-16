const Product = require('../product')
const { BloomFilter } = require('bloom-filters')
var cloudscraper = require('cloudscraper');
const fs = require('fs');
const log4js = require('log4js');
log4js.configure({
    appenders: { cheese: { type: 'file', filename: 'import.log' } },
    categories: { default: { appenders: ['cheese'], level: 'error' } }
});
import mongoose from 'mongoose';

export default class ProductActivityCrawler {
    constructor(){
        this.logger = log4js.getLogger('import');
        this.filter = this._init_first_filter();
    }

    run = async () => {
        mongoose.connect('mongodb://localhost/my_database', { useNewUrlParser: true });
        mongoose.set('useCreateIndex', true);
        let products = await Product.find();
        for (let productIndex = 0; productIndex < products.length; productIndex++) {
            let product = products[productIndex];
            let product_activity_dbs = await this.getProductActivity(product.id);

            if (product_activity_dbs.length != 0) {
                console.log("Index" + productIndex);
                console.log('ReRun:' + product.name)
                continue;
            }
            let pageCount = 1;
            let attemp = 1;
            if (this.filter.has(product.id)) {
                continue;
            }
            console.log(product.name);
            this.store_product_id(product.id);
            while (true) {
                await this.sleep(500);
                let data;
                if (attemp == 5) {
                    attemp = 1;
                    pageCount++;
                    break;
                }
                try {
                    let url = this.getUrl(product.id, pageCount);
                    data = await cloudscraper(url);
                    data = JSON.parse(data)
                } catch (e) {
                    this.logger.error(e);
                    console.log("Sleep 60s ...")
                    switch (attemp) {
                        case 2:
                            await this.sleep(2 * 60 * 1000);
                            break;
                        case 3:
                            await this.sleep(3 * 60 * 1000);
                            break;
                        default:
                            await this.sleep(1 * 60 * 1000);
                    }
                    attemp++;
                    continue
                }

                if (!data || Object.entries(data).length === 0 && data.constructor === Object) {
                    this.logger.error(product.id);
                    break;
                }
                let productsActivity = data.ProductActivity;
                if (!productsActivity || productsActivity.length == 0) {
                    break;
                } else {
                    for (let numProduct = 0; numProduct < productsActivity.length; numProduct++) {
                        await this.storeToDatabase(product, productsActivity[numProduct]);
                    }
                }
                // await this.sleep(300);
                pageCount++;
            }
            this.filter.add(product.id);
            this.storeUrlFilterToFile(this.filter);

        }
        mongoose.disconnect();
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    storeUrlFilterToFile = async (url_filter) => {
        let exported = url_filter.saveAsJSON()
        fs.writeFile(this.json_filter_path, JSON.stringify(exported), () => { });
    }
    _init_first_filter = () => {
        try {
            let boomfile = require('fs').readFileSync(this.json_filter_path)
            let exported = JSON.parse(boomfile);
            return BloomFilter.fromJSON(exported);
        } catch (e) {
            return new BloomFilter(3000, 0.01);
        }
    }
    store_product_id = async (product_id) => {
        fs.appendFileSync("product.txt", product_id + "\n", () => { })
    }

}
