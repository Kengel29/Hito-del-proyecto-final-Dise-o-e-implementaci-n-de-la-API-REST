// Pruebas de todos los endpoints. Ejecutar: npm test
const assert = require('node:assert');
const app = require('./server');

const servidor = app.listen(0, async () => {
  const base = `http://localhost:${servidor.address().port}/api`;
  const llamar = async (m, ruta, body, crudo) => {
    const r = await fetch(base + ruta, { method: m, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: crudo ?? (body ? JSON.stringify(body) : undefined) });
    let data = null; try { data = await r.json(); } catch {}
    return { status: r.status, data };
  };
  let token;
  const casos = [];
  const prueba = (nombre, fn) => casos.push([nombre, fn]);
  const cultivoOk = { nombre: 'Plátano', variedades: 'Barahonero', comunidades: 'Ocoa', altitud: '0 a 500 msnm', zonaId: 3 };
  const eventoOk = { titulo: 'Feria del plátano', lugar: 'Ocoa', descripcion: 'Feria anual de plátano', zonaId: 3, mesInicio: 4, mesFin: 5 };

  prueba('GET /salud -> 200', async () => assert.equal((await llamar('GET', '/salud')).status, 200));
  prueba('POST /login clave incorrecta -> 401', async () => assert.equal((await llamar('POST', '/login', { usuario: 'admin', clave: 'x' })).status, 401));
  prueba('POST /cultivos sin sesión (visitante) -> 401', async () => assert.equal((await llamar('POST', '/cultivos', cultivoOk)).status, 401));
  prueba('POST /login correcto -> 200 con token', async () => { const r = await llamar('POST', '/login', { usuario: 'admin', clave: 'valdesia2026' }); assert.equal(r.status, 200); token = r.data.token; });
  prueba('GET /alertas -> 200', async () => assert.equal((await llamar('GET', '/alertas')).data.total, 3));
  prueba('POST/PATCH/DELETE /alertas (admin)', async () => {
    const c = await llamar('POST', '/alertas', { via: 'Vía de prueba', estado: 'abierto', detalle: 'Sin novedades', zonaId: 1 }); assert.equal(c.status, 201);
    assert.equal((await llamar('PATCH', '/alertas/' + c.data.id, { estado: 'critico' })).data.estado, 'critico');
    assert.equal((await llamar('POST', '/alertas', { via: 'X1', estado: 'raro', detalle: 'xx', zonaId: 1 })).status, 400);
    assert.equal((await llamar('DELETE', '/alertas/' + c.data.id)).status, 204);
  });
  prueba('GET /zonas -> 200 con 3 zonas', async () => { const r = await llamar('GET', '/zonas'); assert.equal(r.status, 200); assert.equal(r.data.total, 3); });
  prueba('GET /zonas/1 -> 200', async () => assert.equal((await llamar('GET', '/zonas/1')).status, 200));
  prueba('GET /zonas/99 -> 404', async () => assert.equal((await llamar('GET', '/zonas/99')).status, 404));
  prueba('GET /cultivos -> 200', async () => assert.equal((await llamar('GET', '/cultivos')).status, 200));
  prueba('GET /cultivos?zonaId=2 filtra', async () => { const r = await llamar('GET', '/cultivos?zonaId=2'); assert.ok(r.data.datos.every(c => c.zonaId === 2)); });
  let cid;
  prueba('POST /cultivos -> 201', async () => { const r = await llamar('POST', '/cultivos', cultivoOk); assert.equal(r.status, 201); cid = r.data.id; });
  prueba('POST /cultivos inválido -> 400', async () => assert.equal((await llamar('POST', '/cultivos', { nombre: 'X' })).status, 400));
  prueba('GET /cultivos/:id creado -> 200', async () => assert.equal((await llamar('GET', '/cultivos/' + cid)).status, 200));
  prueba('PATCH /cultivos/:id -> 200', async () => { const r = await llamar('PATCH', '/cultivos/' + cid, { altitud: '0 a 600 msnm' }); assert.equal(r.status, 200); assert.equal(r.data.altitud, '0 a 600 msnm'); });
  prueba('PATCH /cultivos/999 -> 404', async () => assert.equal((await llamar('PATCH', '/cultivos/999', { altitud: 'xx' })).status, 404));
  prueba('DELETE /cultivos/:id -> 204', async () => assert.equal((await llamar('DELETE', '/cultivos/' + cid)).status, 204));
  prueba('DELETE repetido -> 404', async () => assert.equal((await llamar('DELETE', '/cultivos/' + cid)).status, 404));
  prueba('GET /eventos -> 200', async () => assert.equal((await llamar('GET', '/eventos')).status, 200));
  prueba('GET /eventos?q=mango busca', async () => assert.equal((await llamar('GET', '/eventos?q=mango')).data.total, 1));
  let eid;
  prueba('POST /eventos -> 201', async () => { const r = await llamar('POST', '/eventos', eventoOk); assert.equal(r.status, 201); eid = r.data.id; });
  prueba('POST /eventos mes 13 -> 400', async () => assert.equal((await llamar('POST', '/eventos', { ...eventoOk, mesInicio: 13 })).status, 400));
  prueba('POST /eventos zona inexistente -> 400', async () => assert.equal((await llamar('POST', '/eventos', { ...eventoOk, zonaId: 99 })).status, 400));
  prueba('PATCH /eventos/:id -> 200', async () => assert.equal((await llamar('PATCH', '/eventos/' + eid, { mesFin: 6 })).status, 200));
  prueba('PATCH /eventos/:id vacío -> 400', async () => assert.equal((await llamar('PATCH', '/eventos/' + eid, {})).status, 400));
  prueba('DELETE /eventos/:id -> 204', async () => assert.equal((await llamar('DELETE', '/eventos/' + eid)).status, 204));
  prueba('GET /eventos/999 -> 404', async () => assert.equal((await llamar('GET', '/eventos/999')).status, 404));
  prueba('JSON malformado -> 400', async () => assert.equal((await llamar('POST', '/eventos', null, '{mal')).status, 400));
  prueba('Ruta desconocida -> 404', async () => assert.equal((await llamar('GET', '/nada')).status, 404));

  let fallos = 0;
  for (const [nombre, fn] of casos) {
    try { await fn(); console.log('✔', nombre); } catch (e) { fallos++; console.log('✘', nombre, '-', e.message); }
  }
  console.log(`\n${casos.length - fallos}/${casos.length} pruebas superadas`);
  servidor.close(); process.exit(fallos ? 1 : 0);
});
