const {chromium}=require('playwright');const {spawn}=require('child_process');const fs=require('fs');
(async()=>{const [,,mode,arg]=process.argv;const LAND=process.env.LAND==='1',OUT=process.env.OUT||'video.mp4';const b=await chromium.launch();const p=await b.newPage({viewport:LAND?{width:1920,height:1080}:{width:1080,height:1920}});
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file://'+__dirname+'/anim.html'+(LAND?'#land':''));await p.waitForTimeout(800);
let S=JSON.parse(fs.readFileSync('script.run.json')),D=JSON.parse(fs.readFileSync('vo/durs.json'));S.forEach((s,i)=>s.d=D[i]);
const AMP=JSON.parse(fs.readFileSync('vo/amp.json'));const r=await p.evaluate(([S,D,A])=>setup(S,D,A),[S,D,AMP]);fs.writeFileSync(OUT+'.timing.json',JSON.stringify(Object.assign(r,{ids:S.map(x=>x.id)})));
if(mode==='test'){const ts=arg==='all'?r.T.map((x,i)=>x+Math.min(2,D[i]*0.6)):arg.split(',').map(Number);let k=0;for(const t of ts){await p.evaluate(x=>render(x),t);await p.screenshot({path:'t'+(LAND?'L':'V')+String(k++).padStart(2,'0')+'.png'});}console.log('total',r.TOTAL,JSON.stringify(r.T));await b.close();return}
const fps=25,N=Math.ceil(r.TOTAL*fps);const ff=spawn('ffmpeg',['-loglevel','error','-y','-f','image2pipe','-framerate',''+fps,'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p',OUT]);
for(let i=0;i<N;i++){await p.evaluate(x=>render(x),i/fps);const buf=await p.screenshot({type:'jpeg',quality:92});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if(i%250===0)console.log(i,'/',N)}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('done',N)})();
