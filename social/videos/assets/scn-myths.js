/* Nov 21: TV game-show studio, host + buzzer, MYTH stamp -> FACT */
const HOST={skin:'#f1c27d',hair:'#5a3a22',hairStyle:'short',top:'#14214f',top2:'#0b1640',beard:1,glasses:1,ph:.4,collar:'<path d="M-24 -212 L0 -180 L24 -212" stroke="#fff" stroke-width="8" fill="none"/><path d="M0 -180 l-9 30 9 70 9 -70z" fill="#E3B62F"/>'};
const GUEST={skin:'#8d5524',hair:'#1b120c',hairStyle:'bun',top:'#3fa7a0',ph:1.3};
function studio(t,spot){let o=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0"><defs>
<radialGradient id="sbg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#1d3590"/><stop offset=".6" stop-color="#0b1640"/><stop offset="1" stop-color="#03061a"/></radialGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d0" stop-opacity=".45"/><stop offset="1" stop-color="#fff6d0" stop-opacity="0"/></linearGradient>
<linearGradient id="flr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16245e"/><stop offset="1" stop-color="#050a22"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#sbg)"/>`;
 for(let i=0;i<7;i++){const x=80+i*155,a=sin(t*1.3+i)*14;o+=`<g transform="translate(${x},300) rotate(${a})"><path d="M-30 0 L30 0 L170 1000 L-170 1000Z" fill="url(#beam)" opacity="${(spot?.55:.25)+.15*sin(t*2+i)}"/></g><circle cx="${x}" cy="300" r="16" fill="#fff6d0"/>`}
 o+=`<rect x="0" y="1150" width="${W}" height="${H-1150}" fill="url(#flr)"/><ellipse cx="540" cy="1170" rx="520" ry="40" fill="#E3B62F" opacity=".12"/>`;
 for(let i=0;i<14;i++){o+=`<circle cx="${40+i*78}" cy="1150" r="7" fill="${i%2?'#E3B62F':'#fff'}" opacity="${.4+.6*((Math.floor(t*6)+i)%2)}"/>`}
 return o;}
function screen(x,y,w,h,inner){return `<g transform="translate(${x},${y})"><rect x="-8" y="-8" width="${w+16}" height="${h+16}" rx="26" fill="#000" opacity=".5"/><rect width="${w}" height="${h}" rx="20" fill="#0b1640" stroke="#D4AF37" stroke-width="4"/>${inner}</g>`}
function stamp(t,label,col,x,y){const p=back(t/0.35);return `<g transform="translate(${x},${y}) rotate(-12) scale(${2.4-1.4*p})" opacity="${cl(t/0.15)}"><rect x="-230" y="-80" width="460" height="160" rx="18" fill="none" stroke="${col}" stroke-width="14"/><text x="0" y="40" text-anchor="middle" font-family="Inter" font-weight="900" font-size="120" fill="${col}" letter-spacing="8">${label}</text></g>`}
function mythScene(n,t,d,talk,myth,fact){const ft=cl((t-d*0.45)/0.4);
 let o=studio(t,1)+screen(110,360,860,470,`<text x="430" y="70" text-anchor="middle" font-family="Inter" font-weight="800" font-size="34" fill="#E3B62F" letter-spacing="6">MYTH ${n} OF 3</text>
 <text x="430" y="190" text-anchor="middle" font-family="Inter" font-weight="800" font-size="${ft<.5?56:50}" fill="#fff">${ft<.5?myth[0]:fact[0]}</text><text x="430" y="260" text-anchor="middle" font-family="Inter" font-weight="800" font-size="${ft<.5?56:50}" fill="${ft<.5?'#fff':'#2fbf71'}">${ft<.5?myth[1]:fact[1]}</text>
 ${ft>.5?`<circle cx="430" cy="370" r="46" fill="#2fbf71"/><path d="M408 370 l16 16 l28 -30" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`:''}`);
 o+=person(Object.assign({},HOST,{x:320,y:1170,s:1.25,t,talk,armR:ft>.5?20:12,elR:ft>.5?130:30,armL:10,look:.6,mood:ft>.5?'smile':'neutral'}));
 o+=`<g transform="translate(790,1080)"><rect x="-120" y="-30" width="240" height="140" rx="20" fill="#14214f" stroke="#D4AF37" stroke-width="4"/><circle cx="0" cy="-30" r="${60-8*Math.max(0,sin(t*10))*(t<d*0.45?1:0)}" fill="${ft>.5?'#2fbf71':'#E5323E'}"/></g>`;
 o+='</svg>';
 if(t<d*0.45+0.35&&t>0.4)o+=`<svg width="${W}" height="${H}" style="position:absolute;inset:0">${stamp(t-0.4,'MYTH','#E5323E',700,960)}</svg>`;
 if(ft>0)o+=`<svg width="${W}" height="${H}" style="position:absolute;inset:0" opacity="${1-cl((t-d*0.45-1.2)/0.3)}">${stamp(t-d*0.45,'FACT','#2fbf71',700,960)}</svg>`;
 return o;}
const SCN={
 hook(t,d,talk){const f=Math.floor(t*8)%2;return studio(t,f)+`<text x="540" y="560" text-anchor="middle" font-family="Inter" font-weight="900" font-size="${190+10*sin(t*6)}" fill="#E5323E" opacity="${.9}">3</text>
  <rect x="80" y="640" width="920" height="520" rx="40" fill="#050a22" opacity=".82" stroke="#D4AF37" stroke-width="4"/>
  <text text-anchor="middle" font-family="Inter" font-weight="800" fill="#fff" font-size="72"><tspan x="540" y="760">Three things people</tspan><tspan x="540" y="850">believe about trading</tspan><tspan x="540" y="940">software.</tspan></text>
  <text x="540" y="1080" text-anchor="middle" font-family="Inter" font-weight="900" font-size="${84*ease((t-1.8)/.3)}" fill="#E3B62F">All three are wrong.</text></svg>`},
 m1(t,d,talk){return mythScene(1,t,d,talk,['You need to be','an expert.'],['FTM MACHINE','does the work.'])},
 m2(t,d,talk){return mythScene(2,t,d,talk,['The software','holds your money.'],['Your money stays','in your name.'])},
 m3(t,d,talk){return mythScene(3,t,d,talk,["You can't stop it",'once it starts.'],['Pause any time,','with one tap.'])},
 cta(t,d,talk){const p=1+.04*sin(t*5);return studio(t,1)+person(Object.assign({},GUEST,{x:300,y:1170,s:1.2,t,prop:'phone',armR:12,elR:118,look:.5,mood:'smile'}))+person(Object.assign({},HOST,{x:780,y:1170,s:1.2,t,talk,armL:20,elL:120,look:-.5}))+
  `<g transform="translate(540,520)"><rect x="-420" y="-150" width="840" height="300" rx="40" fill="#050a22" opacity=".85" stroke="#D4AF37" stroke-width="4"/><text x="0" y="-50" text-anchor="middle" font-family="Inter" font-weight="800" font-size="60" fill="#fff">The markets won't wait.</text>
  <g transform="scale(${p})"><rect x="-210" y="0" width="420" height="104" rx="52" fill="#E5323E"/><text x="0" y="68" text-anchor="middle" font-family="Inter" font-weight="800" font-size="52" fill="#fff">Start free</text></g></g></svg>`}
};
