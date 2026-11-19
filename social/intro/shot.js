const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
await p.goto('https://www.ftmwealthnation.com/',{waitUntil:'networkidle',timeout:60000}).catch(()=>{});await p.waitForTimeout(3000);
await p.screenshot({path:'home.png'});await b.close();})();
