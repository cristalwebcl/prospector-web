/* ==========================================================================
   Prospector — lógica de la app
   Sin librerías. Los datos vienen de /api/demos (servidor local) o, si la
   app se abre desde file://, de datos/demos.js. Lo que marca Yordy
   (ofrecida, etapa, notas, próximo contacto) vive en seguimiento.json en el
   servidor y se refleja en localStorage para el modo lectura.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- utilidades ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function fmt(n) { return (n == null || isNaN(n)) ? '–' : Number(n).toLocaleString('es-CL'); }
  function fmtNota(n) { return n ? Number(n).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '–'; }
  function hoyISO() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fechaCorta(iso) { if (!iso) return ''; var p = iso.slice(0, 10).split('-'); return p[2] + '-' + p[1] + '-' + p[0]; }
  function diasHasta(iso) { if (!iso) return null; var a = new Date(iso.slice(0, 10) + 'T00:00:00'); var h = new Date(hoyISO() + 'T00:00:00'); return Math.round((a - h) / 864e5); }
  function fechaLarga() { return new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }); }
  function saludo() { var h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'; }
  function debounce(fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; }
  function ico(n) {
    var p = {
      tel: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2z"/>',
      wa: '<path d="M3 21l1.6-4.6A9 9 0 1 1 8 19.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.5-1.5-2-1-1 1a4 4 0 0 1-2.5-2.5l1-1-1-2z"/>',
      abrir: '<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
      ojo: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
      carpeta: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
      copiar: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
      check: '<path d="m5 12 5 5L20 7"/>',
      x: '<path d="M6 6l12 12M18 6 6 18"/>',
      grilla: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
      lista: '<path d="M4 6h16M4 12h16M4 18h16"/>',
      descargar: '<path d="M12 3v12M6 9l6 6 6-6M4 21h16"/>',
      camara: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
      excel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
      refrescar: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
      mas: '<path d="M12 5v14M5 12h14"/>',
      github: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-1-2.6c3.1-.4 6.4-1.6 6.4-7A5.4 5.4 0 0 0 20 4.8 5 5 0 0 0 19.9 1s-1.2-.4-4 1.5a13.4 13.4 0 0 0-7 0C6.1.6 4.9 1 4.9 1A5 5 0 0 0 4.8 4.8 5.4 5.4 0 0 0 3.3 8.5c0 5.4 3.3 6.6 6.4 7a3.4 3.4 0 0 0-1 2.6V22"/>',
      pin: '<path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
      alerta: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (p[n] || '') + '</svg>';
  }

  /* ---------- estado ---------- */
  var ETAPAS = [
    { id: 'nueva', nombre: 'Sin ofrecer', color: '#6F7C8A' },
    { id: 'ofrecida', nombre: 'Ofrecida', color: '#6EA8FF' },
    { id: 'interesado', nombre: 'Interesado', color: '#F2C94C' },
    { id: 'reunion', nombre: 'Reunión / presupuesto', color: '#B08CFF' },
    { id: 'vendido', nombre: 'Vendido', color: '#5CD6C4' },
    { id: 'no-interesa', nombre: 'No interesa', color: '#FF5C6C' }
  ];
  var CANALES = ['llamada', 'whatsapp', 'visita', 'correo', 'instagram'];
  var PLANTILLA_WA = 'Hola, ¿hablo con {nombre}? Soy {yo}, desarrollador web de Loncoche.\n\nLes armé una página de muestra, sin compromiso, para que la vean en el celular: {url}\n\n{gancho}\n\nSi les interesa, la afinamos con sus fotos y queda lista en una semana. ¿Le parece que conversemos?';
  var GUION = '1. Presentarse: nombre, de Loncoche, hago páginas para negocios de la zona.\n2. El gancho (lo que le pasa hoy a SU negocio en Google).\n3. «Le hice una muestra, ¿se la mando por WhatsApp?»\n4. Si dice que sí: mandar el link y agendar cuándo volver a llamar.\n5. Si dice que no: preguntar por qué, anotar, y no insistir.';
  var estado = {
    datos: null, seg: { version: 1, items: {}, config: {} }, servidor: false,
    usuario: localStorage.getItem('prospector.usuario') || 'Yordy',
    vista: 'hoy', modo: localStorage.getItem('prospector.modo') || 'grilla',
    filtros: { q: '', lote: '', ciudad: '', rubro: '', pub: '', etapa: '', orden: 'puntaje', hoja: 'sur', prioridad: false, conPrompt: false, pendiente: false, quien: '' },
    sel: null, visibles: [], idx: -1, ordenTabla: { campo: 'puntaje', dir: -1 }, prospectoOrden: { campo: 'puntaje', dir: -1 },
    instalar: null, alertas: []
  };

  /* ---------- carga y guardado ---------- */
  function normSeg(s) {
    s = s && typeof s === 'object' ? s : {};
    s.version = 1; s.items = s.items || {}; s.config = s.config || {};
    return s;
  }
  function cargar() {
    var local = null;
    try { local = JSON.parse(localStorage.getItem('prospector.seg') || 'null'); } catch (e) { }
    return fetch('/api/demos', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('sin api'); return r.json(); })
      .then(function (d) {
        estado.datos = d; estado.servidor = true;
        return fetch('/api/seguimiento', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (s) {
          s = normSeg(s);
          // si el navegador tiene algo más nuevo (se guardó en modo lectura), gana lo local y se sube
          if (local && local.actualizado && (!s.actualizado || local.actualizado > s.actualizado)) { estado.seg = normSeg(local); guardarAhora(); }
          else { estado.seg = s; }
        });
      })
      .catch(function () {
        // sin servidor: file:// o una copia publicada (GitHub Pages). Los datos vienen de datos/demos.js
        estado.servidor = false;
        return cargarEstatico().then(function () {
          estado.datos = window.PROSPECTOR_DATOS || null;
          return leerTexto('datos/seguimiento.json').then(function (t) { return JSON.parse(t); }).catch(function () { return null; });
        }).then(function (archivo) {
          archivo = archivo ? normSeg(archivo) : null;
          // el seguimiento publicado viene con la app; si este navegador tiene algo más nuevo, gana lo local
          if (local && (!archivo || !archivo.actualizado || (local.actualizado || '') > archivo.actualizado)) estado.seg = normSeg(local);
          else estado.seg = archivo || normSeg(local);
        });
      })
      .then(function () {
        return leerTexto('datos/alertas.json').then(function (t) { var a = JSON.parse(t); estado.alertas = Array.isArray(a) ? a : []; }).catch(function () { estado.alertas = []; });
      });
  }
  function cargarEstatico() {
    if (window.PROSPECTOR_DATOS) return Promise.resolve();
    return new Promise(function (res) {
      var s = document.createElement('script'); s.src = 'datos/demos.js?v=' + Date.now();
      s.onload = res; s.onerror = res; document.head.appendChild(s);
    });
  }
  function guardarAhora() {
    estado.seg.actualizado = new Date().toISOString();
    var txt = JSON.stringify(estado.seg);
    try { localStorage.setItem('prospector.seg', txt); } catch (e) { }
    if (!estado.servidor) return Promise.resolve();
    return fetch('/api/seguimiento', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: txt })
      .then(function (r) { if (!r.ok) throw new Error(r.status); marcarConexion('ok', 'Guardado ' + new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })); })
      .catch(function () { toast('No se pudo guardar en el servidor: quedó en el navegador', 'error'); marcarConexion('lectura', 'Servidor sin respuesta'); });
  }
  var guardar = debounce(guardarAhora, 500);
  function item(id) {
    var it = estado.seg.items[id];
    if (!it) { it = estado.seg.items[id] = { ofrecida: false, fechaOfrecida: '', canal: '', resultado: '', proximo: '', prioridad: 0, notas: [], historial: [], pedirDemo: false, quien: '', pendiente: false, motivo: '', m: '' }; }
    it.notas = it.notas || []; it.historial = it.historial || [];
    return it;
  }
  function itemLectura(id) { return estado.seg.items[id] || { ofrecida: false, notas: [], historial: [], prioridad: 0, quien: '', pendiente: false, motivo: '' }; }
  // toda modificación pasa por acá: deja la hora del cambio (sirve para juntar dos seguimientos) y guarda
  function tocar(id) { item(id).m = new Date().toISOString(); guardar(); }
  var MOTIVOS = ['no contestó', 'en espera', 'volver a llamar', 'ocupado', 'pidió que lo llamen después', 'mandó a otra persona'];
  var PERSONAS = ['Yordy', 'Guillermo'];
  function etapaDe(it) { if (it.resultado) return it.resultado; return it.ofrecida ? 'ofrecida' : 'nueva'; }
  function etapaInfo(id) { return ETAPAS.filter(function (e) { return e.id === id; })[0] || ETAPAS[0]; }
  function registrar(id, tipo) {
    var it = item(id);
    it.historial.push({ f: new Date().toISOString(), t: tipo, q: estado.usuario });
    if (it.historial.length > 200) it.historial.shift();
    if (/^(llamada|whatsapp|ofrecida)$/.test(tipo)) it.quien = estado.usuario;   // el último que lo contactó
    tocar(id);
  }
  function setUsuario(q) { estado.usuario = q; localStorage.setItem('prospector.usuario', q); pintarUsuario(); toast('Ahora las llamadas se anotan como ' + q); }
  function pintarUsuario() { $$('[data-usuario]').forEach(function (b) { b.classList.toggle('activo', b.dataset.usuario === estado.usuario); }); }
  function config(k, def) { var v = estado.seg.config[k]; return (v === undefined || v === '') ? def : v; }

  /* ---------- rutas ---------- */
  function rel(p) { return p; }
  // En la versión publicada los archivos vienen descifrados en memoria (js/boveda.js):
  // recurso() devuelve el blob: de una imagen y leerTexto() el contenido de un .json/.txt
  function recurso(ruta) { var a = window.PROSPECTOR_ARCHIVOS; return (a && a[ruta] !== undefined) ? a[ruta] : ruta; }
  function leerTexto(ruta) {
    var a = window.PROSPECTOR_ARCHIVOS;
    if (a && a['texto:' + ruta] !== undefined) return Promise.resolve(a['texto:' + ruta]);
    return fetch(ruta, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); });
  }
  function enBoveda() { return !!window.PROSPECTOR_BOVEDA_URL; }
  function recursoExiste(ruta) { var a = window.PROSPECTOR_ARCHIVOS; return !a || !ruta ? !!ruta : a[ruta] !== undefined; }
  // sin servidor no hay demos locales que servir: queda la publicada (si existe) y las capturas
  function rutaDemo(d) { return estado.servidor ? d.rutaLocal : (d.url || ''); }
  function rutaPortada(d) { return (estado.servidor && d.portada) ? d.portada : ''; }
  function esFile() { return location.protocol === 'file:'; }
  function imagenDe(d, movil) {
    var cap = movil ? d.capturaMovil : d.captura;
    if (movil && !recursoExiste(cap)) cap = d.captura;   // la versión publicada puede venir sin móviles
    if (cap) { var r = recurso(cap); return r === cap ? cap + '?v=' + (d.modificado || '').replace(/-/g, '') : r; }
    return rutaPortada(d);
  }
  function esMovil(d) { return /^569/.test(d.telDigitos || ''); }
  function textoWA(d) {
    var pl = config('plantillaWA', PLANTILLA_WA);
    return pl.replace(/\{nombre\}/g, d.nombre || '').replace(/\{url\}/g, d.url || '(demo sin publicar)').replace(/\{gancho\}/g, d.gancho || '').replace(/\{ciudad\}/g, d.ciudad || '').replace(/\{yo\}/g, config('nombre', 'Yordy Serna'));
  }
  function linkWA(d) { return 'https://wa.me/' + d.telDigitos + '?text=' + encodeURIComponent(textoWA(d)); }
  function linkTel(d) { return 'tel:+' + d.telDigitos; }

  /* ---------- toasts, conexión, avisos ---------- */
  function toast(msg, tipo) {
    var t = document.createElement('div'); t.className = 'toast ' + (tipo || ''); t.innerHTML = esc(msg);
    $('#toasts').appendChild(t);
    setTimeout(function () { t.classList.add('saliendo'); setTimeout(function () { t.remove(); }, 260); }, 2600);
  }
  function marcarConexion(cls, txt) { var c = $('#conexion'); c.className = 'conexion ' + cls; c.querySelector('span').textContent = txt; }
  function copiar(txt, aviso) { navigator.clipboard.writeText(txt).then(function () { toast(aviso || 'Copiado'); }, function () { toast('No se pudo copiar', 'error'); }); }
  function abrirRuta(ruta) {
    if (!estado.servidor) { toast('Abre la app con Prospector.cmd para abrir carpetas', 'error'); return; }
    fetch('/api/abrir', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ruta: ruta }) })
      .then(function (r) { return r.json(); }).then(function (j) { if (!j.ok) toast(j.error || 'No se pudo abrir', 'error'); })
      .catch(function () { toast('No se pudo abrir', 'error'); });
  }

  /* ---------- navegación ---------- */
  var TITULOS = { hoy: 'Hoy', demos: 'Demos', prospectos: 'Prospectos', pipeline: 'Pipeline', clientes: 'Clientes', stats: 'Estadísticas', ajustes: 'Ajustes' };
  function irA(vista, id) {
    if (!TITULOS[vista]) vista = 'hoy';
    estado.vista = vista;
    $$('.nav-item').forEach(function (b) { b.classList.toggle('activo', b.dataset.vista === vista); });
    $$('.vista').forEach(function (v) { v.hidden = v.id !== 'vista-' + vista; });
    $('#titulo-vista').textContent = TITULOS[vista];
    $('#app').classList.remove('menu');
    render();
    if (id) abrirFicha(id); else cerrarFicha(true);
    var hash = '#' + vista + (id ? '/' + encodeURIComponent(id) : '');
    if (location.hash !== hash) history.replaceState(null, '', hash);
    $('#principal').scrollTop = 0; window.scrollTo(0, 0);
  }
  function leerHash() {
    var h = location.hash.replace(/^#/, '').split('/');
    if (h[0] && TITULOS[h[0]]) { estado.vista = h[0]; return { vista: h[0], id: h[1] ? decodeURIComponent(h[1]) : null }; }
    return { vista: 'hoy', id: null };
  }

  /* ---------- colecciones ---------- */
  function demos() { return estado.datos ? estado.datos.demos : []; }
  function prospectos() { return estado.datos ? estado.datos.prospectos : []; }
  function idProspecto(p) { return 'p:' + norm(p.negocio).replace(/[^a-z0-9]+/g, '-') + ':' + norm(p.ciudad).replace(/[^a-z0-9]+/g, '-'); }
  function buscarDemo(id) { return demos().filter(function (d) { return d.id === id; })[0] || null; }
  function buscarProspecto(id) { return prospectos().filter(function (p) { return idProspecto(p) === id; })[0] || null; }
  function coincide(d, q) {
    if (!q) return true;
    var s = norm([d.nombre, d.negocio, d.rubro, d.ciudad, d.slug, d.gancho, d.tel, d.telDigitos, d.num, d.zona].join(' '));
    return q.split(/\s+/).every(function (t) { return s.indexOf(t) >= 0; });
  }
  function demosFiltradas() {
    var f = estado.filtros, q = norm(f.q).trim();
    var l = demos().filter(function (d) {
      var it = itemLectura(d.id);
      if (f.lote && d.lote !== f.lote) return false;
      if (f.ciudad && d.ciudad !== f.ciudad) return false;
      if (f.rubro && norm(d.rubro).indexOf(norm(f.rubro)) < 0) return false;
      if (f.pub === 'si' && !d.publicada) return false;
      if (f.pub === 'no' && d.publicada) return false;
      if (f.pub === 'fotos' && !d.fotosReales) return false;
      if (f.etapa && etapaDe(it) !== f.etapa) return false;
      if (f.prioridad && !(it.prioridad > 0)) return false;
      if (f.pendiente && !it.pendiente) return false;
      if (f.quien === 'nadie' && it.quien) return false;
      if (f.quien && f.quien !== 'nadie' && it.quien !== f.quien) return false;
      return coincide(d, q);
    });
    var o = f.orden;
    l.sort(function (a, b) {
      var ia = itemLectura(a.id), ib = itemLectura(b.id);
      switch (o) {
        case 'resenas': return (b.resenas || 0) - (a.resenas || 0) || (b.puntaje || 0) - (a.puntaje || 0);
        case 'nota': return (b.nota || 0) - (a.nota || 0) || (b.resenas || 0) - (a.resenas || 0);
        case 'num': return (a.num || 0) - (b.num || 0) || a.nombre.localeCompare(b.nombre);
        case 'numdesc': return (b.num || 0) - (a.num || 0);
        case 'nombre': return a.nombre.localeCompare(b.nombre, 'es');
        case 'modificado': return (b.modificado || '').localeCompare(a.modificado || '');
        case 'prioridad': return (ib.prioridad || 0) - (ia.prioridad || 0) || (b.puntaje || 0) - (a.puntaje || 0);
        case 'proximo': return (ia.proximo || '9').localeCompare(ib.proximo || '9');
        default: return (b.puntaje || 0) - (a.puntaje || 0) || (b.resenas || 0) - (a.resenas || 0);
      }
    });
    return l;
  }
  function ciudades() { var m = {}; demos().forEach(function (d) { if (d.ciudad) m[d.ciudad] = (m[d.ciudad] || 0) + 1; }); return Object.keys(m).sort(function (a, b) { return m[b] - m[a]; }).map(function (c) { return { n: c, c: m[c] }; }); }
  function colaHoy() {
    var hoy = hoyISO();
    var c = demos().filter(function (d) { return d.telDigitos; }).map(function (d) {
      var it = itemLectura(d.id), e = etapaDe(it), dias = diasHasta(it.proximo);
      if (e === 'vendido' || e === 'no-interesa') return null;
      var motivo = '', peso = 0, rojo = false;
      if (it.proximo && dias <= 0) { motivo = dias === 0 ? 'Seguimiento para hoy' : 'Seguimiento atrasado ' + (-dias) + ' d'; peso = 1000 + (-dias); rojo = dias < 0; }
      else if (it.proximo) { return null; }
      else if (it.pendiente) { motivo = 'Pendiente: ' + (it.motivo || 'sin respuesta') + (it.quien ? ' · llamó ' + it.quien : ''); peso = 700 + (it.prioridad || 0) * 10; }
      else if (e === 'ofrecida' && it.fechaOfrecida && diasHasta(it.fechaOfrecida) <= -5) { motivo = 'Ofrecida hace ' + (-diasHasta(it.fechaOfrecida)) + ' d sin respuesta'; peso = 500 + (it.prioridad || 0) * 10; }
      else if (e === 'nueva') { motivo = d.publicada ? 'Publicada, sin ofrecer' : 'Sin ofrecer · ' + (d.puntaje || 0) + ' pts'; peso = (d.publicada ? 200 : 100) + (it.prioridad || 0) * 50 + (d.puntaje || 0); }
      else return null;
      return { d: d, it: it, motivo: motivo, peso: peso, rojo: rojo };
    }).filter(Boolean);
    c.sort(function (a, b) { return b.peso - a.peso; });
    return c;
  }
  function llamadasHoy() {
    var hoy = hoyISO(), n = 0;
    Object.keys(estado.seg.items).forEach(function (k) { (estado.seg.items[k].historial || []).forEach(function (h) { if (h.f.slice(0, 10) === hoy && (h.t === 'llamada' || h.t === 'whatsapp' || h.t === 'ofrecida')) n++; }); });
    return n;
  }
  function conteos() {
    var n = { demos: demos().length, prospectos: prospectos().length, ofrecidas: 0, interesados: 0, reunion: 0, vendidos: 0, no: 0, publicadas: 0, hoy: 0, pedir: 0, prioridad: 0, pendientes: 0 };
    demos().forEach(function (d) {
      var it = itemLectura(d.id), e = etapaDe(it);
      if (d.publicada) n.publicadas++;
      if (it.pendiente) n.pendientes++;
      if (e !== 'nueva') n.ofrecidas++;
      if (e === 'interesado') n.interesados++;
      if (e === 'reunion') n.reunion++;
      if (e === 'vendido') n.vendidos++;
      if (e === 'no-interesa') n.no++;
      if (it.prioridad > 0) n.prioridad++;
    });
    prospectos().forEach(function (p) { var ip = itemLectura(idProspecto(p)); if (ip.pedirDemo) n.pedir++; if (ip.pendiente) n.pendientes++; });
    n.hoy = colaHoy().filter(function (c) { return c.rojo || c.motivo.indexOf('Seguimiento') === 0 || c.motivo.indexOf('Pendiente') === 0; }).length;
    return n;
  }

  /* ---------- render principal ---------- */
  function render() {
    if (!estado.datos) return;
    var n = conteos();
    $('[data-cuenta="hoy"]').textContent = n.hoy || '';
    $('[data-cuenta="demos"]').textContent = n.demos;
    $('[data-cuenta="prospectos"]').textContent = n.prospectos;
    $('[data-cuenta="pipeline"]').textContent = n.ofrecidas || '';
    $('[data-cuenta="clientes"]').textContent = estado.datos.clientes.length;
    var acciones = $('#barra-acciones'); acciones.innerHTML = '';
    switch (estado.vista) {
      case 'hoy': renderHoy(); break;
      case 'demos': renderDemos(); break;
      case 'prospectos': renderProspectos(); break;
      case 'pipeline': renderPipeline(); break;
      case 'clientes': renderClientes(); break;
      case 'stats': renderStats(); break;
      case 'ajustes': renderAjustes(); break;
    }
  }

  /* ---------- HOY ---------- */
  function renderHoy() {
    var n = conteos(), cola = colaHoy(), obj = Number(config('objetivo', 8)), hechas = llamadasHoy();
    var v = $('#vista-hoy');
    var prox = demos().map(function (d) { var it = itemLectura(d.id); return it.proximo && diasHasta(it.proximo) > 0 && diasHasta(it.proximo) <= 10 ? { d: d, it: it } : null; }).filter(Boolean).sort(function (a, b) { return a.it.proximo.localeCompare(b.it.proximo); });
    var ultimas = demos().slice().sort(function (a, b) { return (b.modificado || '').localeCompare(a.modificado || '') || (b.num || 0) - (a.num || 0); }).slice(0, 5);
    var alertas = estado.alertas.concat(config('alertas', [])).map(function (a) { return { a: a, dias: diasHasta(a.fecha) }; }).sort(function (x, y) { return (x.dias == null ? 99 : x.dias) - (y.dias == null ? 99 : y.dias); });
    v.innerHTML =
      '<section class="hero hero--volcan">' +
        '<span class="credito">Volcán Villarrica · pxhere</span>' +
        '<span class="saludo">' + esc(saludo()) + ', ' + esc(config('nombre', 'Yordy').split(' ')[0]) + ' · ' + esc(fechaLarga()) + '</span>' +
        '<h2>' + (cola.length ? cola.length + ' negocios para llamar' : 'Nada pendiente para hoy') + '</h2>' +
        '<p>' + (n.hoy ? '<b>' + n.hoy + '</b> entre seguimientos vencidos y pendientes de respuesta. ' : '') + '<b>' + n.demos + '</b> demos construidas, <b>' + n.publicadas + '</b> en línea, <b>' + n.ofrecidas + '</b> ofrecidas y <b>' + n.interesados + '</b> interesados.</p>' +
        '<div class="hero-kpis">' +
          '<div class="hero-kpi meta"><div class="anillo" style="--p:' + Math.min(100, Math.round(hechas / Math.max(1, obj) * 100)) + '"><b>' + hechas + '/' + obj + '</b></div><div><b style="font-size:15px">Meta de hoy</b><span>llamadas o WhatsApp</span></div></div>' +
          '<div class="hero-kpi acento"><b>' + n.ofrecidas + '</b><span>ofrecidas</span></div>' +
          '<div class="hero-kpi aviso"><b>' + n.pendientes + '</b><span>pendientes</span></div>' +
          '<div class="hero-kpi"><b>' + n.interesados + '</b><span>interesados</span></div>' +
          '<div class="hero-kpi ok"><b>' + n.vendidos + '</b><span>vendidos</span></div>' +
          '<div class="hero-kpi"><b>' + n.pedir + '</b><span>demos pedidas</span></div>' +
        '</div>' +
      '</section>' +
      '<div class="dos-col">' +
        '<section class="panel"><div class="panel-cab"><h2>Cola de hoy</h2><span class="n">' + cola.length + '</span><div class="der"><button class="btn btn-chico" data-accion="ir-demos">Ver todas</button></div></div>' +
          (cola.length ? '<div class="cola">' + cola.slice(0, 12).map(function (c) {
            var img = imagenDe(c.d);
            return '<div class="cola-item' + (c.rojo ? ' vencido' : '') + '" data-id="' + esc(c.d.id) + '">' +
              (img ? '<img class="cola-mini" src="' + esc(img) + '" alt="" loading="lazy">' : '<div class="cola-mini"></div>') +
              '<div class="cola-texto"><b>' + esc(c.d.nombre) + '</b><span>' + esc(c.d.rubro) + (c.d.ciudad ? ' · ' + esc(c.d.ciudad) : '') + ' · ' + esc(c.d.tel) + '</span><span class="porque' + (c.rojo ? ' rojo' : '') + '">' + esc(c.motivo) + '</span></div>' +
              '<div class="cola-acciones">' + botonesRapidos(c.d) + '</div></div>';
          }).join('') + '</div>' : '<div class="vacio"><b>Cola vacía</b>No hay demos con teléfono sin ofrecer ni seguimientos vencidos.</div>') +
        '</section>' +
        '<div class="columna-lateral">' +
          '<section class="panel"><div class="panel-cab"><h2>Alertas con fecha</h2><span class="n">' + alertas.length + '</span></div>' +
            (alertas.length ? '<div class="lista-simple">' + alertas.map(function (x) {
              var cls = x.dias == null ? 'gris' : x.dias < 0 ? 'gris' : x.dias <= 7 ? 'rojo' : x.dias <= 30 ? 'ambar' : '';
              var eti = x.dias == null ? '—' : x.dias < 0 ? 'hace ' + (-x.dias) + ' d' : x.dias === 0 ? 'HOY' : 'en ' + x.dias + ' d';
              return '<div class="alerta ' + cls + '"><span class="dias">' + esc(eti) + '</span><p>' + esc(x.a.texto) + (x.a.demo ? ' <a href="#demos/' + esc(encodeURIComponent(x.a.demo)) + '" data-id="' + esc(x.a.demo) + '">ver demo →</a>' : '') + '</p></div>';
            }).join('') + '</div>' : '<div class="vacio">Sin alertas. Se agregan en Ajustes.</div>') +
          '</section>' +
          '<section class="panel"><div class="panel-cab"><h2>Próximos seguimientos</h2><span class="n">' + prox.length + '</span></div>' +
            (prox.length ? '<div class="cola">' + prox.slice(0, 8).map(function (x) { return '<div class="cola-item" data-id="' + esc(x.d.id) + '"><div class="cola-mini" style="display:grid;place-items:center;font:700 12px var(--mono);color:var(--acento-2)">' + esc(fechaCorta(x.it.proximo).slice(0, 5)) + '</div><div class="cola-texto"><b>' + esc(x.d.nombre) + '</b><span>' + esc(etapaInfo(etapaDe(x.it)).nombre) + ' · en ' + diasHasta(x.it.proximo) + ' d</span></div><div class="cola-acciones">' + botonesRapidos(x.d) + '</div></div>'; }).join('') + '</div>' : '<div class="vacio">Nada agendado para los próximos 10 días.</div>') +
          '</section>' +
          '<section class="panel"><div class="panel-cab"><h2>Últimas demos</h2></div><div class="cola">' + ultimas.map(function (d) { var img = imagenDe(d); return '<div class="cola-item" data-id="' + esc(d.id) + '">' + (img ? '<img class="cola-mini" src="' + esc(img) + '" alt="" loading="lazy">' : '<div class="cola-mini"></div>') + '<div class="cola-texto"><b>' + (d.num ? '#' + d.num + ' ' : '') + esc(d.nombre) + '</b><span>' + esc(d.rubro) + ' · ' + esc(d.ciudad) + ' · ' + esc(fechaCorta(d.modificado)) + '</span></div><div class="cola-acciones"><a class="rapida" href="' + esc(rutaDemo(d)) + '" target="_blank" rel="noopener" title="Abrir demo">' + ico('abrir') + '</a></div></div>'; }).join('') + '</div></section>' +
        '</div>' +
      '</div>';
  }
  function botonesRapidos(d) {
    return '<a class="rapida tel' + (d.telDigitos ? '' : ' desactivada') + '" href="' + esc(linkTel(d)) + '" title="Llamar ' + esc(d.tel) + '" data-registrar="llamada" data-id="' + esc(d.id) + '">' + ico('tel') + '</a>' +
      '<a class="rapida wa' + (esMovil(d) ? '' : ' desactivada') + '" href="' + esc(esMovil(d) ? linkWA(d) : '#') + '" target="_blank" rel="noopener" title="' + (esMovil(d) ? 'WhatsApp con el mensaje armado' : 'No es celular') + '" data-registrar="whatsapp" data-id="' + esc(d.id) + '">' + ico('wa') + '</a>' +
      (rutaDemo(d) ? '<a class="rapida" href="' + esc(rutaDemo(d)) + '" target="_blank" rel="noopener" title="' + (d.url ? 'Abrir publicada' : 'Abrir demo local') + '">' + ico('abrir') + '</a>' : '<button class="rapida" type="button" data-accion="previa" data-id="' + esc(d.id) + '" title="Ver capturas">' + ico('ojo') + '</button>');
  }

  /* ---------- DEMOS ---------- */
  function renderDemos() {
    var f = estado.filtros, lista = demosFiltradas(), v = $('#vista-demos');
    estado.visibles = lista.map(function (d) { return d.id; });
    var acc = $('#barra-acciones');
    acc.innerHTML = '<button class="btn-icono' + (estado.modo === 'grilla' ? ' activo' : '') + '" data-modo="grilla" title="Tarjetas">' + ico('grilla') + '</button><button class="btn-icono' + (estado.modo === 'lista' ? ' activo' : '') + '" data-modo="lista" title="Lista">' + ico('lista') + '</button><button class="btn btn-chico" data-accion="csv" title="Exportar lo filtrado a CSV">' + ico('descargar') + ' CSV</button>';
    var cds = ciudades(), lotes = estado.datos.totales.porLote, nPend = demos().filter(function (d) { return itemLectura(d.id).pendiente; }).length;
    var html = '<div class="herramientas">' +
      '<select class="selector" data-filtro="lote"><option value="">Todos los lotes</option><option value="completas"' + (f.lote === 'completas' ? ' selected' : '') + '>Completas con fotos (' + lotes.completas + ')</option><option value="parte2"' + (f.lote === 'parte2' ? ' selected' : '') + '>Completas parte 2 (' + lotes.parte2 + ')</option><option value="plantillas"' + (f.lote === 'plantillas' ? ' selected' : '') + '>Plantillas sin fotos (' + lotes.plantillas + ')</option><option value="v2"' + (f.lote === 'v2' ? ' selected' : '') + '>Puerto Montt / Varas (' + lotes.v2 + ')</option></select>' +
      '<select class="selector" data-filtro="ciudad"><option value="">Todas las ciudades</option>' + cds.map(function (c) { return '<option value="' + esc(c.n) + '"' + (f.ciudad === c.n ? ' selected' : '') + '>' + esc(c.n) + ' (' + c.c + ')</option>'; }).join('') + '</select>' +
      '<select class="selector" data-filtro="pub"><option value="">Publicada o no</option><option value="si"' + (f.pub === 'si' ? ' selected' : '') + '>Sólo publicadas</option><option value="no"' + (f.pub === 'no' ? ' selected' : '') + '>Sólo sin publicar</option><option value="fotos"' + (f.pub === 'fotos' ? ' selected' : '') + '>Con fotos reales</option></select>' +
      '<select class="selector" data-filtro="etapa"><option value="">Cualquier etapa</option>' + ETAPAS.map(function (e) { return '<option value="' + e.id + '"' + (f.etapa === e.id ? ' selected' : '') + '>' + esc(e.nombre) + '</option>'; }).join('') + '</select>' +
      '<span class="separador"></span>' +
      '<select class="selector" data-filtro="orden"><option value="puntaje">Por puntaje</option><option value="resenas"' + (f.orden === 'resenas' ? ' selected' : '') + '>Por reseñas</option><option value="nota"' + (f.orden === 'nota' ? ' selected' : '') + '>Por nota</option><option value="prioridad"' + (f.orden === 'prioridad' ? ' selected' : '') + '>Por prioridad</option><option value="proximo"' + (f.orden === 'proximo' ? ' selected' : '') + '>Por próximo contacto</option><option value="numdesc"' + (f.orden === 'numdesc' ? ' selected' : '') + '>Más nuevas primero</option><option value="num"' + (f.orden === 'num' ? ' selected' : '') + '>Por número</option><option value="nombre"' + (f.orden === 'nombre' ? ' selected' : '') + '>Por nombre</option><option value="modificado"' + (f.orden === 'modificado' ? ' selected' : '') + '>Última modificación</option></select>' +
      '<button class="chip' + (f.prioridad ? ' activo' : '') + '" data-filtro="prioridad">★ Con prioridad</button>' +
      '<button class="chip' + (f.pendiente ? ' activo' : '') + '" data-filtro="pendiente">Pendientes' + (nPend ? ' · ' + nPend : '') + '</button>' +
      '<select class="selector" data-filtro="quien"><option value="">Quién llamó: todos</option>' + PERSONAS.map(function (q) { return '<option value="' + q + '"' + (f.quien === q ? ' selected' : '') + '>Llamó ' + q + '</option>'; }).join('') + '<option value="nadie"' + (f.quien === 'nadie' ? ' selected' : '') + '>Nadie todavía</option></select>' +
      '<span class="resumen-filtro"><b>' + lista.length + '</b> de ' + demos().length + '</span>' +
      '</div>';
    if (!lista.length) { html += '<div class="vacio"><b>Nada coincide</b>Prueba con otra búsqueda o quita filtros.</div>'; v.innerHTML = html; return; }
    if (estado.modo === 'grilla') {
      html += '<div class="grilla">' + lista.map(function (d, i) { return tarjeta(d, i); }).join('') + '</div>';
    } else {
      var o = estado.ordenTabla;
      var th = function (campo, txt, cls) { return '<th data-orden="' + campo + '" class="' + (cls || '') + (f.orden === campo ? ' orden' : '') + '">' + txt + '</th>'; };
      html += '<div class="tabla-envoltura"><table class="tabla"><thead><tr><th></th>' + th('num', '#', 'num') + th('nombre', 'Negocio') + '<th>Rubro</th><th>Ciudad</th><th>Teléfono</th>' + th('resenas', 'Reseñas', 'num') + th('nota', 'Nota', 'num') + th('puntaje', 'Pts', 'num') + '<th>Estado</th><th>Etapa</th><th>Llamó</th><th>Última nota</th><th>Ofrecida</th><th></th></tr></thead><tbody>' +
        lista.map(function (d) {
          var it = itemLectura(d.id), e = etapaInfo(etapaDe(it)), img = imagenDe(d), ultima = (it.notas && it.notas.length) ? it.notas[it.notas.length - 1].t : '';
          return '<tr data-id="' + esc(d.id) + '"' + (estado.sel === d.id ? ' class="sel"' : '') + '><td class="mini-cel">' + (img ? '<img class="mini" src="' + esc(img) + '" alt="" loading="lazy">' : '<div class="mini"></div>') + '</td><td class="num">' + (d.num || '') + '</td><td class="nombre">' + esc(d.nombre) + (it.prioridad ? ' <span style="color:var(--aviso)">' + '★'.repeat(it.prioridad) + '</span>' : '') + '<small>' + esc(d.loteEtiqueta) + '</small></td><td>' + esc(d.rubro) + '</td><td>' + esc(d.ciudad) + '</td><td class="tel">' + esc(d.tel) + '</td><td class="num">' + fmt(d.resenas) + '</td><td class="num">' + fmtNota(d.nota) + '</td><td class="num"><b>' + (d.puntaje || '') + '</b></td><td>' + (d.publicada ? '<span class="insignia ok">En línea</span>' : '<span class="insignia">Local</span>') + '</td><td><span class="etapa-punto" style="--e:' + e.color + '"></span>' + esc(e.nombre) + (it.pendiente ? '<br><span class="insignia aviso">Pendiente' + (it.motivo ? ' · ' + esc(it.motivo) : '') + '</span>' : '') + '</td><td>' + (it.quien ? esc(it.quien) : '<span class="silencio">—</span>') + '</td><td class="cel-gancho"><span>' + esc(ultima) + '</span></td><td><label class="check" data-detener><input type="checkbox" data-ofrecida="' + esc(d.id) + '"' + (it.ofrecida ? ' checked' : '') + '><span></span></label></td><td class="acciones">' + botonesRapidos(d) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    v.innerHTML = html;
  }
  function tarjeta(d, i) {
    var it = itemLectura(d.id), e = etapaInfo(etapaDe(it)), img = imagenDe(d), col = (d.identidad && d.identidad.colores) || [];
    return '<article class="tarjeta' + (estado.sel === d.id ? ' sel' : '') + (it.ofrecida ? ' ofrecida' : '') + '" data-id="' + esc(d.id) + '" style="animation-delay:' + Math.min(i, 24) * 22 + 'ms" tabindex="0">' +
      '<div class="tarjeta-img">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy">' : '<div class="sin" style="--c1:' + esc(col[0] || '#1a2430') + ';--c2:' + esc(col[col.length - 1] || '#2a3a4c') + '">' + esc(d.identidad ? d.identidad.display : 'Sin captura') + '</div>') +
        '<div class="esquina">' + (d.publicada ? '<span class="insignia ok">En línea</span>' : '') + (d.fotosReales ? '<span class="insignia acento">Fotos reales</span>' : '') + (it.prioridad ? '<span class="insignia aviso">' + '★'.repeat(it.prioridad) + '</span>' : '') + (it.pendiente ? '<span class="insignia aviso">Pendiente' + (it.motivo ? ' · ' + esc(it.motivo) : '') + '</span>' : '') + '</div>' +
        (etapaDe(it) !== 'nueva' ? '<div class="esquina-der"><span class="insignia" style="background:' + e.color + ';color:#0B0F14">' + esc(e.nombre) + '</span></div>' : '') +
      '</div>' +
      '<div class="tarjeta-cuerpo"><span class="tarjeta-num">' + (d.num ? '#' + d.num + ' · ' : '') + esc(d.loteEtiqueta) + '</span><h3>' + esc(d.nombre) + '</h3><span class="sub">' + esc(d.rubro || '—') + (d.ciudad ? ' · ' + esc(d.ciudad) : '') + '</span>' +
        '<div class="tarjeta-stats">' + (d.resenas ? '<span><b>' + fmt(d.resenas) + '</b> reseñas</span>' : '') + (d.nota ? '<span class="nota">' + fmtNota(d.nota) + '</span>' : '') + (d.puntaje ? '<span><b>' + d.puntaje + '</b> pts</span>' : '') + (it.proximo ? '<span style="color:var(--acento-2)">↻ ' + esc(fechaCorta(it.proximo).slice(0, 5)) + '</span>' : '') + (it.quien ? '<span title="Quién lo llamó">☎ ' + esc(it.quien) + '</span>' : '') + '</div>' +
        (it.notas && it.notas.length ? '<p class="tarjeta-nota" title="Última nota">' + esc(it.notas[it.notas.length - 1].t) + '</p>' : '') +
        '<div class="tarjeta-pie"><label class="check" data-detener><input type="checkbox" data-ofrecida="' + esc(d.id) + '"' + (it.ofrecida ? ' checked' : '') + '><span>' + (it.ofrecida ? 'Ofrecida' : 'Marcar ofrecida') + '</span></label><div class="rapidas">' + botonesRapidos(d) + '</div></div>' +
      '</div></article>';
  }

  /* ---------- PROSPECTOS ---------- */
  function renderProspectos() {
    var f = estado.filtros, v = $('#vista-prospectos'), q = norm(f.q).trim();
    var hojas = { sur: /Sur/i, santiago: /Santiago/i, inter: /Internacional/i, listas: /Listas/i };
    var cuenta = {}; prospectos().forEach(function (p) { Object.keys(hojas).forEach(function (k) { if (hojas[k].test(p.hoja)) cuenta[k] = (cuenta[k] || 0) + 1; }); });
    var lista = prospectos().filter(function (p) { return hojas[f.hoja] ? hojas[f.hoja].test(p.hoja) : true; }).filter(function (p) { return !f.conPrompt || p.prompt; }).filter(function (p) { return coincide({ nombre: p.negocio, rubro: p.rubro, ciudad: p.ciudad, gancho: p.gancho, tel: p.tel, telDigitos: p.telDigitos, zona: p.zona }, q); });
    var nPrompts = prospectos().filter(function (p) { return p.prompt; }).length;
    var o = estado.prospectoOrden;
    lista.sort(function (a, b) { var x = a[o.campo], y = b[o.campo]; if (typeof x === 'string') return o.dir * String(x).localeCompare(String(y), 'es'); return o.dir * ((x || 0) - (y || 0)); });
    estado.visibles = lista.map(idProspecto);
    $('#barra-acciones').innerHTML = '<button class="btn btn-chico" data-accion="csv-prospectos">' + ico('descargar') + ' CSV</button>' + (estado.servidor ? '<button class="btn btn-chico" data-accion="excel">' + ico('excel') + ' Abrir Excel</button>' : '');
    var th = function (campo, txt, cls) { return '<th data-porden="' + campo + '" class="' + (cls || '') + (o.campo === campo ? ' orden' : '') + '">' + txt + (o.campo === campo ? (o.dir > 0 ? ' ↑' : ' ↓') : '') + '</th>'; };
    v.innerHTML = '<section class="hero hero--rio hero--corto"><span class="credito">Río del sur · unsplash</span><span class="saludo">Por hacer</span><h2>' + prospectos().length + ' negocios en la lista, sin demo todavía</h2><p>Los que tienen gancho y verificación están listos para construir. Marca «Pedir demo» y en la próxima sesión se construyen primero.</p></section>' +
      '<div class="herramientas"><div class="pestanas">' + [['sur', 'Sur'], ['santiago', 'Santiago'], ['inter', 'Internacional'], ['listas', 'Listas sin carpeta']].map(function (h) { return '<button data-hoja="' + h[0] + '"' + (f.hoja === h[0] ? ' class="activo"' : '') + '>' + h[1] + '<b>' + (cuenta[h[0]] || 0) + '</b></button>'; }).join('') + '</div>' + (nPrompts ? '<button class="chip' + (f.conPrompt ? ' activo' : '') + '" data-filtro="conPrompt">Con prompt listo · ' + nPrompts + '</button>' : '') + '<span class="resumen-filtro"><b>' + lista.length + '</b> filas</span></div>' +
      (lista.length ? '<div class="tabla-envoltura"><table class="tabla"><thead><tr>' + th('puntaje', 'Pts', 'num') + th('negocio', 'Negocio') + th('rubro', 'Rubro') + th('ciudad', 'Ciudad') + '<th>Teléfono</th>' + th('resenas', 'Reseñas', 'num') + th('nota', 'Nota', 'num') + '<th>Gancho</th><th>Pedir demo</th><th></th></tr></thead><tbody>' +
        lista.map(function (p) {
          var id = idProspecto(p), it = itemLectura(id);
          var d = { id: id, nombre: p.negocio, tel: p.tel, telDigitos: p.telDigitos, url: '', gancho: p.gancho, ciudad: p.ciudad, rutaLocal: '' };
          return '<tr data-pid="' + esc(id) + '"' + (estado.sel === id ? ' class="sel"' : '') + '><td class="num"><b>' + (p.puntaje || '') + '</b></td><td class="nombre">' + esc(p.negocio) + (p.prompt ? ' <span class="insignia violeta" title="Prompt listo: ' + esc(p.prompt.split('/').pop()) + '">P' + String(p.promptNum).padStart(2, '0') + '</span>' : '') + (it.pendiente ? ' <span class="insignia aviso">Pendiente' + (it.motivo ? ' · ' + esc(it.motivo) : '') + '</span>' : '') + (it.quien ? ' <span class="insignia">☎ ' + esc(it.quien) + '</span>' : '') + '<small>' + esc(p.estado || '') + (p.verificado ? ' · verificado ' + esc(p.verificado) : '') + '</small></td><td>' + esc(p.rubro) + '</td><td>' + esc(p.ciudad) + '</td><td class="tel">' + esc(p.tel) + '</td><td class="num">' + fmt(p.resenas) + '</td><td class="num">' + fmtNota(p.nota) + '</td><td class="cel-gancho"><span>' + esc(p.gancho) + '</span></td><td><label class="check" data-detener><input type="checkbox" data-pedir="' + esc(id) + '"' + (it.pedirDemo ? ' checked' : '') + '><span>' + (it.pedirDemo ? 'Pedida' : '') + '</span></label></td><td class="acciones"><a class="rapida tel' + (p.telDigitos ? '' : ' desactivada') + '" href="tel:+' + esc(p.telDigitos) + '" data-registrar="llamada" data-id="' + esc(id) + '" title="Llamar">' + ico('tel') + '</a><a class="rapida wa' + (esMovil(d) ? '' : ' desactivada') + '" href="' + esc(esMovil(d) ? 'https://wa.me/' + p.telDigitos : '#') + '" target="_blank" rel="noopener" data-registrar="whatsapp" data-id="' + esc(id) + '" title="WhatsApp">' + ico('wa') + '</a></td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="vacio"><b>Nada en esta hoja</b>Prueba otra pestaña o búsqueda.</div>');
  }

  /* ---------- PIPELINE ---------- */
  function renderPipeline() {
    var v = $('#vista-pipeline'), q = norm(estado.filtros.q).trim();
    var cols = {}; ETAPAS.forEach(function (e) { cols[e.id] = []; });
    demos().forEach(function (d) { if (!coincide(d, q)) return; var it = itemLectura(d.id); cols[etapaDe(it)].push({ d: d, it: it }); });
    Object.keys(cols).forEach(function (k) { cols[k].sort(function (a, b) { return (b.it.prioridad || 0) - (a.it.prioridad || 0) || (a.it.proximo || '9').localeCompare(b.it.proximo || '9') || (b.d.puntaje || 0) - (a.d.puntaje || 0); }); });
    $('#barra-acciones').innerHTML = '<span class="silencio" style="font-size:12.5px">Arrastra las tarjetas entre columnas</span>';
    v.innerHTML = '<section class="hero hero--lago hero--corto"><span class="credito">Lago del sur · pxhere</span><span class="saludo">Embudo</span><h2>' + (cols.ofrecida.length + cols.interesado.length + cols.reunion.length) + ' conversaciones abiertas</h2><p>' + cols.vendido.length + ' vendidas · ' + cols['no-interesa'].length + ' descartadas · ' + cols.nueva.length + ' todavía sin ofrecer.</p></section>' +
      '<div class="kanban">' + ETAPAS.map(function (e) {
        var l = cols[e.id], lim = e.id === 'nueva' ? 20 : 200;
        return '<div class="columna" data-etapa="' + e.id + '" style="--e:' + e.color + '"><div class="columna-cab"><span class="etapa-punto" style="--e:' + e.color + '"></span><h3>' + esc(e.nombre) + '</h3><span class="n">' + l.length + '</span></div>' +
          l.slice(0, lim).map(function (x) {
            var dias = diasHasta(x.it.proximo);
            return '<div class="kcard" draggable="true" data-id="' + esc(x.d.id) + '"><b>' + esc(x.d.nombre) + '</b><span>' + esc(x.d.rubro) + ' · ' + esc(x.d.ciudad) + '</span>' + (x.it.pendiente ? '<span class="insignia aviso" style="margin-top:6px">Pendiente' + (x.it.motivo ? ' · ' + esc(x.it.motivo) : '') + '</span>' : '') + '<div class="kpie"><span>' + (x.d.puntaje || 0) + ' pts' + (x.it.prioridad ? ' · ' + '★'.repeat(x.it.prioridad) : '') + (x.it.quien ? ' · ☎ ' + esc(x.it.quien) : '') + '</span>' + (x.it.proximo ? '<span class="fecha' + (dias <= 0 ? ' vencido' : '') + '">↻ ' + esc(fechaCorta(x.it.proximo).slice(0, 5)) + '</span>' : (x.it.fechaOfrecida ? '<span class="fecha">' + esc(fechaCorta(x.it.fechaOfrecida).slice(0, 5)) + '</span>' : '')) + '</div></div>';
          }).join('') + (l.length > lim ? '<div class="mas">+ ' + (l.length - lim) + ' más (ordenadas por puntaje)</div>' : '') + '</div>';
      }).join('') + '</div>';
  }

  /* ---------- CLIENTES ---------- */
  function renderClientes() {
    var v = $('#vista-clientes'), q = norm(estado.filtros.q).trim();
    var l = estado.datos.clientes.filter(function (c) { return !q || norm([c.nombre, c.rubro, c.ciudad, c.tipo].join(' ')).indexOf(q) >= 0; });
    var grupos = [['cliente', 'Sitios de clientes'], ['propio', 'Propios'], ['app', 'Apps'], ['historico', 'Históricos (en C:\\dev)']];
    v.innerHTML = '<section class="hero hero--araucaria hero--corto"><span class="credito">Araucaria · pxhere</span><span class="saludo">Lo que ya está vendido y publicado</span><h2>' + estado.datos.clientes.filter(function (c) { return c.tipo === 'cliente'; }).length + ' sitios de clientes en línea</h2><p>Los sitios reales que se mantienen. Cada uno tiene su repo y su carpeta local.</p></section>' +
      grupos.map(function (g) {
        var gl = l.filter(function (c) { return c.tipo === g[0]; }); if (!gl.length) return '';
        return '<div class="seccion-titulo"><h2>' + esc(g[1]) + '</h2><span>' + gl.length + '</span></div><div class="clientes-grilla">' + gl.map(function (c) {
          return '<div class="cliente">' + (c.captura ? '<img src="' + esc(c.captura) + '" alt="" loading="lazy">' : '<div class="sin">sin captura</div>') + '<div><h3>' + esc(c.nombre) + '</h3><p>' + esc(c.rubro) + (c.ciudad ? ' · ' + esc(c.ciudad) : '') + '</p>' + (c.nota ? '<p class="silencio" style="font-size:11.5px;margin-top:4px">' + esc(c.nota) + '</p>' : '') + '<div class="enlaces">' + (c.url ? '<a class="btn btn-chico" href="' + esc(c.url) + '" target="_blank" rel="noopener">' + ico('abrir') + ' Sitio</a>' : '') + (c.repo ? '<a class="btn btn-chico btn-fantasma" href="' + esc(c.repo.replace(/\.git$/, '')) + '" target="_blank" rel="noopener">' + ico('github') + ' Repo</a>' : '') + (c.carpeta && c.existe ? '<button class="btn btn-chico btn-fantasma" data-abrir="' + esc(c.carpeta) + '">' + ico('carpeta') + ' Carpeta</button>' : '') + '</div></div></div>';
        }).join('') + '</div>';
      }).join('');
  }

  /* ---------- ESTADÍSTICAS ---------- */
  function renderStats() {
    var v = $('#vista-stats'), n = conteos();
    function top(campo, lim, fn) { var m = {}; demos().forEach(function (d) { var k = fn ? fn(d) : d[campo]; if (!k) return; m[k] = (m[k] || 0) + 1; }); return Object.keys(m).map(function (k) { return { k: k, n: m[k] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, lim); }
    function barras(arr, cls) { var max = Math.max.apply(null, arr.map(function (x) { return x.n; }).concat([1])); return '<div class="barras">' + arr.map(function (x) { return '<div class="fila-barra ' + (cls || '') + '"><span title="' + esc(x.k) + '">' + esc(x.k) + '</span><i style="width:' + Math.round(x.n / max * 100) + '%"></i><span class="num">' + x.n + '</span></div>'; }).join('') + '</div>'; }
    var porLote = [['Completas con fotos', estado.datos.totales.porLote.completas], ['Completas parte 2', estado.datos.totales.porLote.parte2], ['Plantillas sin fotos', estado.datos.totales.porLote.plantillas], ['Pto. Montt / Varas', estado.datos.totales.porLote.v2]].map(function (x) { return { k: x[0], n: x[1] }; });
    var rubroCorto = function (d) { return (d.rubro || '').split(/[\/·(]/)[0].trim(); };
    // ofrecidas por semana (últimas 10)
    var sem = [], hoy = new Date(hoyISO() + 'T00:00:00');
    for (var i = 9; i >= 0; i--) { var ini = new Date(hoy); ini.setDate(hoy.getDate() - hoy.getDay() - i * 7 + 1); sem.push({ ini: ini, n: 0, l: String(ini.getDate()).padStart(2, '0') + '/' + String(ini.getMonth() + 1).padStart(2, '0') }); }
    Object.keys(estado.seg.items).forEach(function (k) { (estado.seg.items[k].historial || []).forEach(function (h) { if (h.t !== 'llamada' && h.t !== 'whatsapp' && h.t !== 'ofrecida') return; var f = new Date(h.f); sem.forEach(function (s, j) { var fin = new Date(s.ini); fin.setDate(s.ini.getDate() + 7); if (f >= s.ini && f < fin) s.n++; }); }); });
    var maxS = Math.max.apply(null, sem.map(function (s) { return s.n; }).concat([1]));
    var embudo = ETAPAS.map(function (e) { return { e: e, n: demos().filter(function (d) { return etapaDe(itemLectura(d.id)) === e.id; }).length }; });
    var tasa = n.ofrecidas ? Math.round((n.interesados + n.reunion + n.vendidos) / n.ofrecidas * 100) : 0;
    var pts = demos().filter(function (d) { return d.puntaje; }); var prom = pts.length ? Math.round(pts.reduce(function (a, d) { return a + d.puntaje; }, 0) / pts.length) : 0;
    var peso = demos().reduce(function (a, d) { return a + (d.pesoKB || 0); }, 0);
    v.innerHTML = '<div class="kpis">' +
      '<div class="kpi" data-ir="demos"><b>' + n.demos + '</b><span>demos construidas</span><small>' + n.publicadas + ' publicadas · ' + estado.datos.totales.conFotos + ' con fotos reales</small></div>' +
      '<div class="kpi acento" data-ir="pipeline"><b>' + n.ofrecidas + '</b><span>ofrecidas</span><small>' + Math.round(n.ofrecidas / Math.max(1, n.demos) * 100) + '% del total</small></div>' +
      '<div class="kpi aviso" data-ir="pipeline"><b>' + tasa + '%</b><span>respuesta positiva</span><small>interesado, reunión o venta sobre ofrecidas</small></div>' +
      '<div class="kpi ok" data-ir="pipeline"><b>' + n.vendidos + '</b><span>vendidos</span><small>' + estado.datos.clientes.filter(function (c) { return c.tipo === 'cliente'; }).length + ' sitios de clientes en línea</small></div>' +
      '<div class="kpi info" data-ir="prospectos"><b>' + n.prospectos + '</b><span>prospectos por hacer</span><small>' + n.pedir + ' con demo pedida</small></div>' +
      '<div class="kpi"><b>' + prom + '</b><span>puntaje promedio</span><small>' + fmt(Math.round(peso / 1024)) + ' MB en demos</small></div>' +
      '</div>' +
      '<div class="stats-grilla">' +
      '<section class="panel"><div class="panel-cab"><h2>Actividad por semana</h2><span class="n">llamadas, WhatsApp y ofrecidas</span></div><div class="semanas">' + sem.map(function (s) { return '<div style="height:' + Math.max(3, Math.round(s.n / maxS * 100)) + '%" data-n="' + (s.n || '') + '" data-l="' + s.l + '"></div>'; }).join('') + '</div><div style="height:22px"></div></section>' +
      '<section class="panel"><div class="panel-cab"><h2>Embudo</h2></div><div class="embudo">' + embudo.map(function (x) { return '<div style="border-left:3px solid ' + x.e.color + '"><span>' + esc(x.e.nombre) + '</span><b>' + x.n + '</b></div>'; }).join('') + '</div></section>' +
      '<section class="panel"><div class="panel-cab"><h2>Demos por ciudad</h2></div>' + barras(top('ciudad', 12), 'info') + '</section>' +
      '<section class="panel"><div class="panel-cab"><h2>Demos por rubro</h2></div>' + barras(top(null, 12, rubroCorto), 'violeta') + '</section>' +
      '<section class="panel"><div class="panel-cab"><h2>Por lote</h2></div>' + barras(porLote) + '</section>' +
      '<section class="panel"><div class="panel-cab"><h2>Prospectos por ciudad (Sur)</h2></div>' + barras((function () { var m = {}; prospectos().forEach(function (p) { if (/Sur/.test(p.hoja) && p.ciudad) m[p.ciudad] = (m[p.ciudad] || 0) + 1; }); return Object.keys(m).map(function (k) { return { k: k, n: m[k] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 12); })(), 'ok') + '</section>' +
      '</div>';
  }

  /* ---------- AJUSTES ---------- */
  function renderAjustes() {
    var v = $('#vista-ajustes'), c = estado.seg.config, d = estado.datos, al = config('alertas', []);
    v.innerHTML = '<div class="ajustes-grilla">' +
      '<section class="panel"><div class="panel-cab"><h2>Yo y mi meta</h2></div><div class="campos">' +
        '<label class="campo">Nombre para los mensajes<input data-config="nombre" value="' + esc(config('nombre', 'Yordy Serna')) + '"></label>' +
        '<label class="campo">Mi WhatsApp (sólo dígitos, con 56)<input data-config="telefono" value="' + esc(config('telefono', '56968650001')) + '" class="mono"></label>' +
        '<label class="campo">Meta diaria de contactos<input data-config="objetivo" type="number" min="1" max="50" value="' + esc(config('objetivo', 8)) + '"></label>' +
      '</div></section>' +
      '<section class="panel"><div class="panel-cab"><h2>Mensaje de WhatsApp</h2><div class="der"><button class="btn btn-chico btn-fantasma" data-accion="plantilla-reset">Volver al original</button></div></div><div class="campos">' +
        '<label class="campo">Plantilla<textarea data-config="plantillaWA" rows="8">' + esc(config('plantillaWA', PLANTILLA_WA)) + '</textarea></label>' +
        '<p class="plantilla-ayuda">Se reemplazan <code>{nombre}</code>, <code>{url}</code>, <code>{gancho}</code>, <code>{ciudad}</code> y <code>{yo}</code>. Si la demo no está publicada, <code>{url}</code> avisa en vez de mandar un link roto.</p>' +
        '<label class="campo">Guión de llamada (se muestra en la ficha)<textarea data-config="guion" rows="6">' + esc(config('guion', GUION)) + '</textarea></label>' +
      '</div></section>' +
      '<section class="panel"><div class="panel-cab"><h2>Alertas con fecha</h2></div><div class="lista-alertas">' + (al.length ? al.map(function (a, i) { return '<div class="fila-alerta"><time>' + esc(fechaCorta(a.fecha)) + '</time><span>' + esc(a.texto) + '</span><button class="btn-icono" data-alerta-borrar="' + i + '" title="Quitar">' + ico('x') + '</button></div>'; }).join('') : '<p class="silencio" style="margin:0;font-size:13px">Las de datos/alertas.json las mantiene Claude; acá van las tuyas.</p>') + '</div>' +
        '<div class="campos" style="grid-template-columns:140px 1fr auto;align-items:end"><label class="campo">Fecha<input type="date" id="alerta-fecha" value="' + hoyISO() + '"></label><label class="campo">Texto<input id="alerta-texto" placeholder="Ej.: vence el dominio de …"></label><button class="btn btn-primario" data-accion="alerta-agregar">' + ico('mas') + ' Agregar</button></div></section>' +
      '<section class="panel"><div class="panel-cab"><h2>Inventario</h2></div><div class="info-lista">' +
        '<div><span>Generado</span><span>' + esc(d.generado) + '</span></div><div><span>Excel leído</span><span>' + (d.excelLeido ? 'sí · ' + esc(d.excelFecha) : 'no (sólo carpetas)') + '</span></div><div><span>Servidor</span><span>' + (estado.servidor ? 'conectado · localhost' : (esFile() ? 'modo lectura (file://)' : 'versión compartida, sin servidor')) + '</span></div><div><span>Base</span><span>' + esc(d.base) + '</span></div><div><span>Seguimiento</span><span>' + Object.keys(estado.seg.items).length + ' fichas · ' + esc(estado.seg.actualizado ? fechaCorta(estado.seg.actualizado) + ' ' + estado.seg.actualizado.slice(11, 16) : 'sin cambios') + '</span></div>' +
      '</div><div class="acciones-fila" style="margin-top:14px">' +
        '<button class="btn btn-primario" data-accion="actualizar" ' + (estado.servidor ? '' : 'disabled') + '>' + ico('refrescar') + ' Actualizar con Excel</button>' +
        '<button class="btn" data-accion="actualizar-rapido" ' + (estado.servidor ? '' : 'disabled') + '>' + ico('refrescar') + ' Sólo carpetas</button>' +
        '<button class="btn" data-accion="excel" ' + (estado.servidor ? '' : 'disabled') + '>' + ico('excel') + ' Abrir Excel</button>' +
        '<button class="btn" data-abrir="demos" ' + (estado.servidor ? '' : 'disabled') + '>' + ico('carpeta') + ' Carpeta demos</button>' +
      '</div><p class="plantilla-ayuda" style="margin:12px 0 0">Las capturas se sacan con <code>capturar.ps1</code> (Edge headless, ~4 s por demo). Desde la ficha se puede recapturar una sola.</p></section>' +
      '<section class="panel"><div class="panel-cab"><h2>Respaldo del seguimiento</h2></div><p class="prosa" style="margin-bottom:12px">El servidor guarda una copia por día en <code>datos/respaldos/</code>. Esto exporta o importa el archivo entero.</p><div class="acciones-fila">' +
        '<button class="btn" data-accion="exportar-seg">' + ico('descargar') + ' Exportar JSON</button>' +
        '<label class="btn" title="Junta el archivo con lo tuyo: por negocio gana lo más nuevo, las notas se suman">' + ico('carpeta') + ' Importar y juntar JSON<input type="file" accept="application/json" id="importar-seg" hidden></label>' +
        '<button class="btn" data-accion="csv">' + ico('descargar') + ' CSV de demos</button>' +
        '<button class="btn btn-peligro" data-accion="borrar-seg">Borrar todo el seguimiento</button>' +
      '</div></section>' +
      '<section class="panel"><div class="panel-cab"><h2>Atajos</h2></div><div class="atajos"><kbd>/</kbd><span>buscar</span><kbd>Esc</kbd><span>cerrar ficha o limpiar búsqueda</span><kbd>j</kbd> <span>siguiente</span><kbd>k</kbd><span>anterior</span><kbd>Enter</kbd><span>abrir ficha</span><kbd>o</kbd><span>marcar / desmarcar ofrecida</span><kbd>1–7</kbd><span>cambiar de sección</span><kbd>t</kbd><span>tema claro / oscuro</span></div></section>' +
      '</div>';
  }

  /* ---------- FICHA ---------- */
  function abrirFicha(id) {
    var d = buscarDemo(id), p = d ? null : buscarProspecto(id);
    if (!d && !p) return;
    estado.sel = id; estado.idx = estado.visibles.indexOf(id);
    var f = $('#ficha'); f.hidden = false; $('#velo').hidden = false; $('#app').classList.add('con-ficha');
    f.innerHTML = d ? fichaDemo(d) : fichaProspecto(p);
    f.scrollTop = 0;
    requestAnimationFrame(function () { f.classList.add('abierta'); });
    $$('.tarjeta.sel, .tabla tr.sel').forEach(function (e) { e.classList.remove('sel'); });
    $$('.tarjeta[data-id="' + CSS.escape(id) + '"], tr[data-id="' + CSS.escape(id) + '"], tr[data-pid="' + CSS.escape(id) + '"]').forEach(function (e) { e.classList.add('sel'); });
    var hash = '#' + estado.vista + '/' + encodeURIComponent(id); if (location.hash !== hash) history.replaceState(null, '', hash);
    if (d && d.queFotos) {
      fetch((estado.servidor ? '/demos/' : '../../demos/') + d.queFotos.split('/').map(encodeURIComponent).join('/')).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) { var z = $('#que-fotos'); if (z && t) z.innerHTML = md(t); }).catch(function () { });
    }
  }
  function cerrarFicha(silencio) {
    var f = $('#ficha'); if (f.hidden) return;
    f.classList.remove('abierta'); $('#velo').hidden = true; $('#app').classList.remove('con-ficha');
    setTimeout(function () { f.hidden = true; f.innerHTML = ''; }, 230);
    estado.sel = null;
    $$('.tarjeta.sel, .tabla tr.sel').forEach(function (e) { e.classList.remove('sel'); });
    if (!silencio) history.replaceState(null, '', '#' + estado.vista);
  }
  function md(t) {
    var h = esc(t).split('\n').map(function (l) {
      if (/^#{1,3}\s/.test(l)) return '<h3>' + l.replace(/^#+\s*/, '') + '</h3>';
      if (/^\s*[-*]\s/.test(l)) return '<li>' + l.replace(/^\s*[-*]\s/, '') + '</li>';
      if (/^\s*\d+\.\s/.test(l)) return '<li>' + l.replace(/^\s*\d+\.\s/, '') + '</li>';
      if (!l.trim()) return '</p><p>';
      return l + ' ';
    }).join('').replace(/(<li>.*?<\/li>)+/g, function (m) { return '<ul>' + m + '</ul>'; }).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
    return '<p>' + h + '</p>';
  }
  function bloqueQuienPendiente(id, it) {
    return '<div class="seguimiento-fila quien-pendiente">' +
      '<div class="campo"><span>Quién lo llamó</span><div class="segmento">' + PERSONAS.map(function (q) { return '<button type="button" class="' + (it.quien === q ? 'activo' : '') + '" data-quien="' + q + '" data-id="' + esc(id) + '">' + q + '</button>'; }).join('') + (it.quien && PERSONAS.indexOf(it.quien) < 0 ? '<button type="button" class="activo" data-quien="' + esc(it.quien) + '" data-id="' + esc(id) + '">' + esc(it.quien) + '</button>' : '') + (it.quien ? '<button type="button" class="quitar" data-quien="" data-id="' + esc(id) + '" title="Quitar">✕</button>' : '') + '</div></div>' +
      '<div class="campo"><span>Pendiente</span><div class="pendiente-caja"><label class="check' + (it.pendiente ? ' on' : '') + '"><input type="checkbox" data-pendiente="' + esc(id) + '"' + (it.pendiente ? ' checked' : '') + '><span>' + (it.pendiente ? 'Pendiente' : 'No respondió o nos dejó esperando') + '</span></label>' +
        (it.pendiente ? '<select class="selector" data-campo="motivo" data-id="' + esc(id) + '">' + MOTIVOS.map(function (m) { return '<option value="' + esc(m) + '"' + (it.motivo === m ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') + '</select>' : '') + '</div></div>' +
      '</div>';
  }
  function bloqueSeguimiento(id, it, esProspecto) {
    return '<div class="seguimiento">' +
      '<div class="seguimiento-fila"><label class="switch"><input type="checkbox" data-ofrecida="' + esc(id) + '"' + (it.ofrecida ? ' checked' : '') + '><span>' + (it.ofrecida ? 'Ofrecida el ' + esc(fechaCorta(it.fechaOfrecida)) : 'Todavía no ofrecida') + '</span></label>' +
        '<div class="der estrellas" title="Prioridad">' + [1, 2, 3].map(function (n) { return '<button data-prioridad="' + n + '" data-id="' + esc(id) + '" class="' + (it.prioridad >= n ? 'on' : '') + '" aria-label="Prioridad ' + n + '">★</button>'; }).join('') + '</div></div>' +
      '<div class="etapas">' + ETAPAS.map(function (e) { return '<button class="chip' + (etapaDe(it) === e.id ? ' activo' : '') + '" data-etapa-set="' + e.id + '" data-id="' + esc(id) + '" style="' + (etapaDe(it) === e.id ? '--acento:' + e.color + ';--acento-2:' + e.color + ';--acento-suave:' + e.color + '22' : '') + '"><span class="etapa-punto" style="--e:' + e.color + '"></span>' + esc(e.nombre) + '</button>'; }).join('') + '</div>' +
      '<div class="campos"><label class="campo">Próximo contacto<input type="date" data-campo="proximo" data-id="' + esc(id) + '" value="' + esc(it.proximo || '') + '"></label>' +
        '<label class="campo">Canal<select data-campo="canal" data-id="' + esc(id) + '"><option value="">—</option>' + CANALES.map(function (c) { return '<option value="' + c + '"' + (it.canal === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></label>' +
        '<div class="campo"><span>Rápido</span><div class="acciones-fila"><button class="btn btn-chico" data-proximo-en="1" data-id="' + esc(id) + '">mañana</button><button class="btn btn-chico" data-proximo-en="3" data-id="' + esc(id) + '">3 días</button><button class="btn btn-chico" data-proximo-en="7" data-id="' + esc(id) + '">1 semana</button></div></div>' +
      '</div>' +
      bloqueQuienPendiente(id, it) +
      (esProspecto ? '<label class="check"><input type="checkbox" data-pedir="' + esc(id) + '"' + (it.pedirDemo ? ' checked' : '') + '><span>Pedir demo (Claude la construye primero en la próxima sesión)</span></label>' : '') +
      '</div>';
  }
  function bloqueNotas(id, it) {
    return '<section class="ficha-seccion"><h3>Notas <span class="der silencio">' + it.notas.length + '</span></h3><div class="notas">' +
      '<div class="nota-nueva"><textarea class="entrada" data-nota-texto="' + esc(id) + '" placeholder="Qué dijo, con quién hablé, qué quedó pendiente… (Ctrl+Enter guarda)"></textarea><button class="btn btn-primario" data-nota-agregar="' + esc(id) + '">Guardar</button></div>' +
      it.notas.slice().reverse().map(function (n, i) { return '<div class="nota"><time>' + esc(fechaCorta(n.f)) + ' ' + esc(n.f.slice(11, 16)) + (n.q ? ' · ' + esc(n.q) : '') + '</time>' + esc(n.t) + '<button class="borrar" data-nota-borrar="' + (it.notas.length - 1 - i) + '" data-id="' + esc(id) + '" title="Borrar">✕</button></div>'; }).join('') +
      (it.historial.length ? '<div class="historial">' + it.historial.slice(-8).reverse().map(function (h) { return '<span>' + esc(fechaCorta(h.f).slice(0, 5)) + ' ' + esc(h.t) + (h.q ? ' · ' + esc(h.q) : '') + '</span>'; }).join('') + '</div>' : '') +
      '</div></section>';
  }
  function fichaDemo(d) {
    var it = item(d.id), img = imagenDe(d), col = (d.identidad && d.identidad.colores) || [], e = etapaInfo(etapaDe(it));
    return '<div class="ficha-cab" style="--c1:' + esc(col[0] || '#1a2430') + ';--c2:' + esc(col[col.length - 1] || '#2a3a4c') + '">' +
      (img ? '<img id="ficha-img" src="' + esc(img) + '" alt="Captura de la demo">' : '<div class="sin">Sin captura todavía</div>') +
      (d.capturaMovil ? '<div class="vistas"><button class="btn-chico btn activo" data-vista-cap="pc">Escritorio</button><button class="btn-chico btn" data-vista-cap="movil">Móvil</button></div>' : '') +
      '<button class="btn-icono cerrar" data-accion="cerrar-ficha" aria-label="Cerrar">' + ico('x') + '</button>' +
      '<div class="sobre">' + (d.publicada ? '<span class="insignia ok">En línea</span>' : '<span class="insignia">Sin publicar</span>') + (d.fotosReales ? '<span class="insignia acento">Fotos reales</span>' : '<span class="insignia">Fotos de banco</span>') + (d.enPortafolio ? '<span class="insignia violeta">En el portafolio</span>' : '') + '<span class="insignia">' + esc(d.loteEtiqueta) + '</span></div>' +
      '</div>' +
      '<div class="ficha-cuerpo">' +
      '<div class="ficha-titulo"><span class="num">' + (d.num ? '#' + d.num + ' · ' : '') + esc(d.carpeta) + '</span><h2>' + esc(d.nombre) + '</h2><p>' + esc(d.rubro || '—') + (d.ciudad ? ' · ' + esc(d.ciudad) : '') + (d.zona ? ' · ' + esc(d.zona) : '') + '</p></div>' +
      '<div class="ficha-acciones">' +
        '<a class="btn llamar' + (d.telDigitos ? '' : ' desactivado') + '" href="' + esc(linkTel(d)) + '" data-registrar="llamada" data-id="' + esc(d.id) + '">' + ico('tel') + ' ' + (d.tel ? esc(d.tel) : 'Sin teléfono') + '</a>' +
        '<a class="btn wa' + (esMovil(d) ? '' : ' desactivado') + '" href="' + esc(esMovil(d) ? linkWA(d) : '#') + '" target="_blank" rel="noopener" data-registrar="whatsapp" data-id="' + esc(d.id) + '" title="' + esc(esMovil(d) ? textoWA(d) : 'No es celular') + '">' + ico('wa') + ' WhatsApp</a>' +
        '<button class="btn" data-accion="previa" data-id="' + esc(d.id) + '">' + ico('ojo') + ' Vista previa</button>' +
        (d.url ? '<a class="btn btn-ok" href="' + esc(d.url) + '" target="_blank" rel="noopener">' + ico('abrir') + ' Publicada</a>' : (estado.servidor ? '<a class="btn" href="' + esc(rutaDemo(d)) + '" target="_blank" rel="noopener">' + ico('abrir') + ' Abrir local</a>' : '')) +
        (d.url ? '<button class="btn" data-copiar="' + esc(d.url) + '">' + ico('copiar') + ' Copiar link</button>' : '') +
        (estado.servidor ? '<button class="btn" data-abrir="demos/' + esc(d.carpeta) + '">' + ico('carpeta') + ' Carpeta</button>' : '') +
        (d.repo ? '<a class="btn btn-fantasma" href="' + esc(d.repo.replace(/\.git$/, '')) + '" target="_blank" rel="noopener">' + ico('github') + ' Repo</a>' : '') +
        (esMovil(d) ? '<button class="btn btn-fantasma" data-copiar-wa="' + esc(d.id) + '">' + ico('copiar') + ' Copiar mensaje</button>' : '') +
      '</div>' +
      (!d.url && esMovil(d) ? '<div class="aviso" style="margin:0">' + ico('alerta') + ' La demo no está publicada: el mensaje de WhatsApp no lleva link. Publícala primero o mándale una captura.</div>' : '') +
      '<section class="ficha-seccion"><h3>Seguimiento <span class="der" style="color:' + e.color + '">' + esc(e.nombre) + (it.pendiente ? ' · pendiente' : '') + '</span></h3>' + bloqueSeguimiento(d.id, it, false) + '</section>' +
      bloqueNotas(d.id, it) +
      (d.gancho ? '<section class="ficha-seccion"><h3>Gancho de llamada</h3><blockquote class="gancho">' + esc(d.gancho) + '</blockquote></section>' : '') +
      '<section class="ficha-seccion"><h3>Datos del negocio</h3><div class="datos">' +
        '<div class="dato"><span>Reseñas</span><b class="mono">' + fmt(d.resenas) + '</b></div><div class="dato"><span>Nota</span><b class="mono">' + (d.nota ? '★ ' + fmtNota(d.nota) : '–') + '</b></div><div class="dato"><span>Puntaje</span><b class="mono">' + (d.puntaje || '–') + '</b></div>' +
        '<div class="dato"><span>Presencia</span><b>' + esc(d.presencia || '–') + '</b></div><div class="dato"><span>Sitio actual</span><b>' + (d.sitio && d.sitio !== '-' ? '<a href="' + esc(/^https?:/.test(d.sitio) ? d.sitio : 'https://' + d.sitio) + '" target="_blank" rel="noopener">' + esc(d.sitio) + '</a>' : '–') + '</b></div><div class="dato"><span>Verificado</span><b class="mono">' + esc(d.verificado || '–') + '</b></div>' +
        '<div class="dato"><span>Excel</span><b>' + (d.hojaExcel ? esc(d.hojaExcel) + ' · fila ' + d.filaExcel + '<br><span style="text-transform:none;letter-spacing:0;font-size:12px;color:var(--texto-2)">' + esc(d.estadoExcel) + '</span>' : 'sin fila') + '</b></div><div class="dato"><span>Peso</span><b class="mono">' + fmt(Math.round(d.pesoKB / 1024 * 10) / 10) + ' MB</b></div><div class="dato"><span>Modificada</span><b class="mono">' + esc(fechaCorta(d.modificado)) + '</b></div>' +
      '</div></section>' +
      (d.pieza || (d.chips || []).length ? '<section class="ficha-seccion"><h3>Pieza firma</h3>' + (d.pieza ? '<p class="prosa" style="color:var(--texto);font-weight:600;margin-bottom:8px">' + esc(d.pieza) + '</p>' : '') + ((d.chips || []).length ? '<div class="chips-lista">' + (d.chips || []).map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</div>' : '') + (d.textoPortafolio ? '<p class="prosa" style="margin-top:10px">' + esc(d.textoPortafolio) + '</p>' : '') + '</section>' : '') +
      (d.identidad ? '<section class="ficha-seccion"><h3>Identidad</h3>' + (d.identidad.direccion ? '<p class="prosa" style="margin-bottom:10px"><b style="color:var(--texto)">' + esc(d.identidad.direccion) + '</b></p>' : '') + '<div class="tipos"><div class="tipo"><span>Display</span><b>' + esc(d.identidad.display || '–') + '</b></div><div class="tipo"><span>Cuerpo</span><b>' + esc(d.identidad.cuerpo || '–') + '</b></div><div class="tipo"><span>Dato</span><b>' + esc(d.identidad.mono || '–') + '</b></div></div>' + (col.length ? '<div class="muestras" style="margin-top:10px">' + col.map(function (c) { return '<span class="muestra" style="background:' + esc(c) + '" title="' + esc(c) + '" data-copiar="' + esc(c) + '"></span>'; }).join('') + '</div>' : '') + (d.ambiente ? '<p class="prosa" style="margin-top:10px">Ambiente de portada: <b style="color:var(--texto)">' + esc(d.ambiente) + '</b></p>' : '') + '</section>' : '') +
      (d.queFotos ? '<section class="ficha-seccion"><h3>Qué fotos pedirle</h3><div class="md" id="que-fotos"><p class="silencio">Cargando…</p></div></section>' : '') +
      '<section class="ficha-seccion"><h3>Guión de llamada</h3><div class="md"><p style="white-space:pre-line">' + esc(config('guion', GUION)) + '</p></div></section>' +
      (estado.servidor ? '<section class="ficha-seccion"><h3>Captura</h3><div class="acciones-fila"><button class="btn btn-chico" data-recapturar="' + esc(d.slug) + '">' + ico('camara') + ' Recapturar (escritorio y móvil)</button></div></section>' : '') +
      '</div>';
  }
  function fichaProspecto(p) {
    var id = idProspecto(p), it = item(id), d = { id: id, nombre: p.negocio, tel: p.tel, telDigitos: p.telDigitos, url: '', gancho: p.gancho, ciudad: p.ciudad };
    return '<div class="ficha-cab" style="aspect-ratio:auto;min-height:120px;--c1:#1a2430;--c2:#2a3a4c"><div class="sin" style="position:relative;height:120px">Prospecto sin demo</div><button class="btn-icono cerrar" data-accion="cerrar-ficha" aria-label="Cerrar">' + ico('x') + '</button></div>' +
      '<div class="ficha-cuerpo">' +
      '<div class="ficha-titulo"><span class="num">' + esc(p.hoja) + ' · fila ' + p.fila + '</span><h2>' + esc(p.negocio) + '</h2><p>' + esc(p.rubro || '—') + (p.ciudad ? ' · ' + esc(p.ciudad) : '') + (p.zona ? ' · ' + esc(p.zona) : '') + '</p></div>' +
      '<div class="ficha-acciones"><a class="btn llamar' + (p.telDigitos ? '' : ' desactivado') + '" href="tel:+' + esc(p.telDigitos) + '" data-registrar="llamada" data-id="' + esc(id) + '">' + ico('tel') + ' ' + (p.tel ? esc(p.tel) : 'Sin teléfono') + '</a><a class="btn wa' + (esMovil(d) ? '' : ' desactivado') + '" href="' + esc(esMovil(d) ? 'https://wa.me/' + p.telDigitos : '#') + '" target="_blank" rel="noopener" data-registrar="whatsapp" data-id="' + esc(id) + '">' + ico('wa') + ' WhatsApp</a>' + (p.sitio && p.sitio !== '-' ? '<a class="btn" href="' + esc(/^https?:/.test(p.sitio) ? p.sitio : 'https://' + p.sitio) + '" target="_blank" rel="noopener">' + ico('abrir') + ' Sitio actual</a>' : '') + '</div>' +
      (p.prompt ? '<section class="ficha-seccion"><h3>Prompt para Opus <span class="der silencio">' + esc(p.prompt.split('/').pop()) + '</span></h3><div class="acciones-fila"><button class="btn btn-primario" data-prompt-copiar="' + esc(p.prompt) + '">' + ico('copiar') + ' Copiar prompt</button><button class="btn" data-prompt-ver="' + esc(p.prompt) + '" data-nombre="' + esc(p.negocio) + '">' + ico('ojo') + ' Ver prompt</button></div><p class="plantilla-ayuda" style="margin:8px 0 0">Se pega entero en una sesión nueva de Claude Code con directorio devs. Antes, leer demos\\' + esc(p.promptTanda) + '\\00-REGLAS-COMUNES.txt.</p></section>' : '') +
      '<section class="ficha-seccion"><h3>Seguimiento' + (it.pendiente ? ' <span class="der" style="color:var(--aviso)">pendiente</span>' : '') + '</h3>' + bloqueSeguimiento(id, it, true) + '</section>' +
      bloqueNotas(id, it) +
      (p.gancho ? '<section class="ficha-seccion"><h3>Gancho de llamada</h3><blockquote class="gancho">' + esc(p.gancho) + '</blockquote></section>' : '') +
      '<section class="ficha-seccion"><h3>Datos</h3><div class="datos"><div class="dato"><span>Reseñas</span><b class="mono">' + fmt(p.resenas) + '</b></div><div class="dato"><span>Nota</span><b class="mono">' + (p.nota ? '★ ' + fmtNota(p.nota) : '–') + '</b></div><div class="dato"><span>Puntaje</span><b class="mono">' + (p.puntaje || '–') + '</b></div><div class="dato"><span>Presencia</span><b>' + esc(p.presencia || '–') + '</b></div><div class="dato"><span>Estado Excel</span><b>' + esc(p.estado || '–') + '</b></div><div class="dato"><span>Verificado</span><b class="mono">' + esc(p.verificado || '–') + '</b></div><div class="dato"><span>Origen</span><b>' + esc(p.origen || '–') + '</b></div></div></section>' +
      '</div>';
  }
  function refrescarFicha() { if (estado.sel) { var f = $('#ficha'), y = f.scrollTop, d = buscarDemo(estado.sel), p = d ? null : buscarProspecto(estado.sel); if (!d && !p) return; f.innerHTML = d ? fichaDemo(d) : fichaProspecto(p); f.scrollTop = y; if (d && d.queFotos) { fetch((estado.servidor ? '/demos/' : '../../demos/') + d.queFotos.split('/').map(encodeURIComponent).join('/')).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) { var z = $('#que-fotos'); if (z && t) z.innerHTML = md(t); }).catch(function () { }); } } }

  /* ---------- acciones sobre el seguimiento ---------- */
  function setOfrecida(id, val) {
    var it = item(id);
    it.ofrecida = !!val;
    if (val) { if (!it.fechaOfrecida) it.fechaOfrecida = hoyISO(); if (!it.resultado) it.resultado = ''; registrar(id, 'ofrecida'); }
    else { it.fechaOfrecida = ''; it.resultado = ''; tocar(id); }
    toast(val ? 'Marcada como ofrecida' : 'Desmarcada');
    render(); refrescarFicha();
  }
  function setEtapa(id, etapa) {
    var it = item(id);
    if (etapa === 'nueva') { it.ofrecida = false; it.resultado = ''; it.fechaOfrecida = ''; }
    else if (etapa === 'ofrecida') { it.ofrecida = true; it.resultado = ''; if (!it.fechaOfrecida) it.fechaOfrecida = hoyISO(); }
    else { it.ofrecida = true; it.resultado = etapa; if (!it.fechaOfrecida) it.fechaOfrecida = hoyISO(); }
    registrar(id, 'etapa:' + etapa);
    render(); refrescarFicha();
  }
  function previa(d) {
    var m = $('#modal'); m.hidden = false;
    estado.previaDemo = d;
    $('#modal-titulo').textContent = (d.num ? '#' + d.num + ' · ' : '') + d.nombre;
    var src = estado.servidor ? d.rutaLocal : rutaDemo(d);
    var ifr = $('#modal-iframe');
    if (src) { ifr.removeAttribute('srcdoc'); ifr.src = src; }
    else { ifr.src = 'about:blank'; ifr.srcdoc = previaCapturas(d, false); }   // sin servidor ni publicación: las capturas
    $('#modal-nueva').href = src || (d.captura ? d.captura : '#');
    $('#modal-marco').classList.remove('movil'); $('#modal-vista').textContent = 'Ver en móvil';
  }
  function previaCapturas(d, movil) {
    var img = movil ? (d.capturaMovil || d.captura) : d.captura;
    if (!img) return '<body style="margin:0;background:#111;color:#999;font:15px system-ui;display:grid;place-items:center;height:100vh">Sin captura todavía</body>';
    return '<body style="margin:0;background:#111"><img src="' + esc(new URL(img, location.href).href) + '" style="display:block;width:100%;height:auto" alt=""></body>';
  }
  function verPrompt(ruta, nombre) {
    leerTexto(ruta).then(function (txt) {
      var m = $('#modal'); m.hidden = false; estado.previaDemo = null;
      $('#modal-titulo').textContent = 'Prompt · ' + (nombre || ruta.split('/').pop());
      var ifr = $('#modal-iframe'); ifr.src = 'about:blank';
      ifr.srcdoc = '<body style="margin:0;background:#0f151c;color:#e9eef3"><pre style="margin:0;padding:28px 32px;white-space:pre-wrap;font:13.5px/1.6 ui-monospace,Consolas,monospace">' + esc(txt) + '</pre></body>';
      $('#modal-nueva').href = ruta; $('#modal-marco').classList.remove('movil'); $('#modal-vista').textContent = 'Ver en móvil';
    }).catch(function () { toast('No se pudo leer el prompt', 'error'); });
  }
  function cerrarPrevia() { var m = $('#modal'); m.hidden = true; var ifr = $('#modal-iframe'); ifr.removeAttribute('srcdoc'); ifr.src = 'about:blank'; estado.previaDemo = null; }
  function descargar(nombre, contenido, tipo) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([contenido], { type: tipo || 'text/plain;charset=utf-8' })); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function csvDemos(lista) {
    var cab = ['num', 'nombre', 'rubro', 'ciudad', 'telefono', 'resenas', 'nota', 'puntaje', 'lote', 'publicada', 'url', 'etapa', 'quien_llamo', 'pendiente', 'motivo', 'ofrecida_el', 'proximo_contacto', 'prioridad', 'notas'];
    var filas = lista.map(function (d) { var it = itemLectura(d.id); return [d.num || '', d.nombre, d.rubro, d.ciudad, d.tel, d.resenas, String(d.nota || '').replace('.', ','), d.puntaje, d.loteEtiqueta, d.publicada ? 'sí' : 'no', d.url, etapaInfo(etapaDe(it)).nombre, it.quien || '', it.pendiente ? 'sí' : '', it.motivo || '', fechaCorta(it.fechaOfrecida), fechaCorta(it.proximo), it.prioridad || '', (it.notas || []).map(function (n) { return fechaCorta(n.f) + (n.q ? ' ' + n.q : '') + ': ' + n.t; }).join(' | ')]; });
    var txt = '\uFEFF' + [cab].concat(filas).map(function (f) { return f.map(function (c) { c = String(c == null ? '' : c); return /[;"\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(';'); }).join('\r\n');
    descargar('demos-' + hoyISO() + '.csv', txt, 'text/csv;charset=utf-8');
  }
  function csvProspectos() {
    var cab = ['hoja', 'puntaje', 'negocio', 'rubro', 'ciudad', 'telefono', 'resenas', 'nota', 'gancho', 'estado', 'demo_pedida'];
    var filas = prospectos().map(function (p) { return [p.hoja, p.puntaje, p.negocio, p.rubro, p.ciudad, p.tel, p.resenas, String(p.nota || '').replace('.', ','), p.gancho, p.estado, itemLectura(idProspecto(p)).pedirDemo ? 'sí' : '']; });
    var txt = '\uFEFF' + [cab].concat(filas).map(function (f) { return f.map(function (c) { c = String(c == null ? '' : c); return /[;"\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(';'); }).join('\r\n');
    descargar('prospectos-' + hoyISO() + '.csv', txt, 'text/csv;charset=utf-8');
  }
  function actualizarInventario(rapido) {
    if (!estado.servidor) { toast('Abre la app con Prospector.cmd para actualizar', 'error'); return; }
    var b = $('#btn-actualizar'); b.disabled = true; b.querySelector('svg').classList.add('girando');
    toast(rapido ? 'Releyendo carpetas…' : 'Releyendo carpetas y Excel… (unos segundos)');
    fetch('/api/actualizar' + (rapido ? '?excel=0' : ''), { method: 'POST' }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) throw new Error(j.error || 'falló');
      return fetch('/api/demos', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) { estado.datos = d; render(); refrescarFicha(); toast('Inventario al día: ' + d.totales.demos + ' demos, ' + d.totales.prospectos + ' prospectos (' + j.segundos + ' s)', 'ok'); });
    }).catch(function (e) { toast('No se pudo actualizar: ' + e.message, 'error'); }).then(function () { b.disabled = false; b.querySelector('svg').classList.remove('girando'); });
  }

  /* ---------- eventos ---------- */
  function eventos() {
    $$('.nav-item').forEach(function (b) { b.addEventListener('click', function () { irA(b.dataset.vista); }); });
    $('#btn-menu').addEventListener('click', function () { $('#app').classList.toggle('menu'); });
    $('#btn-tema').addEventListener('click', cambiarTema);
    $('#btn-actualizar').addEventListener('click', function () { actualizarInventario(false); });
    $('#velo').addEventListener('click', function () { cerrarFicha(); });
    $('#modal-cerrar').addEventListener('click', cerrarPrevia);
    $('#modal').addEventListener('click', function (e) { if (e.target === $('#modal')) cerrarPrevia(); });
    $('#modal-vista').addEventListener('click', function () {
      var m = $('#modal-marco'); m.classList.toggle('movil'); var movil = m.classList.contains('movil');
      $('#modal-vista').textContent = movil ? 'Ver en escritorio' : 'Ver en móvil';
      var ifr = $('#modal-iframe'); if (ifr.hasAttribute('srcdoc') && estado.previaDemo) ifr.srcdoc = previaCapturas(estado.previaDemo, movil);
    });
    var buscar = $('#buscar');
    buscar.addEventListener('input', debounce(function () { estado.filtros.q = buscar.value; if (estado.vista === 'hoy' || estado.vista === 'stats' || estado.vista === 'ajustes') { if (buscar.value.trim()) irA('demos'); } else render(); }, 120));
    window.addEventListener('hashchange', function () { var h = leerHash(); if (h.vista !== estado.vista) irA(h.vista, h.id); else if (h.id && h.id !== estado.sel) abrirFicha(h.id); });

    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-accion],[data-modo],[data-ir],[data-id],[data-pid],[data-abrir],[data-copiar],[data-copiar-wa],[data-etapa-set],[data-prioridad],[data-proximo-en],[data-nota-agregar],[data-nota-borrar],[data-hoja],[data-porden],[data-orden],[data-recapturar],[data-vista-cap],[data-alerta-borrar],[data-prompt-copiar],[data-prompt-ver],[data-quien],[data-usuario],.chip[data-filtro]');
      if (!t) return;
      if (t.closest('[data-detener]')) return; // los checks se manejan en change
      var id = t.dataset.id;
      if (t.dataset.usuario) { setUsuario(t.dataset.usuario); return; }
      if (t.dataset.quien !== undefined) { item(id).quien = t.dataset.quien; tocar(id); render(); refrescarFicha(); return; }
      if (t.dataset.promptCopiar) { leerTexto(t.dataset.promptCopiar).then(function (txt) { copiar(txt, 'Prompt copiado: pégalo en una sesión nueva'); }).catch(function () { toast('No se pudo leer el prompt', 'error'); }); return; }
      if (t.dataset.promptVer) { verPrompt(t.dataset.promptVer, t.dataset.nombre); return; }
      if (t.classList.contains('chip') && t.dataset.filtro) { estado.filtros[t.dataset.filtro] = !estado.filtros[t.dataset.filtro]; render(); return; }
      if (t.dataset.registrar) { registrar(id, t.dataset.registrar); if (t.classList.contains('desactivada') || t.classList.contains('desactivado')) e.preventDefault(); e.stopPropagation(); return; }
      if (t.dataset.modo) { estado.modo = t.dataset.modo; localStorage.setItem('prospector.modo', estado.modo); render(); return; }
      if (t.dataset.ir) { irA(t.dataset.ir); return; }
      if (t.dataset.hoja) { estado.filtros.hoja = t.dataset.hoja; render(); return; }
      if (t.dataset.porden) { var o = estado.prospectoOrden; if (o.campo === t.dataset.porden) o.dir = -o.dir; else { o.campo = t.dataset.porden; o.dir = /negocio|rubro|ciudad/.test(o.campo) ? 1 : -1; } render(); return; }
      if (t.dataset.orden) { estado.filtros.orden = t.dataset.orden; render(); return; }
      if (t.dataset.abrir) { abrirRuta(t.dataset.abrir); return; }
      if (t.dataset.copiar) { copiar(t.dataset.copiar, 'Copiado: ' + t.dataset.copiar); return; }
      if (t.dataset.copiarWa) { var dd = buscarDemo(t.dataset.copiarWa); if (dd) copiar(textoWA(dd), 'Mensaje copiado'); return; }
      if (t.dataset.etapaSet) { setEtapa(id, t.dataset.etapaSet); return; }
      if (t.dataset.prioridad) { var it = item(id), n = Number(t.dataset.prioridad); it.prioridad = it.prioridad === n ? 0 : n; tocar(id); render(); refrescarFicha(); return; }
      if (t.dataset.proximoEn) { var it2 = item(id), f = new Date(); f.setDate(f.getDate() + Number(t.dataset.proximoEn)); it2.proximo = f.getFullYear() + '-' + String(f.getMonth() + 1).padStart(2, '0') + '-' + String(f.getDate()).padStart(2, '0'); tocar(id); render(); refrescarFicha(); toast('Seguimiento el ' + fechaCorta(it2.proximo)); return; }
      if (t.dataset.notaAgregar) { var ta = $('[data-nota-texto="' + CSS.escape(t.dataset.notaAgregar) + '"]'); agregarNota(t.dataset.notaAgregar, ta.value); return; }
      if (t.dataset.notaBorrar !== undefined) { var it3 = item(id); it3.notas.splice(Number(t.dataset.notaBorrar), 1); tocar(id); refrescarFicha(); render(); return; }
      if (t.dataset.recapturar) { recapturar(t.dataset.recapturar, t); return; }
      if (t.dataset.vistaCap) { var d2 = buscarDemo(estado.sel); if (!d2) return; $$('[data-vista-cap]').forEach(function (b) { b.classList.toggle('activo', b === t); }); $('#ficha-img').src = imagenDe(d2, t.dataset.vistaCap === 'movil'); return; }
      if (t.dataset.alertaBorrar !== undefined) { var al = config('alertas', []).slice(); al.splice(Number(t.dataset.alertaBorrar), 1); estado.seg.config.alertas = al; guardar(); render(); return; }
      if (t.dataset.accion) { accion(t.dataset.accion, t); return; }
      if (t.dataset.pid) { abrirFicha(t.dataset.pid); return; }
      if (id && (t.classList.contains('tarjeta') || t.tagName === 'TR' || t.classList.contains('cola-item') || t.classList.contains('kcard') || t.tagName === 'A' && t.closest('.alerta'))) { if (t.tagName === 'A') e.preventDefault(); if (t.classList.contains('kcard') || t.closest('.alerta')) { irA('demos', id); } else abrirFicha(id); }
    });
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t.dataset.ofrecida) { setOfrecida(t.dataset.ofrecida, t.checked); return; }
      if (t.dataset.pedir) { var it = item(t.dataset.pedir); it.pedirDemo = t.checked; tocar(t.dataset.pedir); toast(t.checked ? 'Demo pedida: se construye en la próxima sesión' : 'Pedido quitado'); render(); refrescarFicha(); return; }
      if (t.dataset.pendiente) { var itp = item(t.dataset.pendiente); itp.pendiente = t.checked; if (!t.checked) itp.motivo = ''; else if (!itp.motivo) itp.motivo = MOTIVOS[0]; tocar(t.dataset.pendiente); toast(t.checked ? 'Marcado pendiente: ' + itp.motivo : 'Ya no está pendiente'); render(); refrescarFicha(); return; }
      if (t.dataset.filtro) { estado.filtros[t.dataset.filtro] = t.value; render(); return; }
      if (t.dataset.campo) { var it2 = item(t.dataset.id); it2[t.dataset.campo] = t.value; tocar(t.dataset.id); render(); if (t.dataset.campo === 'motivo') refrescarFicha(); return; }
      if (t.dataset.config !== undefined) { estado.seg.config[t.dataset.config] = t.type === 'number' ? Number(t.value) : t.value; guardar(); toast('Ajuste guardado'); return; }
      if (t.id === 'importar-seg' && t.files[0]) { var r = new FileReader(); r.onload = function () { try { var n = juntarSeguimiento(normSeg(JSON.parse(r.result))); guardarAhora(); render(); refrescarFicha(); toast('Seguimiento juntado: ' + n + ' fichas (gana lo más nuevo por negocio; las notas se suman)', 'ok'); } catch (err) { toast('Archivo inválido', 'error'); } }; r.readAsText(t.files[0]); t.value = ''; }
    });
    document.addEventListener('keydown', function (e) {
      var enCampo = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable;
      if (e.key === 'Escape') { if (!$('#modal').hidden) { cerrarPrevia(); return; } if (!$('#ficha').hidden) { cerrarFicha(); return; } if (enCampo && e.target.id === 'buscar') { e.target.value = ''; estado.filtros.q = ''; render(); e.target.blur(); } return; }
      if (enCampo) { if (e.key === 'Enter' && e.ctrlKey && e.target.dataset.notaTexto) { agregarNota(e.target.dataset.notaTexto, e.target.value); } return; }
      if (e.key === '/') { e.preventDefault(); $('#buscar').focus(); $('#buscar').select(); return; }
      if (e.key === 't') { cambiarTema(); return; }
      if (/^[1-7]$/.test(e.key)) { irA(['hoy', 'demos', 'prospectos', 'pipeline', 'clientes', 'stats', 'ajustes'][Number(e.key) - 1]); return; }
      if (e.key === 'j' || e.key === 'k') { if (!estado.visibles.length) return; estado.idx = Math.max(0, Math.min(estado.visibles.length - 1, estado.idx + (e.key === 'j' ? 1 : -1))); abrirFicha(estado.visibles[estado.idx]); var el = $('[data-id="' + CSS.escape(estado.visibles[estado.idx]) + '"], [data-pid="' + CSS.escape(estado.visibles[estado.idx]) + '"]'); if (el) el.scrollIntoView({ block: 'nearest' }); return; }
      if (e.key === 'Enter' && estado.idx >= 0 && estado.visibles[estado.idx]) { abrirFicha(estado.visibles[estado.idx]); return; }
      if (e.key === 'o' && estado.sel && buscarDemo(estado.sel)) { setOfrecida(estado.sel, !itemLectura(estado.sel).ofrecida); return; }
    });
    // arrastrar y soltar en el pipeline
    document.addEventListener('dragstart', function (e) { var k = e.target.closest('.kcard'); if (!k) return; e.dataTransfer.setData('text/plain', k.dataset.id); e.dataTransfer.effectAllowed = 'move'; k.classList.add('arrastrando'); });
    document.addEventListener('dragend', function (e) { var k = e.target.closest('.kcard'); if (k) k.classList.remove('arrastrando'); $$('.columna.sobre').forEach(function (c) { c.classList.remove('sobre'); }); });
    document.addEventListener('dragover', function (e) { var c = e.target.closest('.columna'); if (!c) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; $$('.columna.sobre').forEach(function (x) { if (x !== c) x.classList.remove('sobre'); }); c.classList.add('sobre'); });
    document.addEventListener('dragleave', function (e) { var c = e.target.closest('.columna'); if (c && !c.contains(e.relatedTarget)) c.classList.remove('sobre'); });
    document.addEventListener('drop', function (e) { var c = e.target.closest('.columna'); if (!c) return; e.preventDefault(); var id = e.dataTransfer.getData('text/plain'); if (id) { setEtapa(id, c.dataset.etapa); toast(etapaInfo(c.dataset.etapa).nombre); } });
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); estado.instalar = e; $('#btn-instalar').hidden = false; });
    $('#btn-instalar').addEventListener('click', function () { if (estado.instalar) { estado.instalar.prompt(); estado.instalar = null; $('#btn-instalar').hidden = true; } });
  }
  // Junta el seguimiento de otra persona con el propio: por negocio gana el que se tocó más tarde (campo m),
  // y las notas y el historial se suman sin repetir. Así Yordy y Guillermo pueden trabajar cada uno en su copia.
  function juntarSeguimiento(otro) {
    var mios = estado.seg.items, n = 0;
    function sinRepetir(arr) { var v = {}; return arr.filter(function (x) { var k = x.f + '|' + x.t; if (v[k]) return false; v[k] = 1; return true; }).sort(function (a, b) { return a.f.localeCompare(b.f); }); }
    Object.keys(otro.items || {}).forEach(function (k) {
      var a = mios[k], b = otro.items[k]; n++;
      if (!a) { mios[k] = b; return; }
      var base = ((b.m || '') > (a.m || '')) ? b : a, otroLado = base === a ? b : a, res = {};
      Object.keys(a).concat(Object.keys(b)).forEach(function (key) { res[key] = base[key] !== undefined ? base[key] : otroLado[key]; });
      res.notas = sinRepetir((a.notas || []).concat(b.notas || []));
      res.historial = sinRepetir((a.historial || []).concat(b.historial || [])).slice(-200);
      mios[k] = res;
    });
    var al = estado.seg.config.alertas || [];
    ((otro.config && otro.config.alertas) || []).forEach(function (x) { if (!al.some(function (y) { return y.fecha === x.fecha && y.texto === x.texto; })) al.push(x); });
    if (al.length) estado.seg.config.alertas = al;
    return n;
  }
  function agregarNota(id, texto) {
    texto = (texto || '').trim(); if (!texto) return;
    var it = item(id); it.notas.push({ f: new Date().toISOString(), t: texto, q: estado.usuario }); tocar(id); refrescarFicha(); render(); toast('Nota guardada');
  }
  function recapturar(slug, boton) {
    boton.disabled = true; boton.innerHTML = ico('camara') + ' Capturando…';
    fetch('/api/capturar?slug=' + encodeURIComponent(slug) + '&movil=1', { method: 'POST' }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) throw new Error(j.error || 'falló');
      return fetch('/api/demos', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) { estado.datos = d; render(); refrescarFicha(); var img = $('#ficha-img'); if (img) img.src = j.captura; toast('Captura nueva', 'ok'); });
    }).catch(function (e) { toast('No se pudo capturar: ' + e.message, 'error'); boton.disabled = false; boton.innerHTML = ico('camara') + ' Recapturar'; });
  }
  function accion(a, t) {
    switch (a) {
      case 'cerrar-ficha': cerrarFicha(); break;
      case 'ir-demos': irA('demos'); break;
      case 'previa': var d = buscarDemo(t.dataset.id); if (d) previa(d); break;
      case 'csv': csvDemos(estado.vista === 'demos' ? demosFiltradas() : demos()); break;
      case 'csv-prospectos': csvProspectos(); break;
      case 'excel': abrirRuta('demos/PROSPECTOS.xlsx'); break;
      case 'actualizar': actualizarInventario(false); break;
      case 'actualizar-rapido': actualizarInventario(true); break;
      case 'plantilla-reset': estado.seg.config.plantillaWA = ''; guardar(); render(); toast('Plantilla original'); break;
      case 'alerta-agregar': var fe = $('#alerta-fecha').value, tx = $('#alerta-texto').value.trim(); if (!fe || !tx) { toast('Falta la fecha o el texto', 'error'); return; } var al = config('alertas', []).slice(); al.push({ fecha: fe, texto: tx }); estado.seg.config.alertas = al; guardar(); render(); toast('Alerta guardada', 'ok'); break;
      case 'exportar-seg': descargar('seguimiento-' + hoyISO() + '.json', JSON.stringify(estado.seg, null, 2), 'application/json'); break;
      case 'borrar-seg': if (confirm('¿Borrar TODO el seguimiento (ofrecidas, notas, etapas)? El servidor guarda una copia por día en datos/respaldos/.')) { estado.seg = normSeg({ config: estado.seg.config }); guardarAhora(); render(); toast('Seguimiento vaciado'); } break;
    }
  }
  function cambiarTema() {
    var h = document.documentElement, nuevo = h.dataset.tema === 'claro' ? 'oscuro' : 'claro';
    h.dataset.tema = nuevo; localStorage.setItem('prospector.tema', nuevo);
    $('meta[name="theme-color"]').content = nuevo === 'claro' ? '#F2F4F7' : '#0B0F14';
  }

  /* ---------- arranque ---------- */
  function arrancar() {
    var tema = localStorage.getItem('prospector.tema'); if (tema) document.documentElement.dataset.tema = tema;
    pintarUsuario();
    eventos();
    cargar().then(function () {
      if (!estado.datos) { $('#vista-hoy').innerHTML = '<div class="vacio"><b>Sin datos</b>Corre <code>actualizar.ps1</code> o abre la app con Prospector.cmd.</div>'; marcarConexion('lectura', 'Sin inventario'); return; }
      if (estado.servidor) { marcarConexion('ok', 'Servidor local · ' + estado.datos.generado); }
      else if (esFile()) { marcarConexion('lectura', 'Modo lectura (file://)'); var av = $('#aviso'); av.hidden = false; av.innerHTML = ico('alerta') + ' <span>Abierta sin servidor: lo que marques queda sólo en este navegador. Para guardar de verdad y abrir carpetas, usa <b>Prospector.cmd</b>.</span>'; }
      else if (enBoveda()) { marcarConexion('ok', 'Publicada · ' + estado.datos.generado); var av4 = $('#aviso'); av4.hidden = false; av4.innerHTML = ico('alerta') + ' <span>Versión publicada (cifrada). Lo que marques queda en este navegador; para juntarlo con el otro, Ajustes → Exportar JSON / Importar y juntar. Se actualiza con <b>publicar.ps1</b> desde el repo privado.</span>'; }
      else { marcarConexion('lectura', 'Versión compartida · ' + estado.datos.generado); var av3 = $('#aviso'); av3.hidden = false; av3.innerHTML = ico('alerta') + ' <span>Versión compartida: lo que marques queda en este navegador. Para pasarle el seguimiento al otro, Ajustes → Exportar JSON, y el otro lo importa.</span>'; }
      if (estado.servidor && estado.datos.excelFecha && estado.datos.excelFecha > estado.datos.generado) { var av2 = $('#aviso'); av2.hidden = false; av2.innerHTML = ico('alerta') + ' <span>El Excel cambió después del último inventario.</span><button class="btn btn-chico btn-primario" data-accion="actualizar">Actualizar ahora</button>'; }
      var h = leerHash(); irA(h.vista, h.id);
      if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) { navigator.serviceWorker.register('sw.js').catch(function () { }); }
    });
  }
  function listo() {
    // en la versión publicada, primero hay que abrir la bóveda (js/boveda.js avisa con el evento)
    if (enBoveda() && !window.PROSPECTOR_DATOS) document.addEventListener('boveda-lista', arrancar, { once: true });
    else arrancar();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', listo); else listo();
})();
