/* ============================================================
   dolarbsas · núcleo puro
   Sin DOM, sin red. Cargado por index.html y testeado en Node
   (node test.js). Si tocás algo acá, corré los tests.
   ============================================================ */
'use strict';

var DEFAULT_CARD_K = 0.97;
var EMPATE_PCT = 0.3; // diferencia menor a esto se considera empate

function cashRateFrom(blue){ return num(blue && blue.compra); }

function mepRefFrom(bolsa){
  var c=num(bolsa&&bolsa.compra), v=num(bolsa&&bolsa.venta);
  if(!isFinite(c)||!isFinite(v)) return NaN;
  return (c+v)/2;
}

function cardRateFrom(bolsa,k){
  var mep=mepRefFrom(bolsa);
  var kk=isFinite(num(k))?num(k):DEFAULT_CARD_K;
  return mep*kk;
}

function usdToArs(usd,rate){ var u=num(usd),r=num(rate); if(!valid(u)||!valid(r)||r<=0) return NaN; return u*r; }
function arsToUsd(ars,rate){ var a=num(ars),r=num(rate); if(!valid(a)||!valid(r)||r<=0) return NaN; return a/r; }

function compareMethods(cashRate,cardRate){
  var c=num(cashRate),t=num(cardRate);
  if(!valid(c)||!valid(t)||c<=0||t<=0) return {mejor:null,ahorroPct:NaN};
  var hi=Math.max(c,t),lo=Math.min(c,t);
  var pct=((hi-lo)/hi)*100;
  if(pct<EMPATE_PCT) return {mejor:'empate',ahorroPct:pct};
  return {mejor: c>t?'efectivo':'tarjeta', ahorroPct:pct};
}

function ageHours(fecha,now){
  var t=Date.parse(fecha); if(isNaN(t)) return NaN;
  var ref=(now instanceof Date)?now.getTime():(typeof now==='number'?now:Date.now());
  return (ref-t)/3600000;
}

function isStale(fecha,maxHours,now){ var h=ageHours(fecha,now); if(isNaN(h)) return true; return h>num(maxHours); }

/* --- frescura consciente del mercado ---
   El blue no cotiza sábados ni domingos: un dato del viernes a la
   tarde sigue siendo "el último posible" durante todo el finde.
   lastBusinessDayStart devuelve la medianoche del último día hábil
   (hoy mismo si es día hábil). Un dato es stale-de-mercado solo si
   es anterior a ese punto. */
function lastBusinessDayStart(now){
  var ref=(now instanceof Date)?new Date(now.getTime())
        :(typeof now==='number'?new Date(now):new Date());
  while(ref.getDay()===0||ref.getDay()===6){ ref.setDate(ref.getDate()-1); }
  ref.setHours(0,0,0,0);
  return ref;
}
function isStaleMarket(fecha,now){
  var t=Date.parse(fecha); if(isNaN(t)) return true;
  return t < lastBusinessDayStart(now).getTime();
}

function deriveK(pesos,usd,mepRef){
  var p=num(pesos),u=num(usd),m=num(mepRef);
  if(!valid(p)||!valid(u)||!valid(m)||p<=0||u<=0||m<=0) return NaN;
  return (p/u)/m;
}
function commissionToK(pct){ var c=num(pct); if(!valid(c)) return NaN; return 1/(1+c/100); }

function usdToPen(usd,penRate){ var u=num(usd),r=num(penRate); if(!valid(u)||!valid(r)||r<=0) return NaN; return u*r; }
function penRateFrom(json){
  if(!json||typeof json!=='object') return NaN;
  var rates=json.rates; if(!rates||typeof rates!=='object') return NaN;
  var p=num(rates.PEN); return valid(p)&&p>0?p:NaN;
}

function cuevaPct(offer,ref){ var o=num(offer),r=num(ref); if(!valid(o)||!valid(r)||r<=0||o<=0) return NaN; return ((o-r)/r)*100; }
function cuevaNivel(pct){ var p=num(pct); if(!valid(p)) return null; if(p>=-0.5) return 'bueno'; if(p>=-3) return 'aceptable'; return 'bajo'; }

