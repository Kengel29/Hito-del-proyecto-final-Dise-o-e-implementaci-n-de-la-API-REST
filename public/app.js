'use strict';
// Si una sección no existe en la página actual, se ignora (cada HTML muestra solo lo suyo).
const $=(s,r=document)=>r.querySelector(s)||(r===document&&/^#(eventos|zonas|cultivos|cal)$/.test(s)?{}:null);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const ETQ={critico:'🔴 Crítico',precaucion:'🟠 Precaución',abierto:'🟢 Libre'};
const SEED=/*SEED*/null;
const ESQ={eventos:{t:'evento',c:[['titulo','Título'],['lugar','Lugar'],['zonaId','Zona','zona'],['mesInicio','Mes de inicio','mes'],['mesFin','Mes de fin','mes'],['descripcion','Descripción','area']]},
 cultivos:{t:'cultivo',c:[['nombre','Nombre'],['variedades','Variedades'],['comunidades','Comunidades'],['altitud','Altitud (ej. 0 a 200 msnm)'],['zonaId','Zona','zona']]},
 alertas:{t:'alerta de carretera',c:[['via','Vía'],['estado','Estado','estado'],['detalle','Detalle','area'],['zonaId','Zona','zona']]}};
let token=null,demo=false,db=null,D={zonas:[],cultivos:[],eventos:[],alertas:[]};
try{token=sessionStorage.getItem('tk')}catch{}

/* ---- Cliente de la API (sin servidor y con SEED, usa modo demostración local) ---- */
function local(ruta,m,b){
  if(!db){try{db=JSON.parse(localStorage.getItem('cr'))}catch{}db=db||JSON.parse(JSON.stringify(SEED))}
  const [rec,id]=ruta.split('?')[0].split('/').filter(Boolean);
  if(rec==='login')return b.usuario==='admin'&&b.clave==='valdesia2026'?{status:200,data:{token:'demo'}}:{status:401,data:{error:'Usuario o clave incorrectos'}};
  const L=db[rec];if(!L)return{status:404,data:{error:'Ruta no encontrada'}};
  const it=id&&L.find(x=>x.id==id);
  if(m==='GET')return id?(it?{status:200,data:it}:{status:404,data:{error:'No encontrado'}}):{status:200,data:{total:L.length,datos:L}};
  if(token!=='demo')return{status:401,data:{error:'Se requiere iniciar sesión como administrador'}};
  if(id&&!it)return{status:404,data:{error:'No encontrado'}};
  if(m==='DELETE')L.splice(L.indexOf(it),1);
  else{const mal=ESQ[rec].c.filter(([k])=>b[k]===''||b[k]==null||Number.isNaN(b[k])).map(([k])=>k+' es obligatorio');if(mal.length)return{status:400,data:{error:'Datos inválidos',detalles:mal}};
    if(m==='POST')L.push({id:Math.max(0,...L.map(x=>x.id))+1,...b});else Object.assign(it,b)}
  try{localStorage.setItem('cr',JSON.stringify(db))}catch{}
  return{status:m==='DELETE'?204:200,data:null};
}
async function api(ruta,{method='GET',body}={}){
  if(!demo){try{
    const r=await fetch('/api'+ruta,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body&&JSON.stringify(body)});
    if((r.headers.get('content-type')||'').includes('json')||r.status===204){let data=null;try{data=await r.json()}catch{}return{ok:r.ok,status:r.status,data}}
  }catch{}
  if(!SEED)return{ok:false,status:0,data:{error:'Sin conexión con el servidor. Ejecuta: npm start'}};demo=true}
  const x=local(ruta,method,body||{});return{ok:x.status<400,status:x.status,data:x.data};
}
const toast=t=>{const e=$('#toast');e.textContent=t;e.style.display='block';setTimeout(()=>e.style.display='none',2800)};

