/* Prospector — bóveda: la puerta cifrada de la versión publicada (GitHub Pages).
   El sitio es público, pero los datos viven en datos.enc, cifrado con
   AES-256-CBC + HMAC-SHA256 y una clave derivada con PBKDF2-SHA256
   (200.000 vueltas). Sin la clave de la sociedad no hay nada que leer.
   Formato del archivo: "PRSP1" · salt (16) · iv (16) · hmac (32) · cifrado.
   Adentro: u32 (largo del índice) · índice JSON · archivos concatenados.
   Lo escribe apps/prospector/publicar.ps1 con el mismo esquema. */
(function () {
  'use strict';
  var URL_ENC = window.PROSPECTOR_BOVEDA_URL;
  if (!URL_ENC) return;
  var enc = new TextEncoder(), dec = new TextDecoder();
  var css = '.puerta{position:fixed;inset:0;z-index:999;display:grid;place-items:center;padding:24px;background:#0B0F14;color:#E9EEF3;font:15px/1.5 Manrope,system-ui,sans-serif}' +
    '.puerta-caja{width:min(420px,100%);background:#131B24;border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:28px 26px;box-shadow:0 24px 70px rgba(0,0,0,.55);display:flex;flex-direction:column;gap:12px;text-align:center}' +
    '.puerta-caja img{width:52px;height:52px;margin:0 auto;border-radius:12px}' +
    '.puerta-caja h1{margin:0;font-size:22px;font-weight:800;letter-spacing:-.02em}' +
    '.puerta-caja p{margin:0;color:#A3AFBC;font-size:13.5px}' +
    '.puerta-caja input[type=password]{font:inherit;color:#E9EEF3;background:#192330;border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:11px 12px;outline:0;text-align:center;letter-spacing:.08em}' +
    '.puerta-caja input[type=password]:focus{border-color:#FF7A45;box-shadow:0 0 0 4px rgba(255,122,69,.16)}' +
    '.puerta-caja label{font-size:12.5px;color:#A3AFBC;display:flex;gap:8px;align-items:center;justify-content:center}' +
    '.puerta-caja button{font:inherit;font-weight:700;height:42px;border:0;border-radius:10px;background:linear-gradient(135deg,#FF7A45,#FF9A5C);color:#1A0B04;cursor:pointer}' +
    '.puerta-caja button[disabled]{opacity:.6;cursor:wait}' +
    '.puerta-estado{min-height:20px;font-size:12.5px;color:#A3AFBC}.puerta-estado.error{color:#FF5C6C}' +
    '.puerta-barra{height:4px;border-radius:99px;background:#1F2B3A;overflow:hidden}.puerta-barra i{display:block;height:100%;width:0;background:#5CD6C4;transition:width .3s}';

  var puerta = document.createElement('div');
  puerta.className = 'puerta';
  puerta.innerHTML = '<style>' + css + '</style><form class="puerta-caja" id="puerta-form" autocomplete="on">' +
    '<img src="assets/icono.svg" alt=""><h1>Prospector</h1>' +
    '<p>Tablero interno de CristalWeb. Escribe la clave de la sociedad para abrirlo.</p>' +
    '<input type="password" id="puerta-clave" autocomplete="current-password" placeholder="Clave" autofocus>' +
    '<label><input type="checkbox" id="puerta-recordar"> Recordar en este navegador</label>' +
    '<button type="submit" id="puerta-boton">Entrar</button>' +
    '<div class="puerta-barra"><i id="puerta-progreso"></i></div>' +
    '<p class="puerta-estado" id="puerta-estado"></p></form>';
  document.body.appendChild(puerta);
  var $clave = document.getElementById('puerta-clave'), $boton = document.getElementById('puerta-boton'), $estado = document.getElementById('puerta-estado'), $prog = document.getElementById('puerta-progreso'), $rec = document.getElementById('puerta-recordar');

  function estado(msg, error) { $estado.textContent = msg || ''; $estado.className = 'puerta-estado' + (error ? ' error' : ''); }
  function progreso(p) { $prog.style.width = Math.round(p * 100) + '%'; }

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

  function abrir(clave) {
    estado('Descargando el paquete…'); progreso(0.02);
    return descargar(URL_ENC).then(function (buf) {
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

  function entrar(clave, recordar) {
    $boton.disabled = true; $clave.disabled = true;
    abrir(clave).then(function () {
      try { if (recordar) localStorage.setItem('prospector.clave', clave); sessionStorage.setItem('prospector.clave', clave); } catch (e) { }
      puerta.remove();
      document.dispatchEvent(new CustomEvent('boveda-lista'));
    }).catch(function (e) {
      estado(e.message || 'No se pudo abrir', true); progreso(0);
      $boton.disabled = false; $clave.disabled = false; $clave.focus(); $clave.select();
      try { localStorage.removeItem('prospector.clave'); sessionStorage.removeItem('prospector.clave'); } catch (x) { }
    });
  }

  document.getElementById('puerta-form').addEventListener('submit', function (e) { e.preventDefault(); var c = $clave.value.trim(); if (!c) return; entrar(c, $rec.checked); });
  var guardada = null;
  try { guardada = sessionStorage.getItem('prospector.clave') || localStorage.getItem('prospector.clave'); } catch (e) { }
  if (guardada) { $clave.value = guardada; entrar(guardada, false); }
})();
