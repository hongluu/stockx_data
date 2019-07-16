const Product = require('../product')
const ProductBasic = require('../product_basic')
import mongoose from 'mongoose';
const fs = require('fs');
const readline = require('readline');

class Convert{
    constructor(){
        mongoose.connect('mongodb://localhost/my_database', { useNewUrlParser: true });
        mongoose.set('useCreateIndex', true);
    }

    getProductNameFromFile = ()=>{
        const fileStream = fs.createReadStream('../product_name.txt');

        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });
        return rl;
    }
    getProductBasicFrom =(product)=>{
        let productBasic = new ProductBasic();
        productBasic.id = product.id;
        productBasic.model = product.name;
        productBasic.product_category = product.category;
        productBasic.release_date = product.releaseDate;
        productBasic.url = product.url;
        productBasic.media = product.media;
        productBasic.name = product.title;
        productBasic.brand = product.brand;
        productBasic.description = product.description;
        productBasic.colorway = product.colorway;
        productBasic.short_description = product.shortDescription;

        return productBasic;
    }

    execute = async ()=>{
        let product_names = this.getProductNameFromFile()
        let index =0;
        for await (let product_name of product_names) {
            if(product_name){
                console.log(index++);
                product_name = product_name.trim();
                let product = await Product.find({ title: { $regex: product_name } });
                if(!product || product.length == 0){
                    continue;
                }
                console.log(product_name)
                let productBasic = this.getProductBasicFrom(product[0]);
                console.log(productBasic);
                
               try{
                   await productBasic.save();
               }catch(e){
                   continue;
               }
            }
        }
    }
}

let convert = new Convert();
convert.execute();