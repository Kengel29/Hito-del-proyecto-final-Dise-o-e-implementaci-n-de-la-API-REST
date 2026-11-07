const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ===== Datos en memoria ===== */
const zonas = [
  { id: 1, nombre: 'San Cristóbal', cultivos: 'Café Valdesia, aguacate Semil-34 y cebolla', comunidades: 'Los Cacaos, Cambita Garabitos y Palenque', acceso: 'Los Cacaos requiere vehículo 4x4' },
  { id: 2, nombre: 'Peravia (Baní)', cultivos: 'Mango (Banilejo, Keitt, Mingolo) y cebolla', comunidades: 'Villa Sombrera, Paya y Matanzas', acceso: 'Cualquier vehículo' },
  { id: 3, nombre: 'San José de Ocoa', cultivos: 'Café, aguacate y vegetales de invernadero', comunidades: 'Rancho Arriba y Sabana Larga', acceso: 'Zona de montaña, camino con curvas' }
];
const cultivos = [
  { id: 1, nombre: 'Café Valdesia (D.O.P.)', variedades: 'Typica, Caturra, Bourbón', comunidades: 'Los Cacaos, Cambita Garabitos, Rancho Arriba', altitud: '600 a 1,300 msnm', zonaId: 1 },
  { id: 2, nombre: 'Aguacate', variedades: 'Semil-34, Hass, Pollock', comunidades: 'Cambita Garabitos, San José de Ocoa', altitud: '400 a 1,000 msnm', zonaId: 1 },
  { id: 3, nombre: 'Mango', variedades: 'Banilejo, Keitt, Mingolo', comunidades: 'Villa Sombrera, Paya, Matanzas', altitud: '0 a 200 msnm', zonaId: 2 },
  { id: 4, nombre: 'Vegetales de invernadero', variedades: 'Pimientos, tomates, pepinos', comunidades: 'Sabana Larga, Rancho Arriba', altitud: '700 a 1,200 msnm', zonaId: 3 },
  { id: 5, nombre: 'Cebolla', variedades: 'Roja y amarilla', comunidades: 'Palenque, Valle de Baní', altitud: 'Zonas bajas y costeras', zonaId: 2 }
];
const alertas = [
  { id: 1, via: 'La Vuelta de la Paloma y Las Mayitas', estado: 'critico', detalle: 'Puntos críticos por desprendimiento de rocas y caída de capa asfáltica durante lluvias intensas.', zonaId: 3 },
  { id: 2, via: 'Baní - Cruce de Ocoa (Carretera Sánchez)', estado: 'precaucion', detalle: 'Deslizamientos en laderas cercanas y cruce de cañadas que arrastran lodo y escombros a la vía.', zonaId: 2 },
  { id: 3, via: 'Cambita Garabitos - Mucha Agua - El Cacao', estado: 'precaucion', detalle: 'Alta frecuencia de derrumbes de tierra y rocas. Se recomienda solo vehículo 4x4.', zonaId: 1 }
];
const eventos = [
  { id: 1, titulo: 'El rito del café', lugar: 'Los Cacaos y Cambita Garabitos, San Cristóbal', zonaId: 1, mesInicio: 10, mesFin: 3, descripcion: 'Temporada alta de recolección del café Valdesia. Las cooperativas locales reciben visitantes para tours fotográficos y jornadas de recolección manual.' },
  { id: 2, titulo: 'Expo Mango', lugar: 'Baní, Peravia', zonaId: 2, mesInicio: 6, mesFin: 7, descripcion: 'La fiebre del mango: Baní se convierte en el epicentro de la cosecha, con la Expo Mango como fiesta central del pueblo.' },
  { id: 3, titulo: 'Pico del aguacate', lugar: 'Cambita Garabitos, San Cristóbal', zonaId: 1, mesInicio: 9, mesFin: 1, descripcion: 'El aguacate Semil-34 domina el mercado nacional y de exportación en estos meses, con la comunidad volcada a su recolección.' },
  { id: 4, titulo: 'Cosecha continua de invernadero', lugar: 'Sabana Larga y Rancho Arriba, San José de Ocoa', zonaId: 3, mesInicio: 1, mesFin: 12, descripcion: 'Gracias a los invernaderos, la cosecha de pimientos y tomates no para, con más exportación entre noviembre y abril.' }
];

/* ===== Validación básica ===== */
const tipos = {
  texto: v => typeof v === 'string' && v.trim().length >= 2 && v.length <= 300,
  mes: v => Number.isInteger(v) && v >= 1 && v <= 12,
  estado: v => ['critico', 'precaucion', 'abierto'].includes(v),
  zona: v => Number.isInteger(v) && zonas.some(z => z.id === v)
};
const mensajes = { texto: 'debe ser texto de 2 a 300 caracteres', mes: 'debe ser un entero entre 1 y 12', estado: 'debe ser critico, precaucion o abierto', zona: 'debe ser el id de una zona existente' };

