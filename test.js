/* dolarbsas · tests del núcleo puro — correr con: node test.js */
'use strict';
var assert=require('assert');
var C=require('./core.js');

var n=0;
function ok(cond,msg){ n++; assert.ok(cond, msg); }
function eq(a,b,msg){ n++; assert.strictEqual(a,b,msg); }
function close(a,b,eps,msg){ n++; assert.ok(Math.abs(a-b)<(eps||1e-9), (msg||'')+' ('+a+' vs '+b+')'); }

/* --- num / valid --- */
eq(C.num('1450'),1450,'num string');
eq(C.num('1.450,5'.replace('.','')),1450.5,'num coma decimal');
ok(isNaN(C.num('')),'num vacío');
ok(isNaN(C.num(null)),'num null');
eq(C.num(' 12 '),12,'num con espacios');
ok(C.valid(3.14),'valid número');
ok(!C.valid(NaN),'valid NaN');
ok(!C.valid('3'),'valid string no');

/* --- tasas --- */
eq(C.cashRateFrom({compra:1450,venta:1470}),1450,'cash = blue compra');
ok(isNaN(C.cashRateFrom(null)),'cash sin blue');
eq(C.mepRefFrom({compra:1480,venta:1500}),1490,'mep = mid');
ok(isNaN(C.mepRefFrom({compra:'x',venta:1500})),'mep inválido');
close(C.cardRateFrom({compra:1480,venta:1500},0.97),1490*0.97,1e-9,'card = mep*k');
close(C.cardRateFrom({compra:1480,venta:1500},undefined),1490*C.DEFAULT_CARD_K,1e-9,'card k default');

/* --- conversiones --- */
eq(C.usdToArs(100,1450),145000,'usd→ars');
close(C.arsToUsd(145000,1450),100,1e-9,'ars→usd');
ok(isNaN(C.arsToUsd(100,0)),'div por cero');
close(C.usdToPen(100,3.55),355,1e-9,'usd→pen');
eq(C.penRateFrom({rates:{PEN:3.55}}),3.55,'pen desde json');
ok(isNaN(C.penRateFrom({rates:{}})),'pen faltante');

/* --- comparación con tolerancia de empate --- */
eq(C.compareMethods(1450,1400).mejor,'efectivo','gana efectivo');
eq(C.compareMethods(1400,1450).mejor,'tarjeta','gana tarjeta');
eq(C.compareMethods(1450,1450).mejor,'empate','empate exacto');
eq(C.compareMethods(1450,1448).mejor,'empate','empate por tolerancia (<0.3%)');
eq(C.compareMethods(1450,1444).mejor,'efectivo','fuera de tolerancia');
eq(C.compareMethods(null,1450).mejor,null,'sin datos');
close(C.compareMethods(1450,1400).ahorroPct,(50/1450)*100,1e-9,'ahorro pct');

/* --- frescura --- */
var lun=new Date('2026-07-20T12:00:00'); // lunes
var sab=new Date('2026-07-25T12:00:00'); // sábado
var dom=new Date('2026-07-26T12:00:00'); // domingo
close(C.ageHours('2026-07-20T10:00:00',lun),2,1e-6,'ageHours');
ok(C.isStale('2026-07-18T10:00:00',24,lun),'stale >24h');
ok(!C.isStale('2026-07-20T10:00:00',24,lun),'fresco <24h');
ok(C.isStale('fecha-rota',24,lun),'fecha inválida = stale');
eq(C.lastBusinessDayStart(sab).getDay(),5,'último hábil desde sábado = viernes');
eq(C.lastBusinessDayStart(dom).getDay(),5,'último hábil desde domingo = viernes');
eq(C.lastBusinessDayStart(lun).getDay(),1,'último hábil en lunes = hoy');
ok(!C.isStaleMarket('2026-07-24T16:00:00',dom),'dato del viernes no es stale el domingo');
ok(C.isStaleMarket('2026-07-23T16:00:00',dom),'dato del jueves sí es stale el domingo');
ok(C.isStaleMarket('2026-07-17T16:00:00',lun),'dato del viernes anterior es stale el lunes');

/* --- calibración --- */
close(C.deriveK(300000,205.5,1490),(300000/205.5)/1490,1e-9,'deriveK');
ok(isNaN(C.deriveK(0,205.5,1490)),'deriveK inválido');
close(C.commissionToK(3),1/1.03,1e-9,'comisión 3%');
ok(isNaN(C.commissionToK('x')),'comisión inválida');

/* --- cueva --- */
close(C.cuevaPct(1450,1450),0,1e-9,'cueva 0%');
close(C.cuevaPct(1435.5,1450),-1,1e-6,'cueva -1%');
eq(C.cuevaNivel(0),'bueno','nivel bueno');
eq(C.cuevaNivel(-1),'aceptable','nivel aceptable');
eq(C.cuevaNivel(-5),'bajo','nivel bajo');

/* --- registro de gastos --- */
var base={cash:1450, card:1445.3, mepRef:1490, k:0.97, pen:3.55};
var pago=C.buildEntry(Object.assign({tipo:'pago',metodo:'tarjeta',amount:145000,nota:'cena',ts:'2026-07-21T20:00:00Z'},base));
eq(pago.tipo,'pago','entry tipo pago');
eq(pago.metodo,'tarjeta','entry método');
eq(pago.ars,145000,'entry ars');
close(pago.usd,Math.round((145000/1445.3)*100)/100,1e-9,'entry usd por tarjeta');
eq(pago.nota,'cena','entry nota');
eq(pago.ts,'2026-07-21T20:00:00Z','entry ts explícito');
var cambio=C.buildEntry(Object.assign({tipo:'cambio',amount:100},base));
eq(cambio.tipo,'cambio','entry tipo cambio');
eq(cambio.metodo,null,'cambio sin método');
eq(cambio.ars,145000,'cambio ars');
close(cambio.pen,355,1e-9,'cambio pen');
eq(C.buildEntry(Object.assign({tipo:'pago',amount:0},base)),null,'monto cero rechazado');
eq(C.buildEntry(null),null,'opts null rechazado');
var sinPen=C.buildEntry({tipo:'pago',metodo:'efectivo',amount:1000,cash:1450,card:1445,mepRef:1490,k:0.97,pen:null});
eq(sinPen.pen,null,'sin PEN no rompe');
var tot=C.logTotals([pago,cambio,pago]);
eq(tot.pagos,2,'totales pagos');
eq(tot.cambios,1,'totales cambios');
close(tot.usdGastado,pago.usd*2,1e-6,'totales usd gastado');
close(tot.usdCambiado,100,1e-9,'totales usd cambiado');
eq(C.logTotals(null).pagos,0,'totales log null');

console.log('OK · '+n+'/'+n+' aserciones pasaron.');
