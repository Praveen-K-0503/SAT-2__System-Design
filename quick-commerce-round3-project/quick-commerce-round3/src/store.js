const products = new Map([
 ["P101",{id:"P101",name:"Milk",category:"Dairy",price:50,active:true}],
 ["P102",{id:"P102",name:"Bread",category:"Bakery",price:35,active:true}],
 ["P103",{id:"P103",name:"Eggs (6 pack)",category:"Dairy",price:60,active:true}],
 ["P104",{id:"P104",name:"Rice 1kg",category:"Staples",price:75,active:true}]
]);
const inventory = new Map([
 ["STORE-CBE-01:P101",{storeId:"STORE-CBE-01",productId:"P101",quantity:40}],
 ["STORE-CBE-01:P102",{storeId:"STORE-CBE-01",productId:"P102",quantity:25}],
 ["STORE-CBE-01:P103",{storeId:"STORE-CBE-01",productId:"P103",quantity:18}],
 ["STORE-CBE-01:P104",{storeId:"STORE-CBE-01",productId:"P104",quantity:30}]
]);
module.exports={products,inventory,carts:new Map(),orders:new Map(),deliveries:new Map(),events:[]};
