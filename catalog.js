/* カテゴリ・特集・商品詳細・カートで同じ商品IDを使う。 */
(function(){
'use strict';
var data=window.SAMPLE_CATALOG,products=data.products;
// v69 食品の税率が変わった日からは、お店の税率表（store-info.js）で価格を税込にし直す
if(window.LunaStore){LunaStore.applyCatalog(products);LunaStore.applyCatalog(data.featureProducts)}
function get(id){id=String(id);id=data.featureMap[id]||id;return products.find(function(p){return p.id===id||p.code.toLowerCase()===id.toLowerCase()})}
function link(p){return 'item.html?id='+encodeURIComponent(typeof p==='object'?p.id:p)}
window.ShopCatalog={products:products,get:get,link:link};
if(window.FEATURE_CATALOG&&data.featureProducts)FEATURE_CATALOG.products=data.featureProducts;
if(window.ITEMS){
 window.ITEMS=ITEMS.filter(function(it){return !(data.inactiveIds||[]).includes(String(data.itemMap[it.o]||it.id))});
 ITEMS.forEach(function(it){var p=get(data.itemMap[it.o]);if(p){var l=(data.listing||{})[p.id]||{};it.id=p.id;it.url=link(p);it.t=l.title||p.title;it.p=p.price;it.pt=p.price.toLocaleString('ja-JP')+'円'+(p.skus.some(function(s){return s.price!==p.price})?'〜':'');it.i=l.image===undefined?p.image:l.image;it.c=l.categories||p.categories;it.s=l.subs||p.subs;}});
 products.forEach(function(p,i){if(ITEMS.some(function(it){return it.id===p.id}))return;var l=(data.listing||{})[p.id]||{};ITEMS.push({id:p.id,url:link(p),t:l.title||p.title,p:p.price,pt:p.price.toLocaleString('ja-JP')+'円'+(p.skus.some(function(s){return s.price!==p.price})?'〜':''),i:l.image===undefined?p.image:l.image,g:p.hasName?['名入れ']:[],o:2000+i,c:l.categories||p.categories,s:l.subs||p.subs})});
var seen={};ITEMS=ITEMS.filter(function(it){if(!it.id)return true;if(seen[it.id])return false;seen[it.id]=true;return true});
}
})();
