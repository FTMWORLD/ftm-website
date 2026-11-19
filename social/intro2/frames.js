const {chromium}=require('playwright');const {spawn}=require('child_process');const fs=require('fs');
(async()=>{const [,,mode,arg]=process.argv;const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file://'+__dirname+'/anim.html');await p.waitForTimeout(600);
const S=JSON.parse(fs.readFileSync('script.json')),D=JSON.parse(fs.readFileSync('vo/durs.json'));S.forEach((s,i)=>s.d=D[i]);
const r=await p.evaluate(([S,D])=>setup(S,D),[S,D]);fs.writeFileSync('timing.json',JSON.stringify(r));
if(mode==='test'){const ts=arg==='all'?r.T.map(x=>x+2.2):arg.split(',').map(Number);let k=0;for(const t of ts){await p.evaluate(x=>render(x),t);await p.screenshot({path:'t'+String(k++).padStart(2,'0')+'.png'});}console.log('total',r.TOTAL);await b.close();return}
const fps=25,N=Math.ceil(r.TOTAL*fps);const ff=spawn('ffmpeg',['-loglevel','error','-y','-f','image2pipe','-framerate',''+fps,'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','video.mp4']);
for(let i=0;i<N;i++){await p.evaluate(x=>render(x),i/fps);const buf=await p.screenshot({type:'jpeg',quality:90});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if(i%300===0)console.log(i,'/',N)}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('done',N)})();
