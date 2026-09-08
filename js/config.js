/* Prospector — conexión a Supabase.
   Copiar este archivo como js/config.js y pegar los dos valores de
   supabase.com → Project Settings → API Keys:
     url:  «Project URL»      (https://xxxxxxxx.supabase.co)
     key:  «sb_publishable__E3AXPmMZSQBJny1xPxWiw_GaXPhQdR»  (sb_publishable_…) o, si el panel sólo muestra
           la pestaña «Legacy anon key», esa misma (eyJ…).
   La publishable key está hecha para ir en el navegador: sola no abre nada;
   lo que se puede leer lo deciden el login y las políticas RLS de la base.
   La service_role / secret key NO va aquí ni en ninguna parte de la app. */
window.PROSPECTOR_SUPABASE = {
  url: 'https://zpiyukgsarzhqrzvfcuk.supabase.co',
  key: 'sb_publishable__E3AXPmMZSQBJny1xPxWiw_GaXPhQdR'
};
