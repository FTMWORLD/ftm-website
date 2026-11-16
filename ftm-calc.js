(function(root){
  function num(s){ return (s===null||s===undefined) ? null : parseFloat(s); }

  function mapAccount(a){
    return {
      name: a.preview ? 'FTM' : (a.name || (a.broker && a.broker.code) || 'Trading account'),
      number: a.account_number || (a.preview ? 'MASTER' : a.account_number),
      isPreview: a.preview===true,
      provider: a.broker && (a.broker.name || a.broker.code),
      server: a.server || null,
      balance: num(a.balance!=null?a.balance:(a.performance&&a.performance.balance)),
      equity: num(a.equity!=null?a.equity:(a.performance&&a.performance.equity)),
      marginFree: num(a.margin_free),
      lastReported: (function(){ var t=a.last_reported_at||(a.performance&&(a.performance.as_of||a.performance.updated_at||a.performance.last_reported_at))||a.updated_at; return t?Date.parse(t):null; })(),
      viewOnlyLabel: typeof a.view_only_label==='string' ? a.view_only_label.replace(/ - /g,' — ') : null,
      statusText: typeof a.status_text==='string' ? a.status_text : null,
      canControl: a.is_trading!==undefined,
      isMaster: a.is_master===true || a.view_only===true || a.view_only==='true' || /^VIEW_ONLY/i.test(a.status_reason||'') || a.account_role==='MASTER' || /^view_?only$/i.test(a.display_status||'') || /^view_?only$/i.test(a.status||'') || /^view_?only$/i.test(a.status_reason||''),
      active: (a.is_trading===true) || (a.is_trading==null && a.display_status === 'ACTIVE' && (!a.status_reason || a.status_reason === 'OK')),
      displayStatus: a.display_status,
      statusReason: a.status_reason,
      accountId: a.account_id,

      floating: num(a.floating_profit!=null?a.floating_profit:(a.performance&&a.performance.floating_profit)),
      currency: a.currency || null,
      openPositions: a.open_positions || 0,
      deposits: num(a.deposits), withdrawals: num(a.withdrawals),
      riskTier: a.risk_tier || null,
      statusSignature: a.status_signature || null,

      validationReason: a.validation_reason || null,
      serverHint: typeof a.broker_server_hint==='string' ? a.broker_server_hint : null,
      brokerTradeDisabled: a.broker_trade_disabled===true || a.trade_allowed===false,
      lastValidatedAt: a.last_validated_at ? Date.parse(a.last_validated_at) : null,

      tradeMode: a.trade_mode || null,

      validationStartedAt: a.validation_started_at ? Date.parse(a.validation_started_at) : null,
      validationAttempts: (a.validation_attempts!=null && isFinite(+a.validation_attempts)) ? +a.validation_attempts : null,
      validationWaitingSeconds: (a.validation_waiting_seconds!=null && isFinite(+a.validation_waiting_seconds)) ? +a.validation_waiting_seconds : null,
      validationDelayReason: a.validation_delay_reason || null,
      validationDelayText: (typeof a.validation_delay_text==='string' && a.validation_delay_text) ? a.validation_delay_text : null,
      canRetryPassword: !!a.can_retry_password,
      passwordTriesLeft: (a.password_tries_left!=null) ? a.password_tries_left : null
    };
  }

  function px(v){
    if(v==null || v==='') return null;
    var n=Number(v);
    return isFinite(n) ? String(+n.toFixed(5)) : String(v);
  }
  function mapExecution(e){
    return {
      symbol: e.symbol || e.market || null, market: e.market || null,
      copiedByFtm: e.copied_by_ftm===true ? true : (e.copied_by_ftm===false ? false : null),
      dir: e.side || null,
      lots: num(e.volume),
      openTime: e.opened_at ? Date.parse(e.opened_at) : null,
      closeTime: e.closed_at ? Date.parse(e.closed_at) : null,

      open: px(e.open_price),
      close: px(e.close_price),
      pl: num(e.net_profit),
      commission: num(e.commission),
      swap: num(e.swap),
      closeReason: e.close_reason || null,
      closedBy: e.closed_by || null,
      label: (typeof e.label==='string' && e.label) ? e.label : (e.welcome_trade===true ? 'Welcome trade' : null),
      positionRef: e.position_ref || null,
      partialCloses: e.partial_closes || 0,
      closingDealRef: e.closing_deal_ref || null
    };
  }

  function mapStats(j, accountId){
    if(!j || j.pending) return null;
    var __acc=accountId, HL=(j.history||[]).length, tq=function(r){ return Date.parse(r&&(r.time||r.closed_at||r.executed_at||r.at||r.timestamp||r.date||r.opened_at)||'')||0; }, asc=HL>1 && tq(j.history[0])<tq(j.history[HL-1]); (j.history||[]).forEach(function(r,i){ r.__s=asc?i+1:HL-i; });
    var bySeq=function(a,b){ return (a.t-b.t)||((a.seq||0)-(b.seq||0)); };
    var flows=(j.history||[]).filter(function(r){ return String(r.type||r.deal_type||'').toUpperCase()==='BALANCE'; }).map(function(r){
      var t=r.time||r.closed_at||r.executed_at||r.at||r.timestamp||r.date||r.opened_at;
      var amt=num(r.net!=null?r.net:(r.profit!=null?r.profit:(r.amount!=null?r.amount:r.net_profit)));
      return {t:t?Date.parse(t):null, amt:amt, seq:r.__s};
    }).filter(function(f){ return f.t && f.amt; }).sort(bySeq);
    var tOf=function(r){ var t=r.time||r.closed_at||r.executed_at||r.at||r.timestamp||r.date||r.opened_at; return t?Date.parse(t):null; };
    var kindOf=function(r){ var T=String(r.type||r.deal_type||'').toUpperCase().replace(/^DEAL_TYPE_/,'');
      if(T==='BALANCE') return 'flow'; if(T==='CREDIT') return 'credit';
      if(/^(CHARGE|CORRECTION|BONUS|COMMISSION|INTEREST|DIVIDEND|TAX|FEE|ADJUST|AGENT)/.test(T)) return 'adj';
      return 'trade'; };
    var rowAmt=function(r){ return num(r.net!=null?r.net:(r.profit!=null?r.profit:(r.amount!=null?r.amount:r.net_profit))); };
    var adj=(j.history||[]).filter(function(r){ var k=kindOf(r); return k==='adj'||k==='credit'; }).map(function(r){ return {t:tOf(r), amt:rowAmt(r), kind:kindOf(r), type:String(r.type||r.deal_type||'').toUpperCase().replace(/^DEAL_TYPE_/,''), seq:r.__s}; })
      .filter(function(x){ return x.t && x.amt; }).sort(bySeq);
    var deals=(j.history||[]).filter(function(r){ return kindOf(r)==='trade'; }).map(function(r){
      var pl=num(r.net!=null?r.net:(r.net_profit!=null?r.net_profit:r.profit)); if(pl!=null && r.net==null && r.net_profit==null){ pl+= (num(r.commission)||0)+(num(r.swap)||0)+(num(r.fee)||0); }
      return {t:tOf(r), seq:r.__s, pl:pl, cost:(num(r.commission)||0)+(num(r.swap)||0)+(num(r.fee)||0), open:String(r.entry||'').toUpperCase()==='IN', symbol:r.symbol||null, side:String(r.type||r.deal_type||'').toUpperCase(), lots:num(r.volume), ticket:r.ticket||null, pos:r.position_ref||null, price:r.price!=null?px(r.price):null};
    }).filter(function(x){ return x.t && x.pl!=null; }).sort(bySeq);
    return { deposits:num(j.deposits_total), withdrawals:num(j.withdrawals_total), flows:flows, deals:deals, adj:adj, historyTotal:num(j.history_total),
             maxDDPct:num(j.max_drawdown_pct), growthPct:num(j.growth_pct), startBalance:num(j.start_balance), startBalanceAt:j.start_balance_at||null, initialDeposit:num(j.initial_deposit), initialDepositAt:j.initial_deposit_at||null, firstAt:(j.history||[]).reduce(function(a,r){ var t=tOf(r); return t&&(a==null||t<a)?t:a; },null),
             closedPl:num(j.closed_pl_total), tradesClosed:num(j.trades_closed), wins:num(j.wins), losses:num(j.losses), winRatePct:num(j.win_rate_pct), source:j.data_source||null,
             rows:(j.history||[]).length, peakBalance:num(j.peak_balance), peakBalanceAt:j.peak_balance_at||null, peakEquity:num(j.peak_equity), ddBasis:j.max_drawdown_basis||null,
             ddClosedPct:num(j.max_drawdown_closed_balance_pct!=null?j.max_drawdown_closed_balance_pct:(j.max_drawdown_closed_balance&&j.max_drawdown_closed_balance.pct)),
             ddClosed:j.max_drawdown_closed_balance||null, ddEqObj:j.max_drawdown||null, accountId:__acc, feesAdj:num(j.fees_and_adjustments), creditTotal:num(j.credit_total),
             split:(j.split&&typeof j.split==='object')?j.split:null, drawdowns:Array.isArray(j.drawdowns)?j.drawdowns:null, initialDepositSource:j.initial_deposit_source||null, riskScore:num(j.risk_score), riskVs:j.risk_score_vs_range||null, riskRange:j.expected_range||null, riskHistory:Array.isArray(j.risk_score_history)?j.risk_score_history:[], riskParts:(j.risk_score_parts&&typeof j.risk_score_parts==='object')?j.risk_score_parts:null };
  }
  function build(ctx){
    var F={data:ctx.data, viewedAccount:function(){ return ctx.live||null; }, es:function(){ return ctx.es||null; }, flows:function(){ return ctx.flows||[]; }};
    var d=F.data, acct=d.account, closed=d.closed.slice().sort(function(a,b){return a.closeTime-b.closeTime;});
    var openT=d.open||[];

    var covered = closed.filter(function(t){ return t.pl!==null && t.pl!==undefined; });
    var lotsCovered = closed.filter(function(t){ return t.lots!==null && t.lots!==undefined; });

    var netPL=0, grossProfit=0, grossLoss=0, wins=0, losses=0, lots=0, fees=0, durMs=0;
    covered.forEach(function(t){
      netPL+=t.pl;
      fees+=(t.commission||0)+(t.swap||0);
      durMs+=(t.closeTime-t.openTime);
      if(t.pl>0){grossProfit+=t.pl;wins++;} else if(t.pl<0){grossLoss+=Math.abs(t.pl);losses++;}
    });
    lotsCovered.forEach(function(t){ lots+=t.lots; });

    var liveAcct = (F.viewedAccount && F.viewedAccount()) || (d.accounts||[]).filter(function(a){return a.active;})[0];
    var balance, floating, equity;
    if(liveAcct && liveAcct.balance!=null){
      balance = liveAcct.balance;
      floating = liveAcct.floating!=null ? liveAcct.floating : openT.reduce(function(a,t){return a+(t.pl||0);},0);
      equity = liveAcct.equity!=null ? liveAcct.equity : balance+floating;
    } else {
      balance = acct.deposits - acct.withdrawals + netPL;
      floating = openT.reduce(function(a,t){return a+(t.pl||0);},0);
      equity = balance + floating;
    }

    var flows=F.flows().filter(function(f){return f.t&&f.amt;});
    if(!flows.length && (acct.deposits>0 || acct.withdrawals>0)){
      var firstT=covered.length?covered[0].openTime:Date.now(), lastT=covered.length?covered[covered.length-1].closeTime:Date.now();
      if(acct.deposits>0) flows.push({t:firstT-1, amt:acct.deposits});
      if(acct.withdrawals>0) flows.push({t:lastT+1, amt:-acct.withdrawals});
    }
    var flowSum=flows.reduce(function(s,f){return s+f.amt;},0);
    var anchor = (liveAcct && liveAcct.balance!=null)
      ? liveAcct.balance - covered.reduce(function(s,t){return s+t.pl;},0) - flowSum
      : acct.deposits - acct.withdrawals - flowSum;
    var es=F.es(), esComplete=!!(es && (es.historyTotal==null || (es.rows||(es.deals.length+(es.flows||[]).length))>=es.historyTotal*0.98)), useDeals=!!(es && es.deals && es.deals.filter(function(x){return !x.open;}).length>=covered.length && es.deals.length && esComplete);
    var plEvents=useDeals ? es.deals.map(function(x){return {t:x.t,pl:x.pl,open:x.open,s:x.seq,pos:x.pos};}) : covered.map(function(t){return {t:t.closeTime,pl:t.pl};});
    if(useDeals){ var dealSum=es.deals.reduce(function(a,x){return a+x.pl;},0); anchor += covered.reduce(function(s,t){return s+t.pl;},0) - dealSum; netPL=dealSum; fees=es.deals.reduce(function(a,x){return a+(x.cost||0);},0); }
    var adjEv=useDeals?(es.adj||[]):[], adjSum=adjEv.reduce(function(a,x){return a+x.amt;},0); if(useDeals) anchor-=adjSum;
    var ev=plEvents.concat(flows.map(function(f){return {t:f.t,flow:f.amt,s:f.seq};}), adjEv.map(function(x){return {t:x.t,flow:x.amt,adj:true,cr:x.kind==='credit',s:x.seq};})).sort(function(a,b){return (a.t-b.t)||((a.s||0)-(b.s||0));});
    var gap=0; if(useDeals && es && (es.startBalance!=null || (flows.length && ev.length && ev[0].flow>0))){ var adjIn=adjEv.reduce(function(a,x){return a+(x.kind==='adj'?x.amt:0);},0), crIn=adjSum-adjIn, expA=(es.startBalance||0)+((es.feesAdj||0)-adjIn)+((es.creditTotal||0)-crIn), tol0=Math.max(5, Math.abs(balance)*0.002); if(Math.abs(anchor-expA)>tol0){ gap=anchor-expA; anchor=expA; } }
    var t0=ev.length?Math.min(ev[0].t,covered.length?covered[0].openTime:ev[0].t):Date.now();
    var run = anchor, curve=[{t:t0, v:run}], pnlSeries=[0], peakAdj=[];
    var ddRun=anchor, ddPeak=anchor, ddMaxAbs=0, ddMaxPct=0;
    ev.forEach(function(e){
      if(e.flow && e.adj && !e.cr){ run+=e.flow; ddRun+=e.flow; curve.push({t:e.t, v:run, flow:e.flow, adj:true}); if(ddRun>ddPeak) ddPeak=ddRun; var da=ddPeak-ddRun; if(da>ddMaxAbs){ ddMaxAbs=da; ddMaxPct=ddPeak>0?da/ddPeak*100:0; } return; }
      if(e.flow){ run+=e.flow; ddRun+=e.flow; ddPeak+=e.flow; curve.push(e.adj?{t:e.t, v:run, flow:e.flow, adj:true, cr:true}:{t:e.t, v:run, flow:e.flow}); return; }
      run+=e.pl; ddRun+=e.pl; curve.push(e.pos?{t:e.t, v:run, pos:e.pos}:{t:e.t, v:run});
      if(ddRun>ddPeak) ddPeak=ddRun; var dr=ddPeak-ddRun; if(dr>ddMaxAbs){ ddMaxAbs=dr; ddMaxPct=ddPeak>0?dr/ddPeak*100:0; }
    });
    var curveIncomplete = covered.length < closed.length;
    var curveStart = covered.length ? covered[0].closeTime : null;

    function drawdown(series){
      var peak=series[0], maxAbs=0, maxPct=0;
      series.forEach(function(v){
        if(v>peak)peak=v;
        var drop=peak-v;
        if(drop>maxAbs){maxAbs=drop; maxPct=peak>0?(drop/peak*100):0;}
      });
      return {abs:maxAbs, pct:maxPct};
    }
    var balSeries=curve.map(function(p){return p.v;});
    var ddBal=flows.length?{abs:ddMaxAbs,pct:ddMaxPct}:drawdown(balSeries);
    var eqDrop=Math.max(0,ddPeak-(ddRun+(equity-balance)));
    var ddEq=flows.length?(eqDrop>ddMaxAbs?{abs:eqDrop,pct:ddPeak>0?eqDrop/ddPeak*100:0}:ddBal):drawdown(balSeries.concat([equity]));

    if(es && es.maxDDPct!=null && es.maxDDPct>ddEq.pct){ var pk=Math.max.apply(null,balSeries); ddEq={abs:pk*es.maxDDPct/100, pct:es.maxDDPct, engine:true}; }
    var cT=[], cF=[], cP=[], fac=1, cum=0;
    for(var ci=1; ci<curve.length; ci++){ var cp=curve[ci], cq=curve[ci-1]; if(!cp.flow){ var cd=cp.v-cq.v; if(cq.v>0) fac*=(1+cd/cq.v); cum+=cd; } cT.push(cp.t); cF.push(fac); cP.push(cum); }
    var atT=function(t){ var lo=0, hi=cT.length; while(lo<hi){ var mid=(lo+hi)>>1; if(cT[mid]<t) lo=mid+1; else hi=mid; } return lo ? [cF[lo-1],cP[lo-1]] : [1,0]; };
    var z9=function(x){ return Math.abs(x)<1e-9?0:x; }, seg=function(a,b){ var A=atT(a==null?-Infinity:a), B=atT(b==null?Infinity:b); return {pl:z9(B[1]-A[1]), pct:z9((B[0]/A[0]-1)*100)}; };
    var balAtT=function(t){ var lo=0, hi=curve.length; while(lo<hi){ var mid=(lo+hi)>>1; if(curve[mid].t<t) lo=mid+1; else hi=mid; } return lo ? curve[lo-1].v : curve[0].v; };
    var gainPct=seg(null,null).pct;

    var capIn=anchor+flows.filter(function(f){return f.amt>0;}).reduce(function(s,f){return s+f.amt;},0);
    var absPct=capIn>0 ? (netPL/capIn*100) : 0;

    var n=covered.length;
    var covSum=covered.reduce(function(a,t){return a+t.pl;},0), expectancy = n? covSum/n : 0;
    var mean=expectancy, variance=0;
    covered.forEach(function(t){ variance+=Math.pow(t.pl-mean,2); });
    var sd = n>1 ? Math.sqrt(variance/(n-1)) : 0;
    var sharpe=null, sortino=null, annual=null;
    if(curve.length>1){ var sd0=new Date(curve[1].t); sd0.setHours(0,0,0,0); var nDays=Math.floor((Date.now()-sd0.getTime())/864e5);
      if(nDays>=30){ var dr=[], f0=1; for(var di=1; di<=nDays+1; di++){ var de=new Date(sd0); de.setDate(de.getDate()+di); var f1=atT(de.getTime())[0]; dr.push(f1/f0-1); f0=f1; }
        var dm=dr.reduce(function(a,x){return a+x;},0)/dr.length, dv=dr.reduce(function(a,x){return a+(x-dm)*(x-dm);},0)/(dr.length-1); sharpe=dv>0?dm/Math.sqrt(dv)*Math.sqrt(365):null;
        var dd2=dr.reduce(function(a,x){return a+(x<0?x*x:0);},0)/dr.length; sortino=dd2>0?dm/Math.sqrt(dd2)*Math.sqrt(365):null; }
      if(nDays>=90) annual=(Math.pow(1+gainPct/100,365/nDays)-1)*100; }

    var yr=new Date().getFullYear(), ySeg=seg(new Date(yr,0,1).getTime(), null);
    var yearPL=ySeg.pl, yearPct=ySeg.pct;

    var sEv=covered.map(function(t){return {t:t.closeTime,pl:t.pl};}).sort(function(a,b){return a.t-b.t;}), streakTrades=0, bestTrades=0, runT=0;
    sEv.forEach(function(e){ if(e.pl>0){ runT++; if(runT>bestTrades) bestTrades=runT; } else if(e.pl<0){ runT=0; } });
    for(var i=sEv.length-1;i>=0;i--){ if(sEv[i].pl===0) continue; if(sEv[i].pl>0)streakTrades++; else break; }
    var sDay={}, sOrd=[];
    sEv.forEach(function(e){ var dt=new Date(e.t), k=dt.getFullYear()+'-'+(dt.getMonth()+1)+'-'+dt.getDate(); if(sDay[k]===undefined){ sDay[k]=0; sOrd.push(k); } sDay[k]+=e.pl; });
    var bestDays=0, runD=0, nowDays=0;
    sOrd.forEach(function(k){ if(sDay[k]>0){ runD++; if(runD>bestDays) bestDays=runD; } else if(sDay[k]<0){ runD=0; } });
    for(var jd=sOrd.length-1;jd>=0;jd--){ if(sDay[sOrd[jd]]===0) continue; if(sDay[sOrd[jd]]>0) nowDays++; else break; }

    var byDay={}, order=[];
    closed.forEach(function(t){
      var k=new Date(t.closeTime).toISOString().slice(0,10);
      if(byDay[k]===undefined){byDay[k]={known:null,hasUnknown:false};order.push(k);}
      if(t.pl!==null && t.pl!==undefined){ byDay[k].known=(byDay[k].known||0)+t.pl; }
      else { byDay[k].hasUnknown=true; }
    });
    var streakDays=nowDays;

    return {
      netPL:netPL, gainPct:gainPct, absPct:absPct, balance:balance, equity:equity,
      floating:floating, highest:Math.max.apply(null,balSeries), ddBal:ddBal, ddEq:ddEq,
      deposits:acct.deposits, withdrawals:acct.withdrawals, anchor:anchor, fees:fees, lots:lots,
      expectancy:expectancy, sd:sd, sharpe:sharpe, sortino:sortino, annual:annual,
      tradeX:(function(){ var P=covered.slice().sort(function(a,b){return a.closeTime-b.closeTime;}), bw=null, ww=null, rw=0, rl=0, mw=0, ml=0, L=0, Lw=0, S=0, Sw=0;
        P.forEach(function(t){ if(bw===null||t.pl>bw) bw=t.pl; if(ww===null||t.pl<ww) ww=t.pl; if(t.pl>0.004){ rw++; rl=0; if(rw>mw) mw=rw; } else if(t.pl<-0.004){ rl++; rw=0; if(rl>ml) ml=rl; }
          var d=String(t.dir||'').toUpperCase(); if(d==='BUY'){ L++; if(t.pl>0.004) Lw++; } else if(d==='SELL'){ S++; if(t.pl>0.004) Sw++; } });
        return {best:bw, worst:ww, winRun:mw, lossRun:ml, longs:L, longWon:Lw, shorts:S, shortWon:Sw}; })(),
      count:closed.length, coveredCount:covered.length, curveIncomplete:curveIncomplete, curveStart:curveStart,
      winRate: n?(wins/n*100):0, profitFactor: grossLoss>0?(grossProfit/grossLoss):null,
      avgWin: wins?grossProfit/wins:0, avgLoss: losses?grossLoss/losses:0,
      avgDurMs: n?durMs/n:0, curve:curve, byDay:byDay, dayOrder:order,
      streakDays:streakDays, streakTrades:streakTrades, bestDays:bestDays, bestTrades:bestTrades, plEvents:sEv,
      yearPL:yearPL, yearPct:yearPct, open:openT, seg:seg, balAt:balAtT, gap:gap,
      split:function(isFtm){ var f={pl:0,fac:1,n:0,w:0}, o={pl:0,fac:1,n:0,w:0};
        for(var si=1; si<curve.length; si++){ var cp=curve[si], cq=curve[si-1]; if(cp.flow) continue; var d=cp.v-cq.v, side=(cp.pos && isFtm(String(cp.pos)))?f:o; side.pl+=d; if(cq.v>0) side.fac*=(1+d/cq.v); }
        covered.forEach(function(t){ var side=(t.positionRef && isFtm(String(t.positionRef)))?f:o; side.n++; if(t.pl>0.004) side.w++; });
        var out=function(x){ return {closed_pl:x.pl, pl_pct:x.n?(x.fac-1)*100:null, trades_closed:x.n, win_rate_pct:x.n?x.w/x.n*100:null}; }; return {ftm:out(f), own:out(o)}; }
    };
  }
  var api={num:num, px:px, mapAccount:mapAccount, mapExecution:mapExecution, mapStats:mapStats, build:build};
  if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.FTMCalc=api;
})(typeof window!=='undefined'?window:this);