/* ---- Pintar secciones ---- */
const zn=id=>D.zonas.find(z=>z.id===id)?.nombre||'';
const emo=t=>{t=t.toLowerCase();return /café|cafe/.test(t)?'☕':/aguacate/.test(t)?'🥑':/mango/.test(t)?'🥭':/tomate|pimiento|invernadero|vegetal/.test(t)?'🍅':/cebolla/.test(t)?'🧅':'🌱'};
const rango=e=>e.mesInicio===1&&e.mesFin===12?'Todo el año':e.mesInicio===e.mesFin?MESES[e.mesInicio-1]:`${MESES[e.mesInicio-1]} a ${MESES[e.mesFin-1]}`;
const adm=(rec,id)=>`<span class="acc solo-admin"><button class="boton boton-sec mini" data-e="${rec}:${id}" type="button">✏️ Editar</button><button class="boton boton-pel mini" data-b="${rec}:${id}" type="button">🗑️ Eliminar</button></span>`;
function pintar(){
  $('#eventos').innerHTML=D.eventos.map(e=>`<article class="card ev"><div class="emo" aria-hidden="true">${emo(e.titulo+' '+e.descripcion)}</div><p class="mes">${rango(e)}</p><h3>${esc(e.titulo)}</h3><p class="lugar">${esc(e.lugar)}</p><p>${esc(e.descripcion)}</p>${adm('eventos',e.id)}</article>`).join('')||'<p class="vacio">Aún no hay eventos publicados.</p>';
  $('#zonas').innerHTML=D.zonas.map(z=>`<article class="card z${z.id}"><h3>${esc(z.nombre)}</h3><p><strong>Cultivos:</strong> ${esc(z.cultivos)}.</p><p><strong>Comunidades:</strong> ${esc(z.comunidades)}.</p><p><strong>Acceso:</strong> ${esc(z.acceso)}.</p><p style="margin:0"><strong>Carreteras:</strong><br>${D.alertas.filter(a=>a.zonaId===z.id).map(a=>`<button class="est e-${a.estado}" data-vial type="button">${ETQ[a.estado]} · ${esc(a.via)}</button>`).join('')||' sin reportes'}</p></article>`).join('');
  $('#cultivos').innerHTML=D.cultivos.map(c=>{const n=(c.altitud.match(/[\d,]+/g)||[]).map(x=>+x.replace(',',''));const w=n.length?Math.min(100,Math.max(...n)/1300*100):0;
    return `<article class="card"><div class="emo" aria-hidden="true">${emo(c.nombre)}</div><h3>${esc(c.nombre)}</h3><p style="margin:.2rem 0"><strong>Variedades:</strong> ${esc(c.variedades)}</p><p style="margin:.2rem 0"><strong>Dónde:</strong> ${esc(c.comunidades)}</p><p style="margin:.2rem 0"><strong>Zona:</strong> ${esc(zn(c.zonaId))}</p><p style="margin:.2rem 0"><strong>Altitud:</strong> ${esc(c.altitud)}</p><div class="alt-barra" aria-hidden="true"><i style="width:${w}%"></i></div>${adm('cultivos',c.id)}</article>`}).join('')||'<p class="vacio">Aún no hay cultivos registrados.</p>';
  const hoy=new Date().getMonth()+1,n=D.eventos.length;
  let h=`<div class="gantt"><span></span>${MESES.map((m,i)=>`<b class="${i+1===hoy?'hoy':''}">${m.slice(0,3)}</b>`).join('')}`;
  D.eventos.forEach((e,i)=>{const r=i+2,seg=e.mesInicio<=e.mesFin?[[e.mesInicio,e.mesFin]]:[[e.mesInicio,12],[1,e.mesFin]];
    h+=`<div class="g-n" style="grid-row:${r};grid-column:1">${emo(e.titulo+' '+e.descripcion)} ${esc(e.titulo)}</div><div class="g-f" style="grid-row:${r}"></div>`+seg.map(([a,b])=>`<div class="g-b" style="grid-row:${r};grid-column:${a+1}/${b+2}" title="${esc(e.titulo)}: ${rango(e)}"></div>`).join('')});
  $('#cal').innerHTML=h+(n?`<div class="g-h" style="grid-row:2/${n+2};grid-column:${hoy+1}" aria-hidden="true"></div>`:'')+'</div>';
}
async function cargar(){
  const r=await Promise.all(['zonas','cultivos','eventos','alertas'].map(x=>api('/'+x)));
  if(r.some(x=>!x.ok)){toast(r.find(x=>!x.ok).data?.error||'Error');return}
  [D.zonas,D.cultivos,D.eventos,D.alertas]=r.map(x=>x.data.datos);pintar();
}

