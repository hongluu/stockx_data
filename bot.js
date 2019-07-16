const puppeteer = require('puppeteer');
const Product = require('./product')
const ProductBasic = require('./product_basic')
const ProductActivity = require('./product_activity')
import mongoose from 'mongoose';
const { BloomFilter } = require('bloom-filters')
var cloudscraper = require('cloudscraper');
const fs = require('fs');
const readline = require('readline');


export default class Bot {
    constructor() {
        mongoose.connect('mongodb://localhost/my_database', { useNewUrlParser: true });
        mongoose.set('useCreateIndex', true);
        this.fs = require("fs");
        this.json_filter_path = "product_filter.json";
        this.filter = this._init_first_filter();
        this.retry = 1;
        this.requestCount = 1;
        this.years = [2007, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019];

    }
    connectBrower = async () => {
        const wsChromeEndpointurl = 'ws://127.0.0.1:9222/devtools/browser/96704ff9-8d3a-4de8-9e88-a9d9b82d659b';
        this.browser = await puppeteer.launch({
            headless: false,
            browserWSEndpoint: wsChromeEndpointurl,
        });
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _init_first_filter() {
        try {
            // console.log(json_filter_path)
            let boomfile = require('fs').readFileSync(this.json_filter_path)
            let exported = JSON.parse(boomfile);
            return BloomFilter.fromJSON(exported);
        } catch (e) {
            return new BloomFilter(3000, 0.01);
        }
    }

    updateProduct = async () => {
        await this.connectBrower();
        const page = await this.browser.newPage();

        let categories = ["sneakers", "streetwear", "handbags", "watches"];
        for (let cateIndex = 0; cateIndex < categories.length; cateIndex++) {
            this.retry = 1;
            let i = 1;
            while (true) {
                if (this.requestCount % 50 == 0) {
                    await this.sleep(20 * 1000);
                }
                this.requestCount++;
                if (this.retry == 3) {
                    console.log("Done.")
                    break;
                }
                let url = "https://stockx.com/api/browse?order=DESC&page=" + i + "$&productCategory=" + categories[cateIndex];
                try {
                    await page.goto(url);
                } catch (e) {
                    continue;
                }
                let data = await page.evaluate(async () => {
                    let res;
                    try {
                        res = JSON.parse(document.querySelector("body").innerText);

                    } catch (e) {
                        await this.browser.close();
                        await this.sleep(60000 * 5)
                        await this.connectBrower();
                        res = JSON.parse(document.querySelector("body").innerText);
                    }
                    return res
                });
                let products = data.Products;
                if (products == null || data.Products.length == 0) {
                    console.log("Retry...")
                    this.retry++;
                }
                for (let numProduct = 0; numProduct < products.length; numProduct++) {
                    console.log(products[numProduct]);
                    let productDb = new Product(products[numProduct]);
                    try {
                        await productDb.save();
                    } catch (e) {
                        console.log("Duplicate:" + productDb.id)
                    }
                }
                i++;
                await this.sleep(2000)
            }
        }


        await this.browser.close();
    }
    async storeUrlFilterToFile(url_filter) {
        let exported = url_filter.saveAsJSON()
        this.fs.writeFile(this.json_filter_path, JSON.stringify(exported), () => { });
    }

    async store_product_id(product_id) {
        this.fs.appendFileSync("product.txt", product_id + "\n", () => { })
    }

    updateProductActitivy = async () => {
        await this.connectBrower();
        console.log(1);
        const page = await this.browser.newPage();
        let products = await Product.find();
        for (let productIndex = 0; productIndex < products.length; productIndex++) {
            let product = products[productIndex];
            if (this.filter.has(product.id)) {
                continue;
            }
            this.filter.add(product.id);
            this.storeUrlFilterToFile(this.filter);

            this.store_product_id(product.id);
            let numPage = 1;
            this.retry = 1;
            while (true) {
                if (this.retry == 3) {
                    console.log("Done.")
                    break;
                }
                let url = "https://stockx.com/api/products/" + product.id + "/activity?state=480&currency=USD&limit=10&sort=createdAt&order=DESC&page=" + numPage;
                try {
                    await page.goto(url);
                } catch (e) {
                    continue;
                }
                let data = await page.evaluate(async () => {
                    let res;
                    try {
                        res = JSON.parse(document.querySelector("body").innerText);
                    } catch (e) {
                        console.log("Close Brower");
                        await this.browser.close();
                        console.log("Wait for 5m ... ");
                        await this.sleep(60000 * 5);
                        console.log("Open new Brower");
                        await this.connectBrower();
                        return null;
                    }
                    return res
                });
                if (data == null) {
                    continue;
                }
                let productsActivity = data.ProductActivity;
                if (productsActivity == undefined || productsActivity.length == 0) {
                    console.log("Retry...")
                    this.retry++;
                    await this.sleep(1000);
                    continue;
                } else {
                    for (let numProduct = 0; numProduct < productsActivity.length; numProduct++) {
                        let product_activity = new ProductActivity();
                        product_activity.product_id = product.id;
                        product_activity.id = productsActivity[numProduct].chainId;
                        product_activity.activity = productsActivity[numProduct];
                        try {
                            await product_activity.save();
                        } catch (e) {
                            console.log("Duplicate:" + product_activity.id)
                        }
                    }
                }

                numPage++;
                await this.sleep(300)
            }
            await this.sleep(20 * 1000)
        };
    }
    get_option = (url) => {
        var options = {
            uri: url,
            // jar: requestModule.jar(), // Custom cookie jar
            headers: {
                // User agent, Cache Control and Accept headers are required
                // User agent is populated by a random UA.
                'User-Agent': 'Ubuntu Chromium/34.0.1847.116 Chrome/34.0.1847.116 Safari/537.36',
                'Cache-Control': 'private',
                'Accept': 'application/xml,application/xhtml+xml,text/html;q=0.9, text/plain;q=0.8,image/png,*/*;q=0.5'
            },
            // Cloudscraper automatically parses out timeout required by Cloudflare.
            // Override cloudflareTimeout to adjust it.
            cloudflareTimeout: 5000,
            // Reduce Cloudflare's timeout to cloudflareMaxTimeout if it is excessive
            cloudflareMaxTimeout: 30000,
            // followAllRedirects - follow non-GET HTTP 3xx responses as redirects
            followAllRedirects: true,
            // Support only this max challenges in row. If CF returns more, throw an error
            challengesToSolve: 3,
            // Remove Cloudflare's email protection, replace encoded email with decoded versions
            decodeEmails: false,
            // Support gzip encoded responses (Should be enabled unless using custom headers)
            gzip: true,
            // Removes a few problematic TLSv1.0 ciphers to avoid CAPTCHA
            // agentOptions: { ciphers }
        };
        return options;
    }
    test = async () => {
        let products = await Product.find();
        let i = 0;
        for (let productIndex = 0; productIndex < products.length; productIndex++) {
            let product = products[productIndex];
            let numPage = 1;
            this.retry = 1;
            while (true) {
                let url = "https://stockx.com/api/products/" + product.id + "/activity?state=480&currency=USD&limit=3000&sort=createdAt&order=DESC&page=" + numPage;
                console.log(i++)
                let data = await cloudscraper(url);
                if (data == null) {
                    continue;
                }
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    await this.sleep(30 * 1000);
                    continue;
                }

                let productsActivity = data.ProductActivity;
                if (productsActivity == undefined || productsActivity.length == 0) {
                    break;
                } else {
                    for (let numProduct = 0; numProduct < productsActivity.length; numProduct++) {
                        let product_activity = new ProductActivity();
                        product_activity.product_id = product.id;
                        product_activity.id = productsActivity[numProduct].chainId;
                        product_activity.activity = productsActivity[numProduct];
                        try {
                            await product_activity.save();
                        } catch (e) {
                            continue;
                        }
                    }
                }
            }
        }

    }


