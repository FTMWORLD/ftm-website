import json,wave,numpy as np,subprocess,sys
vid=sys.argv[1];out=sys.argv[2]
sr=48000;T=json.load(open(vid+'.timing.json'));tot=T['TOTAL'];n=int(tot*sr);t=np.arange(n)/sr;ids=T['ids'];TS=T['T']
R=TS[ids.index('b_reveal')];C=TS[ids.index('b_cta')]
rng=np.random.default_rng(11)
vo=np.zeros(n)
for i,sid in enumerate(ids):
    raw=subprocess.run(['ffmpeg','-loglevel','error','-i','vo/%s.wav'%sid,'-af','aresample=48000:resampler=soxr','-f','f32le','-ac','1','-'],capture_output=True).stdout
    d=np.frombuffer(raw,dtype=np.float32).astype(float);a=int(TS[i]*sr);vo[a:a+len(d)]+=d[:max(0,n-a)]
mus=np.zeros(n);fx=np.zeros(n)
def add(buf,a,sig,g=1.0):
    a=int(a*sr);b=min(n,a+len(sig))
    if 0<=a<n: buf[a:b]+=g*sig[:b-a]
def lp(x,k): return np.convolve(x,np.ones(k)/k,'same')
bpm=100;beat=60/bpm;bar=4*beat
ch=[[220,261.63,329.63],[174.61,220,261.63],[261.63,329.63,392],[196,246.94,293.66]]
k=0
while k*bar<tot:
    s0=k*bar;c=ch[k%4];L=int((bar+0.8)*sr);tt=np.arange(L)/sr
    env=np.minimum(1,tt/0.4)*np.exp(-tt*0.3)
    pad=sum(np.sin(2*np.pi*f*tt+0.4*np.sin(2*np.pi*4.5*tt))+0.5*np.sin(2*np.pi*f*1.003*tt) for f in c)/3
    add(mus,s0,pad*env,0.55 if s0<R else 0.45)
    full=s0+bar>R
    for j in range(8):
        st=s0+j*beat/2
        if st>=tot: break
        L2=int(0.5*sr);t2=np.arange(L2)/sr;f=c[[0,2,1,2,0,2,1,2][j]]*2
        pl=np.exp(-t2*6)*(np.sin(2*np.pi*f*t2)+0.35*np.sin(4*np.pi*f*t2)+0.12*np.sin(6*np.pi*f*t2))
        add(mus,st,pl,0.18 if st<R else 0.24)
        if st>=R:
            L4=int(0.5*sr);t4=np.arange(L4)/sr;bass=np.sin(2*np.pi*c[0]/4*t4)*np.minimum(1,t4/0.01)*np.exp(-t4*3)
            if j%2==0: add(mus,st,bass,0.5)
    for j in range(4):
        st=s0+j*beat
        if st>=R and st<C+ (tot-C)*0.8:
            L3=int(0.3*sr);t3=np.arange(L3)/sr;kick=np.sin(2*np.pi*(48+110*np.exp(-t3*28))*t3)*np.exp(-t3*11)
            add(mus,st,kick,0.75)
            if j%2==1:
                cl=lp(rng.standard_normal(int(0.18*sr)),3)*np.exp(-np.arange(int(0.18*sr))/sr*28);add(mus,st,cl,0.16)
            hat=np.diff(rng.standard_normal(int(0.05*sr)+1))*np.exp(-np.arange(int(0.05*sr))/sr*80);add(mus,st+beat/2,hat,0.05)
        elif st<R and st>TS[1]-0.1:
            tick=np.diff(rng.standard_normal(int(0.03*sr)+1))*np.exp(-np.arange(int(0.03*sr))/sr*150);add(mus,st,tick,0.12);add(mus,st+beat/2,tick,0.07)
    k+=1
# riser into the reveal
Lr=int(2.2*sr);tr=np.arange(Lr)/sr;pr=tr/2.2
noise=rng.standard_normal(Lr);rs=noise-lp(noise,int(40-36*1))  # bright noise
sweep=np.sin(2*np.pi*np.cumsum(200+1400*pr**2)/sr)
add(fx,R-2.2,(0.25*rs*pr**2+0.25*sweep*pr**3)*np.minimum(1,(2.2-tr)/0.03),0.9)
# impact at the reveal
Li=int(2.5*sr);ti=np.arange(Li)/sr
boom=np.sin(2*np.pi*(38+80*np.exp(-ti*9))*ti)*np.exp(-ti*1.6)
crash=lp(rng.standard_normal(Li),2)*np.exp(-ti*3)
add(fx,R+0.02,boom*0.9+crash*0.18)
# soft whoosh at every cut
for a in TS[1:]:
    if abs(a-R)<0.1: continue
    L=int(0.7*sr);x=lp(rng.standard_normal(L),24);add(fx,a-0.5,x*np.sin(np.pi*np.arange(L)/L)**2,0.35)
# chime on each trust tick and the final button
for a in [C+0.1]:
    L=int(1.2*sr);tc=np.arange(L)/sr;add(fx,a,np.exp(-tc*5)*(np.sin(2*np.pi*1318.5*tc)+0.5*np.sin(2*np.pi*1975.5*tc)),0.08)
# final sting chord
Ls=int(3.2*sr);ts=np.arange(Ls)/sr;add(fx,tot-3.4,sum(np.sin(2*np.pi*f*ts) for f in [220,277.18,329.63,440,554.37])*np.exp(-ts*1.2)*np.minimum(1,ts/0.02)/5,0.5)
mus/=np.abs(mus).max()+1e-9;mus*=0.26;mus*=np.minimum(1,t/0.6)*np.minimum(1,(tot-t)/1.5)
fx/=np.abs(fx).max()+1e-9;fx*=0.34
env=np.convolve((np.abs(vo)>0.02).astype(float),np.ones(int(0.25*sr))/(0.25*sr),'same');mus*=1-0.45*np.clip(env*2,0,1)
bed=mus+fx
for name,arr in [('_v.wav',vo),('_m.wav',bed)]:
    o=wave.open(name,'w');o.setnchannels(1);o.setsampwidth(2);o.setframerate(sr);o.writeframes((np.clip(arr,-1,1)*32767).astype(np.int16).tobytes());o.close()
subprocess.run(['ffmpeg','-loglevel','error','-y','-i','_v.wav','-i','_m.wav','-filter_complex','[0]highpass=f=80,equalizer=f=200:t=q:w=1:g=1.5,equalizer=f=3200:t=q:w=1:g=2.5,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,volume=1.5[v];[1]aecho=0.8:0.6:40|70:0.25|0.18[m];[v][m]amix=inputs=2:normalize=0,acompressor=threshold=-10dB:ratio=2,loudnorm=I=-14:TP=-1.5:LRA=9','-ar','48000','-ac','2','_mix.wav'],check=True)
subprocess.run(['ffmpeg','-loglevel','error','-y','-i',vid,'-i','_mix.wav','-c:v','copy','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart',out],check=True)
print('ok',out,tot)
