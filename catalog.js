/* カテゴリ・特集・商品詳細・カートで同じ商品IDを使う。 */
(function(){
'use strict';
var data=window.SAMPLE_CATALOG,products=data.products;
function get(id){id=String(id);id=data.featureMap[id]||id;return products.find(function(p){return p.id===id||p.code.toLowerCase()===id.toLowerCase()})}
function link(p){return 'item.html?id='+encodeURIComponent(typeof p==='object'?p.id:p)}
window.ShopCatalog={products:products,get:get,link:link};
if(window.ITEMS){
 ITEMS.forEach(function(it){var p=get(data.itemMap[it.o]);if(p){it.id=p.id;it.url=link(p)}});
 products.forEach(function(p,i){if(ITEMS.some(function(it){return it.id===p.id}))return;ITEMS.push({id:p.id,url:link(p),t:p.title,p:p.price,pt:p.price.toLocaleString('ja-JP')+'円'+(p.skus.some(function(s){return s.price!==p.price})?'〜':''),i:p.image,g:p.hasName?['名入れ']:[],o:2000+i,c:p.categories,s:p.subs})});
}
})();
