import ProductActivityCrawler from '../product_activity_crawler';

const ProductAsk = require('./product_ask')


export default class ProductAskCrawler extends ProductActivityCrawler {
    
    constructor(){
        super();
        console.log('Product Ask Crawler')
    }

    getProductActivity = async (productId) => {
        return await ProductAsk.find({ product_id: productId });
    }
    getUrl = (productId, pageCount) => {
        return "https://stockx.com/api/products/" + productId + "/activity?state=400&currency=USD&limit=3000&sort=amount&order=ASC&page=" + pageCount;
    }
    storeToDatabase = async (product, productActivity) => {
        let product_activity_db = new ProductAsk();
        product_activity_db.product_id = product.id;
        product_activity_db.id = productActivity.chainId;
        product_activity_db.productName = product.name;
        product_activity_db.activity = productActivity;
        try {
            await product_activity_db.save();
        } catch (e) {
            this.logger.error(e);
        }
    }
}

let crawler = new ProductAskCrawler();
crawler.json_filter_path = "./crawler/ask/product_name_filter.json";
async function run() {
    await crawler.run();
}
run();