/* ---- Diálogos ---- */
const abrir=h=>{$('#dlg-c').innerHTML=h;if(!$('#dlg').open)$('#dlg').showModal()};
function modalVial(){abrir(`<h2 id="dlg-t">🚧 Estado de las carreteras</h2>${D.alertas.map(a=>`<div class="al"><strong>${esc(a.via)}</strong> <span class="est e-${a.estado}" style="cursor:default">${ETQ[a.estado]}</span><p>${esc(a.detalle)}</p>${adm('alertas',a.id)}</div>`).join('')||'<p class="vacio">Sin reportes.</p>'}<div class="botones"><button class="boton solo-admin" data-n="alertas" type="button">＋ Nueva alerta</button><button class="boton boton-sec" data-x type="button">Cerrar</button></div>`)}
function campo(k,t,v=''){
  if(t==='area')return `<textarea name="${k}" required>${esc(v)}</textarea>`;
  const op=t==='zona'?D.zonas.map(z=>[z.id,z.nombre]):t==='mes'?MESES.map((m,i)=>[i+1,m]):t==='estado'?Object.entries(ETQ):null;
  return op?`<select name="${k}" ${t==='zona'||t==='mes'?'data-num="1"':''} required><option value="">Elige…</option>${op.map(([a,b])=>`<option value="${a}"${String(a)===String(v)?' selected':''}>${esc(b)}</option>`).join('')}</select>`:`<input name="${k}" value="${esc(v)}" required>`;
}
function formulario(rec,id){
  const it=id?D[rec].find(x=>x.id==id):{},q=ESQ[rec];
  abrir(`<h2 id="dlg-t">${id?'Editar':'Nuevo'} ${q.t}</h2><form id="f">${q.c.map(([k,l,t])=>`<label>${l}${campo(k,t,it[k])}</label>`).join('')}<p class="err" role="alert"></p><div class="botones"><button class="boton">Guardar</button><button class="boton boton-sec" data-x type="button">Cancelar</button></div></form>`);
  $('#f').onsubmit=async ev=>{ev.preventDefault();const b={};for(const el of $('#f').elements)if(el.name)b[el.name]=el.dataset.num?Number(el.value):el.value.trim();
    const r=await api(id?`/${rec}/${id}`:`/${rec}`,{method:id?'PATCH':'POST',body:b});
    if(!r.ok){$('.err').textContent=(r.data?.detalles||[r.data?.error]).join(' · ');if(r.status===401)salir();return}
    toast('Guardado ✔');await cargar();rec==='alertas'?modalVial():$('#dlg').close()};
}
function login(){abrir(`<h2 id="dlg-t">🔑 Acceso de administrador</h2><p>Solo el administrador puede agregar, editar o eliminar información.</p><form id="f"><label>Usuario<input name="usuario" autocomplete="username" required></label><label>Clave<input name="clave" type="password" autocomplete="current-password" required></label><p class="err" role="alert"></p><p style="font-size:.9rem">Demostración del proyecto: <strong>admin</strong> / <strong>valdesia2026</strong></p><div class="botones"><button class="boton">Entrar</button><button class="boton boton-sec" data-x type="button">Cancelar</button></div></form>`);
  $('#f').onsubmit=async ev=>{ev.preventDefault();const r=await api('/login',{method:'POST',body:{usuario:$('[name=usuario]').value.trim(),clave:$('[name=clave]').value}});
    if(!r.ok){$('.err').textContent=r.data?.error||'No se pudo entrar';return}
    token=r.data.token;try{sessionStorage.setItem('tk',token)}catch{}modo();$('#dlg').close();toast('Sesión de administrador iniciada ✔')}}
function modo(){const a=!!token;document.body.classList.toggle('es-admin',a);$('#rol').textContent=a?'🛠️ Administrador':'👁️ Visitante';$('#btn-rol').textContent=a?'Cerrar sesión':'🔑 Acceso administrador'}
function salir(){token=null;try{sessionStorage.removeItem('tk')}catch{}modo();$('#dlg').close();toast('Sesión cerrada')}

document.addEventListener('click',async ev=>{
  const t=ev.target.closest('[data-e],[data-b],[data-n],[data-vial],[data-x],[data-salir],#btn-rol');if(!t)return;
  if(t.id==='btn-rol')return token?salir():login();
  if('salir'in t.dataset)return salir();
  if('x'in t.dataset)return $('#dlg').close();
  if('vial'in t.dataset)return modalVial();
  if(t.dataset.n)return formulario(t.dataset.n);
  const [rec,id]=(t.dataset.e||t.dataset.b).split(':');
  if(t.dataset.e)return formulario(rec,id);
  if(!confirm('¿Eliminar este elemento?'))return;
  const r=await api(`/${rec}/${id}`,{method:'DELETE'});
  if(r.ok){toast('Eliminado ✔');await cargar();if(rec==='alertas')modalVial()}else{toast(r.data?.error||'Error');if(r.status===401)salir()}
});

/* ---- Tema claro / oscuro ---- */
const b=$('#tema'),poner=t=>{document.documentElement.dataset.theme=t;b.textContent=t==='dark'?'☀️ Modo claro':'🌙 Modo oscuro'};
poner(document.documentElement.dataset.theme||'light');
b.onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';poner(t);try{localStorage.setItem('tema',t)}catch{}};
modo();cargar();