    getRealseTime = async (year) => {
        let url = "https://stockx.com/api/browse?_tags=supreme&productCategory=streetwear&page=1" + "&year=" + year;
        let data = await cloudscraper(url);
        data = JSON.parse(data);
        return Object.keys(data.Facets.releaseTime)
    }

    updateProductV2 = async () => {
        for (let yearIndex = 0; yearIndex < this.years.length; yearIndex++) {
            let year = this.years[yearIndex];
            let releaseTimes = await this.getRealseTime(year);
            for (let i = 0; i < releaseTimes.length; i++) {
                let pageCount = 1;
                while (true) {
                    let url = "https://stockx.com/api/browse?_tags=supreme&productCategory=streetwear" +
                        "&releaseTime=" + releaseTimes[i] + "&page=" + pageCount + "&year=" + year;
                    let data;
                    try {
                        data = await cloudscraper(url);
                        data = JSON.parse(data)
                    } catch (e) {
                        console.log("Sleep 60s ...")
                        await this.sleep(2 * 60 * 1000);
                        continue
                    }
                    let products = data.Products;
                    if (products == null || data.Products.length == 0) {
                        console.log(url)
                        console.log("Break while:" + releaseTimes[i])
                        break;
                    }
                    console.log("Num of product" + products.length)
                    for (let numProduct = 0; numProduct < products.length; numProduct++) {
                        let productDb = new Product(products[numProduct]);
                        try {
                            await productDb.save();
                        } catch (e) {
                            // console.log("Duplicate:" + productDb.id)
                        }
                    }
                    pageCount++;
                }

            }
        }

    }

    updateProductV3 = async () => {
        const fileStream = fs.createReadStream('product_name.txt');

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
                let product = await Product.find({ title: { $regex: line.trim() } });
                if (product[0]) {
                    continue
                }
                
                let url = "https://stockx.com/api/search?currency=USD&query="+line.trim();
                let data;
                try {
                    data = await cloudscraper(url);
                    data = JSON.parse(data)
                } catch (e) {
                    console.log("Sleep 60s ...")
                    await this.sleep(2 * 60 * 1000);
                    continue
                }
                let products = data.hits;
                if (!products || products.length == 0) {
                    console.log(url)
                    console.log("Break while:" + url)
                    continue;
                }
                console.log("Num of product" + products.length)
                for (let numProduct = 0; numProduct < products.length; numProduct++) {
                    let productDb = new ProductBasic(products[numProduct]);
                    productDb.id = products[numProduct].objectID;
                    try {
                        await productDb.save();
                    } catch (e) {
                        // console.log("Duplicate:" + productDb.id)
                    }
                }
            }
        }

    }
    checkProductInDb = async () => {
        const fileStream = fs.createReadStream('product_name.txt');

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
                let product = await Product.find({ title: { $regex: line.trim() } });
                if (product[0]) {
                    // console.log(product);
                    console.log(i++);
                }
            }
        }
    }
}

let bot = new Bot();
// bot.updateProductV2();
bot.updateProductV3();
// async function run() {
//     console.log(await bot.checkProductInDb())
// }
// run();