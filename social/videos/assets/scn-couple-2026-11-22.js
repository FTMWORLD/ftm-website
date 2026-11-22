/* Couple video 22 Nov 13:00: "How many times did you check?" (emotion). Photos: ChatGPT pack in ../assets/2026-11-22-couple/. Figures: live account 1-21 Nov (dayresult 2026-11-21). */
const C=n=>'../assets/2026-11-22-couple/c-00'+n+'.jpg';
const open_=()=>`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0">`;
const TX=(x,y,s,c,txt,w,o)=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="Inter" font-weight="${w||900}" font-size="${s}" fill="${c}" opacity="${o==null?1:o}" style="paint-order:stroke" stroke="rgba(5,10,34,.55)" stroke-width="${Math.round(s/9)}">${txt}</text>`;
function ph(n,t,o){return IMG(C(n),t,Object.assign({z0:1.03,dz:0.08,d:5},o||{}))+SHADE(.45,.85)}
function pill(t,txt,y,col,tc){const a=back(t/0.4);return `<g transform="translate(540,${y}) scale(${a})"><rect x="-400" y="-50" width="800" height="100" rx="50" fill="${col}"/>${TX(0,17,46,tc||'#0b1640',txt).replace(/stroke="[^"]*"/,'stroke="none"')}</g>`}
function big(t,txt,y,col,s){const a=back(t/0.35);return `<g transform="translate(540,${y}) scale(${0.6+0.4*a})" opacity="${cl(t/0.15)}">${TX(0,0,s||150,col,txt)}</g>`}
function cnt(t,a,b,dec){const v=a+(b-a)*ease(t);return v.toFixed(dec||0)}
function flash(t){return t<0.18?`<rect width="${W}" height="${H}" fill="#fff" opacity="${0.45*(1-t/0.18)}"/>`:''}
const SCN={
 hook(t){return ph(0,t,{dx:-20})+open_()+TX(540,1010,40,'#E3B62F','BE HONEST',800,cl(t/0.3))+TX(540,1110,76,'#fff','How many times',900,cl(t/0.3))+TX(540,1200,76,'#fff','did you check',900,cl((t-0.15)/0.3))+TX(540,1290,76,'#E3B62F','the markets?',900,cl((t-0.3)/0.3))+'</svg>'},
 confess(t){return ph(1,t)+open_()+big(t,cnt(cl(t/1.2),0,50)+'×','1150','#E3B62F',200)+TX(540,1240,44,'#fff','checks in one week',800,cl((t-0.4)/0.3))+'</svg>'},
 ask(t){return ph(1,t+1.5)+open_()+TX(540,1180,64,'#fff','And how did that go?',900,cl(t/0.3))+'</svg>'},
 fear(t){return ph(2,t,{z0:1.08,dz:0.06})+open_()+pill(t-0.1,'FEAR: CLOSED TOO EARLY',1200,'#E5323E','#fff')+flash(t)+'</svg>'},
 anger(t){const sh=t<0.4?Math.sin(t*90)*8:0;return `<div style="position:absolute;inset:0;transform:translateX(${sh}px)">`+ph(3,t,{z0:1.1,dz:0.08})+'</div>'+open_()+pill(t-0.1,'ANGER: BACK IN TOO LATE',1200,'#E5323E','#fff')+'</svg>'},
 machine(t){return ph(4,t,{dx:20})+open_()+big(t,cnt(cl(t/1.2),0,94),1100,'#2fbf71',170)+TX(540,1180,44,'#fff','trades this month',800,cl((t-0.3)/0.3))+(t>1.6?pill(t-1.6,'0 FEAR · 0 ANGER · SAME RULES',1270,'#E3B62F'):'')+'</svg>'},
 andq(t){return ph(5,t)+open_()+TX(540,1180,90,'#fff','And?',900,cl(t/0.2))+'</svg>'},
 proof(t){return ph(5,t+0.8)+open_()+TX(540,980,40,'#E3B62F','LIVE ACCOUNT · NOVEMBER SO FAR',800,cl(t/0.3))+big(t,'+'+cnt(cl(t/1.3),0,10.45,2)+'%',1130,'#2fbf71',170)+(t>1.4?pill(t-1.4,'8 profit days · 7 loss days',1260,'rgba(255,255,255,.92)'):'')+'</svg>'},
 what(t){return ph(5,t+3)+open_()+TX(540,1180,64,'#fff','So what do I do now?',900,cl(t/0.3))+'</svg>'},
 twist(t){return ph(6,t,{dx:-20})+open_()+pill(t-0.2,'PUT THE PHONE DOWN 😄',1200,'#E3B62F')+'</svg>'},
 cta1(t){return ph(7,t)+open_()+TX(540,1130,58,'#fff','Let FTM MACHINE',900,cl(t/0.3))+TX(540,1210,58,'#E3B62F','do the checking.',900,cl((t-0.2)/0.3))+'</svg>'},
 cta2(t){const p=1+.04*Math.sin(t*5);return ph(7,t+2)+open_()+`<g transform="translate(540,1080)"><rect x="-420" y="-170" width="840" height="340" rx="40" fill="#050a22" opacity=".85" stroke="#D4AF37" stroke-width="4"/>${TX(0,-70,50,'#fff','Every evening at 6 p.m.:',800).replace(/stroke="rgba[^"]*"/,'stroke="none"')}${TX(0,-5,50,'#E3B62F','yesterday\'s real result.',800).replace(/stroke="rgba[^"]*"/,'stroke="none"')}<g transform="translate(0,95) scale(${p})"><rect x="-230" y="-55" width="460" height="110" rx="55" fill="#E5323E"/>${TX(0,18,52,'#fff','Start free').replace(/stroke="rgba[^"]*"/,'stroke="none"')}</g></g>`+'</svg>'}
};
