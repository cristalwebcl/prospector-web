/* Prospector — bóveda: la puerta de la versión publicada (GitHub Pages).
   El sitio es público, pero los datos viven en datos.enc, cifrado con
   AES-256-CBC + HMAC-SHA256 y una clave derivada con PBKDF2-SHA256
   (200.000 vueltas). Sin la clave de la sociedad no hay nada que leer.
   Formato del archivo: "PRSP1" · salt (16) · iv (16) · hmac (32) · cifrado.
   Adentro: u32 (largo del índice) · índice JSON · archivos concatenados.
   Lo escribe apps/prospector/publicar.ps1 con el mismo esquema.

   Desde el 07-09-2026 la puerta pide CORREO Y CONTRASEÑA (Supabase): con la
   sesión iniciada, la clave de la bóveda se lee de la tabla config (fila
   'boveda', que sólo pueden leer los socios) y el paquete se abre solo. Si
   Supabase no responde (proyecto pausado, sin red), se puede abrir con la
   clave de la sociedad escrita a mano, como antes: la app funciona igual,
   sólo que sin sincronizar hasta que vuelva la conexión. */
(function () {
  'use strict';
  var URL_ENC = window.PROSPECTOR_BOVEDA_URL;
  if (!URL_ENC) return;
  var enc = new TextEncoder(), dec = new TextDecoder();
  var cfg = window.PROSPECTOR_SUPABASE;
  var sb = (cfg && cfg.url && cfg.key && window.supabase && !/XXXX/.test(cfg.url)) ? window.supabase.createClient(cfg.url, cfg.key) : null;
  window.PROSPECTOR_SB = sb;   // app.js reutiliza este cliente: una sola sesión y un solo WebSocket

  var css = '.puerta{position:fixed;inset:0;z-index:999;display:grid;place-items:center;padding:24px;background:#0B0F14;color:#E9EEF3;font:15px/1.5 Manrope,system-ui,sans-serif}' +
    '.puerta-caja{width:min(420px,100%);background:#131B24;border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:28px 26px;box-shadow:0 24px 70px rgba(0,0,0,.55);display:flex;flex-direction:column;gap:12px;text-align:center}' +
    '.puerta-caja img{width:52px;height:52px;margin:0 auto;border-radius:12px}' +
    '.puerta-caja h1{margin:0;font-size:22px;font-weight:800;letter-spacing:-.02em}' +
    '.puerta-caja p{margin:0;color:#A3AFBC;font-size:13.5px}' +
    '.puerta-caja input{font:inherit;color:#E9EEF3;background:#192330;border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:11px 12px;outline:0;text-align:center}' +
    '.puerta-caja input:focus{border-color:#FF7A45;box-shadow:0 0 0 4px rgba(255,122,69,.16)}' +
    '.puerta-caja button{font:inherit;font-weight:700;height:42px;border:0;border-radius:10px;background:linear-gradient(135deg,#FF7A45,#FF9A5C);color:#1A0B04;cursor:pointer}' +
    '.puerta-caja button[disabled]{opacity:.6;cursor:wait}' +
    '.puerta-caja .alt{background:none;color:#A3AFBC;font-weight:500;height:auto;padding:0;text-decoration:underline;font-size:12.5px}' +
    '.puerta-estado{min-height:20px;font-size:12.5px;color:#A3AFBC}.puerta-estado.error{color:#FF5C6C}' +
    '.puerta-barra{height:4px;border-radius:99px;background:#1F2B3A;overflow:hidden}.puerta-barra i{display:block;height:100%;width:0;background:#5CD6C4;transition:width .3s}' +
    '.puerta [hidden]{display:none!important}';

  var puerta = document.createElement('div');
  puerta.className = 'puerta';
  puerta.innerHTML = '<style>' + css + '</style><form class="puerta-caja" id="puerta-form" autocomplete="on">' +
    '<img src="assets/icono.svg" alt=""><h1>Prospector</h1>' +
    '<p id="puerta-texto">Tablero interno de CristalWeb. Entra con tu correo y tu contraseña.</p>' +
    '<div id="puerta-cuenta" style="display:flex;flex-direction:column;gap:10px">' +
      '<input type="email" id="puerta-correo" autocomplete="username" placeholder="Correo" autofocus>' +
      '<input type="password" id="puerta-pass" autocomplete="current-password" placeholder="Contraseña">' +
    '</div>' +
    '<div id="puerta-manual" hidden><input type="password" id="puerta-clave" autocomplete="off" placeholder="Clave de la sociedad"></div>' +
    '<button type="submit" id="puerta-boton">Entrar</button>' +
    '<button type="button" class="alt" id="puerta-alternar">Abrir con la clave de la sociedad (sin sincronizar)</button>' +
    '<div class="puerta-barra"><i id="puerta-progreso"></i></div>' +
    '<p class="puerta-estado" id="puerta-estado"></p></form>';
  document.body.appendChild(puerta);
  var $correo = document.getElementById('puerta-correo'), $pass = document.getElementById('puerta-pass'), $clave = document.getElementById('puerta-clave');
  var $boton = document.getElementById('puerta-boton'), $estado = document.getElementById('puerta-estado'), $prog = document.getElementById('puerta-progreso');
  var $cuenta = document.getElementById('puerta-cuenta'), $manual = document.getElementById('puerta-manual'), $alternar = document.getElementById('puerta-alternar');
  var modoManual = false;

  function estado(msg, error) { $estado.textContent = msg || ''; $estado.className = 'puerta-estado' + (error ? ' error' : ''); }
  function progreso(p) { $prog.style.width = Math.round(p * 100) + '%'; }
  function ocupado(si) { $boton.disabled = si; $correo.disabled = si; $pass.disabled = si; $clave.disabled = si; }
  // la clave sólo se recuerda entre sesiones cuando la trajo Supabase (o sea, hubo login);
  // la escrita a mano vive en sessionStorage: sirve para recargar la pestaña, no para siempre
  function claveGuardada() {
    try { return (localStorage.getItem('prospector.clave') || sessionStorage.getItem('prospector.clave') || '').trim(); } catch (e) { return ''; }
  }
  function guardarClave(clave, recordar) {
    try {
      if (recordar) localStorage.setItem('prospector.clave', clave);
      else { localStorage.removeItem('prospector.clave'); sessionStorage.setItem('prospector.clave', clave); }
    } catch (e) { }
  }
  function olvidarClave() { try { localStorage.removeItem('prospector.clave'); sessionStorage.removeItem('prospector.clave'); } catch (e) { } }

  function descargar(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('No se pudo descargar el paquete (' + r.status + ')');
      var total = Number(r.headers.get('Content-Length')) || 0;
      if (!r.body || !total) return r.arrayBuffer().then(function (b) { return new Uint8Array(b); });
      var lector = r.body.getReader(), partes = [], leido = 0;
      return (function paso() {
        return lector.read().then(function (x) {
          if (x.done) { var out = new Uint8Array(leido), o = 0; partes.forEach(function (p) { out.set(p, o); o += p.length; }); return out; }
          partes.push(x.value); leido += x.value.length; progreso(leido / total * 0.7); return paso();
        });
      })();
    });
  }

  // el paquete se baja UNA sola vez aunque después se prueben otras claves (son ~7 MB)
  var paquete = null;
  function bajarPaquete() {
    if (!paquete) paquete = descargar(URL_ENC).catch(function (e) { paquete = null; throw e; });
    return paquete;
  }

  function abrir(clave) {
    estado('Descargando el paquete…'); progreso(0.02);
    return bajarPaquete().then(function (buf) {
      if (dec.decode(buf.slice(0, 5)) !== 'PRSP1') throw new Error('El paquete no tiene el formato esperado');
      var salt = buf.slice(5, 21), iv = buf.slice(21, 37), mac = buf.slice(37, 69), cif = buf.slice(69);
      estado('Comprobando la clave…'); progreso(0.75);
      return crypto.subtle.importKey('raw', enc.encode(clave), 'PBKDF2', false, ['deriveBits'])
        .then(function (base) { return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt, iterations: 200000, hash: 'SHA-256' }, base, 512); })
        .then(function (bits) {
          bits = new Uint8Array(bits);
          var kAes = bits.slice(0, 32), kMac = bits.slice(32, 64);
          var firmado = new Uint8Array(16 + 16 + cif.length); firmado.set(salt, 0); firmado.set(iv, 16); firmado.set(cif, 32);
          return crypto.subtle.importKey('raw', kMac, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
            .then(function (hk) { return crypto.subtle.verify('HMAC', hk, mac, firmado); })
            .then(function (ok) {
              if (!ok) throw new Error('Clave incorrecta');
              estado('Abriendo…'); progreso(0.85);
              return crypto.subtle.importKey('raw', kAes, { name: 'AES-CBC' }, false, ['decrypt']);
            })
            .then(function (ak) { return crypto.subtle.decrypt({ name: 'AES-CBC', iv: iv }, ak, cif); });
        });
    }).then(function (planoBuf) {
      var plano = new Uint8Array(planoBuf);
      var largo = new DataView(plano.buffer, plano.byteOffset, 4).getUint32(0, true);
      var indice = JSON.parse(dec.decode(plano.slice(4, 4 + largo)));
      var base0 = 4 + largo, archivos = {};
      indice.archivos.forEach(function (a) {
        var bytes = plano.slice(base0 + a.inicio, base0 + a.inicio + a.largo);
        if (a.tipo === 'texto') archivos['texto:' + a.ruta] = dec.decode(bytes);
        else archivos[a.ruta] = URL.createObjectURL(new Blob([bytes], { type: a.mime || 'application/octet-stream' }));
      });
      var demos = archivos['texto:datos/demos.json'];
      if (!demos) throw new Error('El paquete no trae el inventario');
      window.PROSPECTOR_DATOS = JSON.parse(demos);
      window.PROSPECTOR_ARCHIVOS = archivos;
      window.PROSPECTOR_BOVEDA_INFO = { generado: indice.generado, archivos: indice.archivos.length, bytes: planoBuf.byteLength };
      progreso(1);
    });
  }

  // la clave de la bóveda vive en config.boveda; sólo un socio con sesión puede leerla (RLS)
  function claveDeLaBoveda() {
    return sb.from('config').select('data').eq('id', 'boveda').maybeSingle().then(function (r) {
      if (r.error) throw new Error(r.error.message);
      if (!r.data || !r.data.data || !r.data.data.clave) throw new Error('Tu cuenta no puede leer la clave de la bóveda (¿está en la tabla socios?)');
      return String(r.data.data.clave).trim();
    });
  }
  function terminar(clave, recordar) {
    return abrir(clave).then(function () {
      guardarClave(clave, recordar);
      puerta.remove();
      document.dispatchEvent(new CustomEvent('boveda-lista'));
    });
  }
  function fallo(e) {
    estado(e && e.message ? e.message : 'No se pudo entrar', true); progreso(0); ocupado(false);
    (modoManual ? $clave : $pass).focus();
  }
  function esRed(e) { return /fetch|network|load failed|Failed to/i.test(String(e && e.message || e)); }
  function esCredencial(e) { return /incorrect|invalid|credential/i.test(String(e && e.message || e)); }

  function pintarModo() {
    $cuenta.hidden = modoManual; $manual.hidden = !modoManual;
    $alternar.hidden = !sb;                       // sin Supabase no hay a qué alternar
    $alternar.textContent = modoManual ? 'Volver a entrar con correo y contraseña' : 'Abrir con la clave de la sociedad (sin sincronizar)';
    document.getElementById('puerta-texto').textContent = modoManual
      ? 'Con la clave de la sociedad se abre igual, pero lo que marques queda en este navegador hasta que vuelva la sincronización.'
      : 'Tablero interno de CristalWeb. Entra con tu correo y tu contraseña.';
    if (modoManual && !$clave.value) $clave.value = claveGuardada();
    (modoManual ? $clave : $correo).focus();
  }
  function irAManual(msg) { modoManual = true; pintarModo(); if (msg) estado(msg, true); }

  function entrarConCuenta(correo, pass) {
    if (!sb) { irAManual('Esta copia no trae la conexión a Supabase: usa la clave de la sociedad.'); return; }
    ocupado(true); estado('Entrando…'); progreso(0.01);
    sb.auth.signInWithPassword({ email: correo, password: pass }).then(function (r) {
      if (r.error) throw new Error(/invalid login/i.test(r.error.message) ? 'Correo o contraseña incorrectos' : r.error.message);
      return claveDeLaBoveda().then(function (clave) {
        return terminar(clave, true).catch(function (e) {
          // la sesión está bien: lo que no sirve es la clave que guarda la base
          if (/Clave incorrecta/i.test(String(e && e.message))) throw new Error('La clave guardada en la base (config, fila boveda) no abre este paquete: actualízala o entra con la clave de la sociedad');
          throw e;
        });
      });
    }).catch(function (e) {
      // credenciales malas se avisan; cualquier otra cosa (sin red, proyecto pausado, RLS)
      // no puede dejar afuera a quien ya tiene la clave guardada en esta máquina
      if (!esCredencial(e) && claveGuardada()) {
        estado('No se pudo verificar la cuenta: abriendo con la clave guardada (sin sincronizar)');
        return terminar(claveGuardada(), false).catch(function () { fallo(e); });
      }
      fallo(e);
    });
  }
  function entrarManual(clave) {
    ocupado(true);
    terminar(clave, false).catch(function (e) { olvidarClave(); fallo(e); });
  }

  $alternar.addEventListener('click', function () { modoManual = !modoManual; estado(''); pintarModo(); });
  document.getElementById('puerta-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (modoManual) { var c = $clave.value.trim(); if (c) entrarManual(c); return; }
    var correo = $correo.value.trim(), pass = $pass.value;
    if (correo && pass) entrarConCuenta(correo, pass);
  });

  // al cargar: con sesión guardada no se pregunta nada; sin Supabase se parte en modo manual
  if (!sb) {
    modoManual = true; pintarModo();
    estado('Esta copia no trae la conexión a Supabase: se abre con la clave de la sociedad.');
  } else {
    sb.auth.getSession().then(function (r) {
      var ses = r && r.data && r.data.session;
      if (!ses) { if (r && r.error && claveGuardada()) return abrirGuardada(); return; }
      ocupado(true); estado('Sesión guardada, abriendo…');
      var g = claveGuardada();
      (g ? terminar(g, true).catch(function () { return claveDeLaBoveda().then(function (c) { return terminar(c, true); }); })
         : claveDeLaBoveda().then(function (c) { return terminar(c, true); }))
        .catch(function (e) { fallo(e); });
    }, function () { if (claveGuardada()) abrirGuardada(); });
  }
  function abrirGuardada() {
    ocupado(true); estado('Supabase no responde: abriendo con la clave guardada (sin sincronizar)');
    return terminar(claveGuardada(), false).catch(function (e) { fallo(e); });
  }
})();
