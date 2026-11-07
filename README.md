# Cosecha Ruta · API REST (Node.js + Express)

API y sitio web de la Ruta de la Cosecha de la región Valdesia (San Cristóbal, Peravia y San José de Ocoa).

## Recursos
| Recurso | Campos |
|---|---|
| **zonas** (solo lectura) | id, nombre, cultivos, comunidades, acceso |
| **cultivos** | id, nombre, variedades, comunidades, altitud, zonaId |
| **alertas** (estado de carreteras) | id, via, estado (critico/precaucion/abierto), detalle, zonaId |
| **eventos** | id, titulo, lugar, descripcion, zonaId, mesInicio (1-12), mesFin (1-12) |

## Endpoints (base: `/api`)
| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| GET | /salud | Estado del servidor | 200 |
| GET | /zonas | Lista de zonas | 200 |
| GET | /zonas/:id | Una zona | 200, 404 |
| GET | /cultivos | Lista (filtros `?zonaId=` y `?q=`) | 200 |
| GET | /cultivos/:id | Un cultivo | 200, 404 |
| POST | /cultivos | Crear cultivo | 201, 400 |
| PATCH | /cultivos/:id | Actualizar campos | 200, 400, 404 |
| DELETE | /cultivos/:id | Eliminar | 204, 404 |
| GET | /eventos | Lista (filtros `?zonaId=` y `?q=`) | 200 |
| GET | /eventos/:id | Un evento | 200, 404 |
| POST | /eventos | Crear evento | 201, 400 |
| PATCH | /eventos/:id | Actualizar campos | 200, 400, 404 |
| DELETE | /eventos/:id | Eliminar | 204, 404 |

Rutas desconocidas bajo `/api` responden 404 y JSON malformado responde 400. Todas las respuestas son JSON.

## Ejemplos
**GET /api/eventos/2** → 200
```json
{ "id": 2, "titulo": "Expo Mango", "lugar": "Baní, Peravia", "zonaId": 2, "mesInicio": 6, "mesFin": 7, "descripcion": "..." }
```
**POST /api/cultivos**
```json
{ "nombre": "Plátano", "variedades": "Barahonero", "comunidades": "Ocoa", "altitud": "0 a 500 msnm", "zonaId": 3 }
```
→ 201 con el cultivo creado y su `id`.

**POST /api/eventos** con `{ "mesInicio": 13 }` → 400
```json
{ "error": "Datos inválidos", "detalles": ["titulo es obligatorio", "mesInicio debe ser un entero entre 1 y 12"] }
```
**GET /api/cultivos/999** → 404 `{ "error": "Cultivo no encontrado" }`

## Dos accesos: visitante y administrador
- **Visitante** (por defecto): solo consulta. Los GET son públicos.
- **Administrador**: `POST /api/login` con `{ "usuario": "admin", "clave": "valdesia2026" }` devuelve `{ "token": "..." }`. Ese token se envía como `Authorization: Bearer <token>` y es obligatorio en todos los POST, PATCH y DELETE (sin él: **401**). Cambia las credenciales con las variables `ADMIN_USER` y `ADMIN_PASS`.
- Nuevo recurso `alertas`: GET /alertas, GET /alertas/:id, POST, PATCH y DELETE (los tres últimos solo admin).

## Validaciones
Textos de 2 a 300 caracteres; meses enteros de 1 a 12 (un rango como 10→3 cruza el año); `zonaId` debe existir. PATCH exige al menos un campo válido.

## Estructura
```
server.js  test.js  package.json  README.md
public/    index.html eventos.html seguimiento.html puntos.html calendario.html estilos.css app.js imagenes/
```
## Integrantes
Kendri Tatis 100263465 · Rodolfo Starlyn Espinal Hilario 100100513 · Aneudy de la Cruz 100465614 · César Adrián Aybar Montes De Oca 100692670
