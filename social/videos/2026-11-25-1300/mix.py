import json,wave,numpy as np,subprocess,sys
vid=sys.argv[1];out=sys.argv[2]
sr=48000;T=json.load(open(vid+'.timing.json'));tot=T['TOTAL'];n=int(tot*sr);t=np.arange(n)/sr;ids=T['ids']
np.random.seed(7)
vo=np.zeros(n)
for i,sid in enumerate(ids):
    raw=subprocess.run(['ffmpeg','-loglevel','error','-i','vo/%s.wav'%sid,'-af','aresample=48000:resampler=soxr','-f','f32le','-ac','1','-'],capture_output=True).stdout
    d=np.frombuffer(raw,dtype=np.float32).astype(float);a=int(T['T'][i]*sr);vo[a:a+len(d)]+=d[:max(0,n-a)]
bpm=92;beat=60/bpm;ch=[[164.81,246.94,329.63],[130.81,196,261.63],[196,293.66,392],[146.83,220,293.66]]
mus=np.zeros(n);bar=beat*4
def add(a,sig):
    a=int(a*sr);b=min(n,a+len(sig))
    if 0<=a<n: mus[a:b]+=sig[:b-a]
k=0
while k*bar<tot:
    c=ch[k%4];L=int((bar+0.6)*sr);tt=np.arange(L)/sr;env=np.minimum(1,tt/0.25)*np.exp(-tt*0.35)
    pad=sum(np.sin(2*np.pi*f*tt+0.3*np.sin(2*np.pi*5*tt))*0.33 for f in c)+0.5*np.sin(2*np.pi*c[0]/2*tt)
    add(k*bar,pad*env*0.6)
    for j in range(8):
        L2=int(0.4*sr);t2=np.arange(L2)/sr;f=c[[0,1,2,1,2,0,1,2][j]]*2
        add(k*bar+j*beat/2,0.22*np.exp(-t2*7)*(np.sin(2*np.pi*f*t2)+0.3*np.sin(4*np.pi*f*t2)))
    if k*bar>3:
        for j in range(4):
            L3=int(0.25*sr);t3=np.arange(L3)/sr;kick=np.sin(2*np.pi*(50+90*np.exp(-t3*30))*t3)*np.exp(-t3*14)
            add(k*bar+j*beat,0.55*kick)
            hat=np.random.randn(int(0.05*sr))*np.exp(-np.arange(int(0.05*sr))/sr*90);add(k*bar+j*beat+beat/2,0.05*hat)
    k+=1
for a in T['T'][1:]:
    L=int(0.6*sr);x=np.convolve(np.random.randn(L),np.ones(30)/30,'same');add(a-0.45,0.06*x*np.sin(np.pi*np.arange(L)/L)**2)
import sys as _s;_s.path.insert(0,'/home/user/ftm-website/social/tools');from finbed import finance_bed as _fb;_L,_R=_fb(tot,seed=55,bpm=92,style='cinema');mus=((_L+_R)/2)[:n] if len(_L)>=n else np.pad((_L+_R)/2,(0,n-len(_L)));mus/=np.abs(mus).max()+1e-9;mus*=0.22;mus*=np.minimum(1,t/1.5)*np.minimum(1,(tot-t)/2.5)
def duck(vo, sr, depth):  # owner 22 Nov: music dips smoothly under the voice and stays down between words (no pumping / hiccups)
    h = int(sr * .01); fr = np.array([np.abs(vo[i:i + h]).max() for i in range(0, len(vo), h)]) > .02
    held = np.convolve(fr.astype(float), np.ones(71), 'same') > 0   # bridge gaps up to 0.35 s on each side
    g = np.zeros(len(held)); x = 0.
    for i, v in enumerate(held): x += (v - x) * (.25 if v > x else .03); g[i] = x   # ~40 ms down, ~330 ms back up
    return 1 - depth * np.interp(np.arange(len(vo)) / h, np.arange(len(g)), g)
mus*=duck(vo,sr,0.5)
for name,arr in [('_v.wav',vo),('_m.wav',mus)]:
    o=wave.open(name,'w');o.setnchannels(1);o.setsampwidth(2);o.setframerate(sr);o.writeframes((np.clip(arr,-1,1)*32767).astype(np.int16).tobytes());o.close()
subprocess.run(['ffmpeg','-loglevel','error','-y','-i','_v.wav','-i','_m.wav','-filter_complex','[0]highpass=f=80,equalizer=f=3000:t=q:w=1:g=2,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,volume=1.4[v];[v][1]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9','-ar','48000','-ac','2','_mix.wav'],check=True)
subprocess.run(['ffmpeg','-loglevel','error','-y','-i',vid,'-i','_mix.wav','-c:v','copy','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart',out],check=True)
print('ok',out,tot)
