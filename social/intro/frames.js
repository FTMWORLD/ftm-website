const {chromium}=require('playwright');const {spawn}=require('child_process');
(async()=>{const [,,mode,arg]=process.argv;const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('file://'+__dirname+'/intro.html');await p.waitForTimeout(800);const total=await p.evaluate(()=>TOTAL);
if(mode==='test'){for(const t of arg.split(',')){await p.evaluate(x=>render(x),+t);await p.screenshot({path:'t-'+t+'.png'});}console.log('total',total);await b.close();return}
const fps=25,N=Math.ceil(total*fps);const ff=spawn('ffmpeg',['-loglevel','error','-y','-f','image2pipe','-framerate',''+fps,'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart','intro-silent.mp4']);
for(let i=0;i<N;i++){await p.evaluate(x=>render(x),i/fps);const buf=await p.screenshot({type:'jpeg',quality:90});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if(i%250===0)console.log(i,'/',N)}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('done',N)})();
