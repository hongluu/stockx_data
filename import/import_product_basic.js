const ProductBasic = require('../product_basic')
const ProductActivity = require('../product_activity')
const ProductTuan = require('../product_tuan')
const Product = require('../product')
import mongoose from 'mongoose';
import { runInContext } from 'vm';
const fs = require('fs');
const readline = require('readline');
var cloudscraper = require('cloudscraper');
const log4js = require('log4js');
log4js.configure({
    appenders: { cheese: { type: 'file', filename: 'import.log' } },
    categories: { default: { appenders: ['cheese'], level: 'error' } }
});
const { BloomFilter } = require('bloom-filters')
const XLSX = require('xlsx');
var dateFormat = require('dateformat');


class Import {
    constructor() {
        mongoose.connect('mongodb://10.2.197.90/my_database', { useNewUrlParser: true });
        mongoose.set('useCreateIndex', true);
        this.logger = log4js.getLogger('import');
        this.filter = this._init_first_filter();

    }
    _init_first_filter() {
        try {
            this.json_filter_path = "product_name_filter.json";
            let boomfile = require('fs').readFileSync(this.json_filter_path)
            let exported = JSON.parse(boomfile);
            return BloomFilter.fromJSON(exported);
        } catch (e) {
            return new BloomFilter(3000, 0.01);
        }
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async storeUrlFilterToFile(url_filter) {
        let exported = url_filter.saveAsJSON()
        fs.writeFile(this.json_filter_path, JSON.stringify(exported), () => { });
    }
    getProductNameFromFile = () => {
        const fileStream = fs.createReadStream('../product_name.txt');

        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });
        return rl;
    }
    async store_product_id(product_id) {
        fs.appendFileSync("product.txt", product_id + "\n", () => { })
    }
    execute = async () => {
        let product_names = this.getProductNameFromFile()
        let index = 0;
        let attemp = 0;
        let existIndex = 0;
        for await (let product_name of product_names) {
            if (product_name) {
                product_name = product_name.trim();
                if (this.filter.has(product_name)) {
                    continue;
                }
                console.log((index++) + " ." + product_name);
                let product = await ProductTuan.find({ nameSearch: { $regex: product_name.toLowerCase().replace(/\s/g, '') } });
                if (product.length > 0) {
                    console.log(existIndex++)
                    continue;
                }
                //scrape product by search api
                let url = "https://stockx.com/api/search?currency=USD&query=" + product_name;
                let data;
                try {
                    data = await cloudscraper(url);
                    data = JSON.parse(data)
                } catch (e) {
                    this.logger.error(e);
                    console.log("Sleep 60s ...")
                    // await this.sleep(1 * 60 * 1000);
                    continue
                }
                let products = data.hits;
                if (!products || products.length == 0) {
                    console.log(url)
                    this.filter.add(product_name); this.storeUrlFilterToFile(this.filter);
                    fs.appendFileSync("product_not_found.txt", product_name + "\n", () => { })
                    continue;
                }

                for (let numProduct = 0; numProduct < products.length; numProduct++) {
                    let productDb = new ProductTuan(products[numProduct]);
                    console.log(productDb)
                    productDb.id = products[numProduct].objectID;
                    productDb.nameSearch = productDb.name.toLowerCase().replace(/\s/g, '');
                    productDb.nameSearch2 = product_name;
                    try {
                        this.filter.add(product_name); this.storeUrlFilterToFile(this.filter);
                        await productDb.save();

                        console.log("==== New ====")
                    } catch (e) {
                        // console.log("Duplicate:" + productDb.id)
                    }
                }
                try {
                    await ProductTuan.save();
                } catch (e) {
                    continue;
                }
            }
        }
    }

    updateNameSearch = async () => {
        let products = await ProductTuan.find();
        products.forEach(product => {
            if (product.name)
                product.nameSearch = product.name.toLowerCase().replace(/\s/g, '');
            product.save();
        })
    }
    checkProductInDb = async () => {
        const fileStream = fs.createReadStream('../product_name.txt');

        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });
        // Note: we use the crlfDelay option to recognize all instances of CR LF
        // ('\r\n') in input.txt as a single line break.
        let i = 0;
        for await (const line of rl) {
            // Each line in input.txt will be successively available here as `line`.
            if (line) {
                let product_name = line.trim();

                let product = await ProductTuan.find({ nameSearch3: { $regex: this.getProductNameSearch3(product_name) } });
                if (product[0]) {
                    console.log(i++);
                } else {
                    if (this.filter.has(product_name)) {
                        continue;
                    }
                    //scrape product by search api
                    let url = "https://stockx.com/api/search?currency=USD&query=" + product_name;
                    let data;
                    try {
                        data = await cloudscraper(url);
                        data = JSON.parse(data)
                    } catch (e) {
                        this.logger.error(e);
                        console.log("Sleep 60s ...")
                        // await this.sleep(1 * 60 * 1000);
                        continue
                    }
                    let products = data.hits;
                    if (!products || products.length == 0) {
                        console.log(url)
                        this.filter.add(product_name); this.storeUrlFilterToFile(this.filter);
                        fs.appendFileSync("product_not_found.txt", product_name + "\n", () => { })
                        continue;
                    }
                    // console.log(products)
                    for (let numProduct = 0; numProduct < products.length; numProduct++) {
                        let productDb = await ProductTuan.find({ id: products[numProduct].objectID });
                        // console.log(productDb)
                        if (productDb.length == 0) {
                            continue;
                        }
                        productDb.nameSearch3 = this.getProductNameSearch3(product_name);
                        productDb.isNew = false;
                        try {
                            this.filter.add(product_name); this.storeUrlFilterToFile(this.filter);
                            await productDb.save();

                            console.log("==== New ====")
                        } catch (e) {
                            // console.log("Duplicate:" + productDb.id)
                        }
                    }
                    try {
                        await ProductTuan.save();
                    } catch (e) {
                        continue;
                    }

                }

            }
        }
        console.log(i)
    }

    getProductNameSearch3(product_name) {
        return product_name.toLowerCase().replace(/\s/g, '_').replace(/\s|[0-9_]|\W|[#$%^&*()]/g, "_");
    }
    updateProductActivity = async () => {
        let products = await Product.find();
        for (let productIndex = 0; productIndex < products.length; productIndex++) {
            let product = products[productIndex];
            let product_activity_dbs = await ProductActivity.find({ product_id: product.id });

            console.log(product_activity_dbs.length)
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
                let url = "https://stockx.com/api/products/" + product.id + "/activity?state=480&currency=USD&limit=3000&sort=createdAt&order=DESC&page=" + pageCount;
                let data;
                if (attemp == 5) {
                    attemp = 1;
                    pageCount++;
                    break;
                }
                try {
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
                    this.logger.error(product.id );
                    break;
                }
                let productsActivity = data.ProductActivity;
                if (!productsActivity || productsActivity.length == 0) {
                    break;
                } else {
                    for (let numProduct = 0; numProduct < productsActivity.length; numProduct++) {
                        let product_activity = new ProductActivity();
                        product_activity.product_id = product.id;
                        product_activity.id = productsActivity[numProduct].chainId;
                        product_activity.nameSearch = product.nameSearch3;
                        product_activity.productName = product.name;
                        product_activity.activity = productsActivity[numProduct];
                        try {
                            await product_activity.save();
                        } catch (e) {
                            this.logger.error(e);
                        }
                    }
                }
                // await this.sleep(300);
                pageCount++;
            }
            this.filter.add(product.id);
            this.storeUrlFilterToFile(this.filter);

        }
    }

    exportProductActivityToExcel = async () => {
        var workbook = XLSX.readFile('All-time.xlsx');
        var scraping_data_sheet = workbook.Sheets["Scraping data"];
        var outputSheet = workbook.Sheets["Output"];
        let rowIndex = 2;
        let jsonData = [];
        let index =1;
        while (true) {

            let Acell = "A" + rowIndex;
            let Bcell = "B" + rowIndex;
            let Ccell = "C" + rowIndex;
            let Dcell = "D" + rowIndex;
            let Ecell = "E" + rowIndex;
            let Fcell = "F" + rowIndex;
            if (!scraping_data_sheet[Acell]) {
                break;
            }
            let nameSearch = this.getProductNameSearch3(scraping_data_sheet[Dcell].v.trim());
            console.log(rowIndex+"."+nameSearch)
            if (nameSearch){
                let productActivities = await ProductActivity.find({ nameSearch: nameSearch});
                if (productActivities.length >0)
                {
                    let productTuan = ProductTuan.find({id:productActivities[0].product_id});
                    for (let i = 0; i < productActivities.length; i++) {
                        let productActivity = productActivities[i];
                        let date = new Date(productActivity.activity.createdAt);
                        let DateCell = dateFormat(date, "fullDate");
                        let TimeCell = dateFormat(date, "shortTime");
                        let Sale_Price = '$' + productActivity.activity.localAmount;
                        jsonData.push([
                            index++,
                            productActivity.product_id,
                            productActivity.productName,
                            productTuan.colorway,
                            '',//session
                            '',//retail Price
                            '',//relesase Date
                            DateCell, TimeCell, productActivity.activity.shoeSize, Sale_Price
                        ])

                    }
                }else{
                    jsonData.push([
                        scraping_data_sheet[Acell],
                        scraping_data_sheet[Bcell],
                        scraping_data_sheet[Ccell],
                        scraping_data_sheet[Dcell],
                        scraping_data_sheet[Ecell],
                        '', '', ''
                    ])
                }
                
            }
            rowIndex++;

        }
        XLSX.utils.sheet_add_json(outputSheet, jsonData);
        XLSX.writeFile(workbook, "All-time1.xlsx");
    }

}


let importProduct = new Import();
async function run() {
    // await importProduct.execute();
    await importProduct.exportProductActivityToExcel();
    mongoose.disconnect();
}
run();