function num(x){
  if(typeof x==='number') return x;
  if(typeof x==='string'){ var s=x.trim().replace(/\s+/g,'').replace(',','.'); if(s==='') return NaN; return Number(s); }
  return NaN;
}
function valid(n){ return typeof n==='number' && isFinite(n); }
function fmtArs(n){ if(!valid(n)) return '—'; return new Intl.NumberFormat('es-AR',{maximumFractionDigits:0}).format(Math.round(n)); }
function fmtUsd(n){ if(!valid(n)) return '—'; return new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n); }
function fmtRate(n){ if(!valid(n)) return '—'; return new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}).format(n); }
function fmtPen(n){ if(!valid(n)) return '—'; return new Intl.NumberFormat('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n); }

/* --- registro de gastos: constructor puro de entradas --- */
function buildEntry(opts){
  // opts: {tipo:'cambio'|'pago', metodo, amount, cash, card, mepRef, k, pen, nota, ts}
  if(!opts||typeof opts!=='object') return null;
  var amount=num(opts.amount);
  if(!valid(amount)||amount<=0) return null;
  var tipo=opts.tipo==='cambio'?'cambio':'pago';
  var e={
    ts: opts.ts || new Date().toISOString(),
    tipo: tipo,
    metodo: tipo==='pago' ? (opts.metodo==='tarjeta'?'tarjeta':'efectivo') : null,
    nota: (typeof opts.nota==='string' && opts.nota.trim()!=='') ? opts.nota.trim() : null,
    tasas: {
      blueCompra: valid(num(opts.cash))?num(opts.cash):null,
      mepRef: valid(num(opts.mepRef))?num(opts.mepRef):null,
      k: valid(num(opts.k))?num(opts.k):null,
      tarjeta: valid(num(opts.card))?num(opts.card):null,
      pen: valid(num(opts.pen))?num(opts.pen):null
    }
  };
  if(tipo==='cambio'){
    e.usd=amount;
    e.ars=usdToArs(amount, opts.cash);
    e.ars=valid(e.ars)?Math.round(e.ars):null;
  }else{
    e.ars=Math.round(amount);
    var rate = e.metodo==='tarjeta' ? opts.card : opts.cash;
    var u=arsToUsd(amount, rate);
    e.usd=valid(u)?Math.round(u*100)/100:null;
  }
  if(valid(num(opts.pen)) && valid(num(e.usd))){
    e.pen=Math.round(usdToPen(e.usd, opts.pen)*100)/100;
  }else{ e.pen=null; }
  return e;
}

function logTotals(log){
  var t={pagos:0, cambios:0, usdGastado:0, usdCambiado:0};
  if(!Array.isArray(log)) return t;
  for(var i=0;i<log.length;i++){
    var e=log[i]; if(!e) continue;
    if(e.tipo==='pago'){ t.pagos++; if(valid(num(e.usd))) t.usdGastado+=num(e.usd); }
    else if(e.tipo==='cambio'){ t.cambios++; if(valid(num(e.usd))) t.usdCambiado+=num(e.usd); }
  }
  t.usdGastado=Math.round(t.usdGastado*100)/100;
  t.usdCambiado=Math.round(t.usdCambiado*100)/100;
  return t;
}

/* exportar para Node (tests); en navegador quedan como globals */
if(typeof module!=='undefined' && module.exports){
  module.exports={
    DEFAULT_CARD_K:DEFAULT_CARD_K, EMPATE_PCT:EMPATE_PCT,
    cashRateFrom:cashRateFrom, mepRefFrom:mepRefFrom, cardRateFrom:cardRateFrom,
    usdToArs:usdToArs, arsToUsd:arsToUsd, compareMethods:compareMethods,
    ageHours:ageHours, isStale:isStale, lastBusinessDayStart:lastBusinessDayStart, isStaleMarket:isStaleMarket,
    deriveK:deriveK, commissionToK:commissionToK,
    usdToPen:usdToPen, penRateFrom:penRateFrom,
    cuevaPct:cuevaPct, cuevaNivel:cuevaNivel,
    num:num, valid:valid,
    buildEntry:buildEntry, logTotals:logTotals
  };
}
