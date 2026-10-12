const base='http://localhost:3000';
(async()=>{
 const h=await fetch(`${base}/health`);if(!h.ok)throw Error('Health check failed');
 const s=await fetch(`${base}/api/v1/products?q=milk`).then(r=>r.json());if(!s.items.some(p=>p.id==='P101'))throw Error('Product search failed');
 const c=await fetch(`${base}/api/v1/carts/SMOKE/items`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productId:'P101',quantity:1})});if(c.status!==201)throw Error('Cart failed');
 const r=await fetch(`${base}/api/v1/orders`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cartId:'SMOKE',customerId:'U101'})});const o=await r.json();if(r.status!==201)throw Error(JSON.stringify(o));
 const d=await fetch(`${base}/api/v1/orders/${o.orderId}/delivery-assignment`,{method:'POST'});if(d.status!==201)throw Error('Assignment failed');
 const t=await fetch(`${base}/api/v1/orders/${o.orderId}/delivery-status`);if(!t.ok)throw Error('Status failed');
 console.log('Smoke test passed:',o.orderId);
})().catch(e=>{console.error(e);process.exitCode=1;});