function validar(spec, body, parcial) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return ['El cuerpo debe ser un objeto JSON'];
  const errores = [];
  let presentes = 0;
  for (const [campo, tipo] of Object.entries(spec)) {
    if (body[campo] === undefined) { if (!parcial) errores.push(`${campo} es obligatorio`); continue; }
    presentes++;
    if (!tipos[tipo](body[campo])) errores.push(`${campo} ${mensajes[tipo]}`);
  }
  if (parcial && presentes === 0) errores.push('Envía al menos un campo para actualizar');
  return errores;
}
const limpiar = (spec, body) => Object.fromEntries(Object.keys(spec).filter(c => body[c] !== undefined).map(c => [c, typeof body[c] === 'string' ? body[c].trim() : body[c]]));

/* ===== Sesión de administrador (el visitante solo puede consultar) ===== */
const tokens = new Set();
const USUARIO = process.env.ADMIN_USER || 'admin', CLAVE = process.env.ADMIN_PASS || 'valdesia2026';
const admin = (req, res, next) => tokens.has((req.headers.authorization || '').replace('Bearer ', ''))
  ? next() : res.status(401).json({ error: 'Se requiere iniciar sesión como administrador' });

/* ===== Fábrica de recursos REST ===== */
function recurso(nombre, lista, spec) {
  const r = express.Router();
  const buscar = id => lista.find(x => x.id === Number(id));

  r.get('/', (req, res) => {
    let out = lista;
    const { zonaId, q } = req.query;
    if (zonaId !== undefined) out = out.filter(x => x.zonaId === Number(zonaId));
    if (q) out = out.filter(x => JSON.stringify(x).toLowerCase().includes(String(q).toLowerCase()));
    res.json({ total: out.length, datos: out });
  });
  r.get('/:id', (req, res) => {
    const item = buscar(req.params.id);
    if (!item) return res.status(404).json({ error: `${nombre} no encontrado` });
    res.json(item);
  });
  if (!spec) return r; // recurso de solo lectura

  r.post('/',admin, (req, res) => {
    const errores = validar(spec, req.body, false);
    if (errores.length) return res.status(400).json({ error: 'Datos inválidos', detalles: errores });
    const item = { id: Math.max(0, ...lista.map(x => x.id)) + 1, ...limpiar(spec, req.body) };
    lista.push(item);
    res.status(201).json(item);
  });
  r.patch('/:id',admin, (req, res) => {
    const item = buscar(req.params.id);
    if (!item) return res.status(404).json({ error: `${nombre} no encontrado` });
    const errores = validar(spec, req.body, true);
    if (errores.length) return res.status(400).json({ error: 'Datos inválidos', detalles: errores });
    Object.assign(item, limpiar(spec, req.body));
    res.json(item);
  });
  r.delete('/:id',admin, (req, res) => {
    const i = lista.findIndex(x => x.id === Number(req.params.id));
    if (i === -1) return res.status(404).json({ error: `${nombre} no encontrado` });
    lista.splice(i, 1);
    res.status(204).end();
  });
  return r;
}

app.get('/api/salud', (req, res) => res.json({ estado: 'ok', hora: new Date().toISOString() }));
app.post('/api/login', (req, res) => {
  const { usuario, clave } = req.body || {};
  if (usuario !== USUARIO || clave !== CLAVE) return res.status(401).json({ error: 'Usuario o clave incorrectos' });
  const token = crypto.randomBytes(24).toString('hex'); tokens.add(token);
  res.json({ token, rol: 'admin' });
});
app.use('/api/zonas', recurso('Zona', zonas, null));
app.use('/api/cultivos', recurso('Cultivo', cultivos, { nombre: 'texto', variedades: 'texto', comunidades: 'texto', altitud: 'texto', zonaId: 'zona' }));
app.use('/api/alertas', recurso('Alerta', alertas, { via: 'texto', estado: 'estado', detalle: 'texto', zonaId: 'zona' }));
app.use('/api/eventos', recurso('Evento', eventos, { titulo: 'texto', lugar: 'texto', descripcion: 'texto', zonaId: 'zona', mesInicio: 'mes', mesFin: 'mes' }));

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON malformado' });
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.datos = { zonas, cultivos, eventos, alertas };
module.exports = app;
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Cosecha Ruta en http://localhost:${PORT}`));
}
