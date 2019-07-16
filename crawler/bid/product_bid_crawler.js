import ProductActivityCrawler from '../product_activity_crawler';

const ProductBid = require('./product_bid')


export default class ProductBidCrawler extends ProductActivityCrawler {
    constructor(){
        console.log('Product Bid Crawler')
        super();
    }
    getProductActivity = async (productId) => {
        return await ProductBid.find({ product_id: productId });
    }
    getUrl = (productId, pageCount) => {
        return "https://stockx.com/api/products/" + productId + "/activity?state=300&currency=USD&limit=3000&sort=amount&order=ASC&page=" + pageCount;
    }
    storeToDatabase = async (product, productActivity) => {
        let product_activity_db = new ProductBid();
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

let crawler = new ProductBidCrawler();
crawler.json_filter_path = "./crawler/bid/product_name_filter.json";
async function run() {
    await crawler.run();
}
run();