const {chromium,devices}=require('playwright');(async()=>{const b=await chromium.launch();const c=await b.newContext(devices['iPhone 13']);const p=await c.newPage();
for(const [u,f] of [['https://www.ftmwealthnation.com/performance.html','perf'],['https://www.ftmwealthnation.com/','home']]){
await p.goto(u,{waitUntil:'networkidle',timeout:60000}).catch(e=>console.log('nav',e.message));await p.waitForTimeout(6000);
await p.evaluate(()=>{document.querySelectorAll('[role=dialog],#authOverlay,.cookie,#cookie').forEach(e=>e.hidden=true)});
await p.screenshot({path:'img/'+f+'0.png'});for(let i=1;i<5;i++){await p.evaluate(()=>scrollBy(0,innerHeight*.9));await p.waitForTimeout(1200);await p.screenshot({path:'img/'+f+i+'.png'});}}
await b.close();})();
