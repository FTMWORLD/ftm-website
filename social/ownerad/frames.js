const {chromium}=require('playwright');const {spawn}=require('child_process');const fs=require('fs');
(async()=>{const [,,mode,arg]=process.argv;const SH=process.env.SHARP==='1';const OUT=process.env.OUT||'_v.mp4';
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:SH?2:1});p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>console.log('LOG',m.text()));
await p.goto('file://'+__dirname+'/ad.html');await p.evaluate(()=>document.fonts.ready);
const r=await p.evaluate(([pl,w,a,rk])=>{P=pl;window.RISK=rk;return setup(w,a)},[JSON.parse(fs.readFileSync('plates.json')),JSON.parse(fs.readFileSync('vo.words.json')),JSON.parse(fs.readFileSync('vo.amp.json')),process.env.RISK==='1']);
await p.evaluate(()=>Promise.all([...document.images].map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r}))));
if(mode==='test'){let k=0;for(const t of arg.split(',').map(Number)){await p.evaluate(x=>render(x),t);await p.screenshot({path:'t'+String(k++).padStart(2,'0')+'.png'});}await b.close();return}
const fps=30,N=Math.ceil(r.TOTAL*fps),I0=Math.round((+process.env.FROM||0)*fps);const ff=spawn('ffmpeg',['-loglevel','error','-y','-f','image2pipe','-framerate',''+fps,'-c:v','mjpeg','-i','-',...(SH?['-vf','scale=1080:1920:flags=lanczos']:[]),'-c:v','libx264','-preset','slow','-crf','16','-pix_fmt','yuv420p',OUT]);
for(let i=I0;i<N;i++){await p.evaluate(x=>render(x),i/fps);const buf=await p.screenshot({type:'jpeg',quality:94});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if(i%150===0)console.log(i,'/',N)}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('done',N)})();
