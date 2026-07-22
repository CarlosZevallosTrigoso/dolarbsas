# dolarbsas

Calculadora de pesos y dólares para moverse por Buenos Aires, pensada desde Lima: todo se traduce también a soles y la tarjeta de referencia es un débito BBVA peruano. Sin frameworks, sin build, sin backend.

**→ https://carloszevallostrigoso.github.io/dolarbsas/**

## Qué hace

**Pagar algo** (modo por defecto): dado un precio en pesos, compara cuánto cuesta en dólares pagando en efectivo (valuado al blue compra) contra tarjeta extranjera (MEP mid × factor calibrable) y marca cuál conviene hoy, con el equivalente en soles debajo de cada cifra.

**Cambiar dólares**: cuántos pesos entrega una cueva por tus dólares (blue compra) y cuánto valen esos dólares en soles a mercado. Incluye un verificador de ofertas: pegás la cotización que te ofrecen y te dice si es buena, aceptable o si te están clavando.

**Calibrar tarjeta** (pantalla ancha): la línea de tarjeta parte de una estimación (MEP × 0.97). Con un consumo real —o la comisión conocida del banco— se ajusta el factor y queda guardado en el navegador.

**Registro de gastos**: cada pago o cambio se puede registrar con un toque (y una nota opcional). El panel «Registro de gastos» muestra totales y últimos movimientos, y permite exportar todo como JSON fechado o enviarlo a un repo de GitHub.

## Modelo de cálculo

- Efectivo: blue lado **compra** — lo que el mercado paga por tus dólares, que es el costo real de los pesos que gastás.
- Tarjeta extranjera: **MEP mid × k**. Una tarjeta emitida en el exterior liquida al dólar para turistas extranjeros, cercano al MEP; no aplica el «dólar tarjeta» argentino (oficial + 30%). El factor k por defecto es 0.97 (≈3% de comisión bancaria) y es calibrable.
- Soles: costo en USD × USD/PEN de mercado. Para tarjeta es referencial: el banco factura a su propio cambio.
- Empate: diferencias menores a 0.3% entre métodos se declaran empate.
- Frescura: un dato se marca desactualizado solo si tiene más de 24 h **y** es anterior al último día hábil — el blue no cotiza los fines de semana, así que el dato del viernes vale hasta el lunes.

## Enviar el registro a GitHub

El botón «enviar registro al repo» sube un snapshot fechado (`gastos/registro-AAAA-MM-DD-HHMMSS.json`) con todos los movimientos, directo desde el navegador vía la [Contents API](https://docs.github.com/rest/repos/contents).

Configuración (una sola vez):

1. Creá un repo **privado** para los gastos (ej. `gastos-bsas`).
2. En GitHub → Settings → Developer settings → **Fine-grained personal access tokens**: generá un token con acceso *solo a ese repo* y permiso *Contents: Read and write*. Nada más.
3. Pegá repo y token en el panel. Quedan guardados en localStorage del navegador — por eso el token debe ser mínimo, y conviene revocarlo al volver del viaje.

Cada envío crea un archivo nuevo (el timestamp evita colisiones), así que el historial de snapshots queda versionado en el propio repo.

## Estructura de un registro

```json
{
  "ts": "2026-08-02T21:14:03.000Z",
  "tipo": "pago",
  "metodo": "tarjeta",
  "nota": "cena en Chacarita",
  "ars": 145000,
  "usd": 100.32,
  "pen": 356.14,
  "tasas": { "blueCompra": 1450, "mepRef": 1490, "k": 0.97, "tarjeta": 1445.3, "pen": 3.55 }
}
```

Cada entrada congela las tasas del momento, así el JSON sirve como fuente para cualquier análisis posterior sin depender de históricos externos.

## Archivos

- `index.html` — interfaz y capa de red/estado.
- `core.js` — lógica pura (tasas, conversiones, comparación, frescura, registro). Sin DOM ni red.
- `test.js` — suite del núcleo: `node test.js` (64 aserciones).
- `sw.js` — service worker: el shell funciona offline e instalable como PWA; las cotizaciones degradan a la caché local (localStorage) cuando no hay red.
- `manifest.webmanifest`, `icon.svg` — instalación en el teléfono.

## Fuentes

Cotizaciones ARS: [DolarApi.com](https://dolarapi.com). USD/PEN: [Exchange Rate API](https://www.exchangerate-api.com). Las cotizaciones informales y de tarjeta varían; verificá antes de una operación grande.
