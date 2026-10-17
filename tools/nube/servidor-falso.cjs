// Servidor FALSO de Google (OAuth + Drive appDataFolder) para probar la nube de
// PixelSoft sin credenciales ni red. Solo escucha en 127.0.0.1.
// Uso: node tools/nube/servidor-falso.cjs [puerto]   (lo arranca tools/nube/probar-nube.ps1)
const http = require('http'), crypto = require('crypto');
const PUERTO = +process.argv[2] || 47831;
const CLIENTES = { 'escritorio-falso': 'secreto-escritorio', 'dispositivo-falso': 'secreto-dispositivo' };
let S;
function reset() {
  S = { codigos: {}, refresh: {}, access: {}, archivos: {}, n: 0, cuenta: { refrescos: 0, subidas: 0, bajadas: 0, listados: 0, revocados: 0, devPolls: 0 }, expira: 3600, dev: {} };
}
reset();
const b64url = b => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const json = (res, code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
const tok = () => crypto.randomBytes(12).toString('hex');
function nuevoAcceso(rt) { const a = 'ya29.' + tok(); S.access[a] = { rt, caduca: Date.now() + S.expira * 1000 }; return a; }
function emitir(res) { const rt = '1//' + tok(); S.refresh[rt] = true; json(res, 200, { access_token: nuevoAcceso(rt), expires_in: S.expira, refresh_token: rt, scope: 'https://www.googleapis.com/auth/drive.appdata', token_type: 'Bearer' }); }
function autorizado(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || ''); const a = m && S.access[m[1]];
  return a && a.caduca > Date.now() && S.refresh[a.rt];
}
function meta(f) { return { id: f.id, name: f.name, modifiedTime: f.modifiedTime, md5Checksum: md5(f.datos), appProperties: f.appProperties }; }
function multipart(req, cuerpo) {
  const lim = /boundary=([^;]+)/.exec(req.headers['content-type'] || '')[1];
  const partes = cuerpo.toString('latin1').split('--' + lim).slice(1, -1).map(p => {
    const i = p.indexOf('\r\n\r\n'); return Buffer.from(p.slice(i + 4, p.length - 2), 'latin1');
  });
  return { meta: JSON.parse(partes[0].toString('utf8')), datos: partes[1] };
}
http.createServer((req, res) => {
  const ch = []; req.on('data', c => ch.push(c)); req.on('end', () => {
    const cuerpo = Buffer.concat(ch), u = new URL(req.url, 'http://x'), q = u.searchParams, p = u.pathname;
    const form = () => new URLSearchParams(cuerpo.toString());
    // --- control de pruebas
    if (p === '/_ctl/reset') { reset(); return json(res, 200, {}); }
    if (p === '/_ctl/estado') return json(res, 200, { cuenta: S.cuenta, archivos: Object.values(S.archivos).map(f => ({ ...meta(f), parents: f.parents, contenido: f.datos.toString() })) });
    if (p === '/_ctl/expira') { S.expira = +q.get('s'); return json(res, 200, {}); }
    if (p === '/_ctl/caducar') { S.access = {}; return json(res, 200, {}); }
    if (p === '/_ctl/revocar_todo') { S.refresh = {}; return json(res, 200, {}); }
    if (p === '/_ctl/poner') { // otro dispositivo sube una partida
      const n = q.get('nombre'); let f = Object.values(S.archivos).find(x => x.name === n);
      if (!f) { f = { id: 'f' + (++S.n), name: n, parents: ['appDataFolder'] }; S.archivos[f.id] = f; }
      f.datos = cuerpo; f.modifiedTime = new Date().toISOString(); f.appProperties = { dia: q.get('dia') || '0', guardado: String(Math.floor(Date.now() / 1000)), dispositivo: 'Android · Movil de prueba' };
      return json(res, 200, meta(f));
    }
    // --- OAuth
    if (p === '/o/oauth2/v2/auth') {
      if (!CLIENTES[q.get('client_id')] || q.get('code_challenge_method') !== 'S256' || q.get('response_type') !== 'code' || q.get('scope') !== 'https://www.googleapis.com/auth/drive.appdata' || !/^http:\/\/127\.0\.0\.1:\d+$/.test(q.get('redirect_uri')))
        return json(res, 400, { error: 'invalid_request' });
      const c = '4/' + tok(); S.codigos[c] = { reto: q.get('code_challenge'), redirect: q.get('redirect_uri'), client: q.get('client_id') };
      res.writeHead(302, { Location: q.get('redirect_uri') + '/?state=' + encodeURIComponent(q.get('state')) + '&code=' + encodeURIComponent(c) + '&scope=' + encodeURIComponent(q.get('scope')) }); return res.end();
    }
    if (p === '/device/code' && req.method === 'POST') {
      const f = form(); if (f.get('client_id') !== 'dispositivo-falso') return json(res, 401, { error: 'invalid_client' });
      const dc = 'dev-' + tok(); S.dev[dc] = { pendientes: 2 };
      return json(res, 200, { device_code: dc, user_code: 'WXYZ-ABCD', verification_url: 'https://www.google.com/device', expires_in: 300, interval: 1 });
    }
    if (p === '/token' && req.method === 'POST') {
      const f = form(), g = f.get('grant_type'), cid = f.get('client_id');
      if (CLIENTES[cid] !== f.get('client_secret')) return json(res, 401, { error: 'invalid_client' });
      if (g === 'authorization_code') {
        const c = S.codigos[f.get('code')]; delete S.codigos[f.get('code')];
        if (!c || c.redirect !== f.get('redirect_uri') || c.client !== cid) return json(res, 400, { error: 'invalid_grant' });
        if (b64url(crypto.createHash('sha256').update(f.get('code_verifier') || '').digest()) !== c.reto) return json(res, 400, { error: 'invalid_grant', error_description: 'PKCE' });
        return emitir(res);
      }
      if (g === 'urn:ietf:params:oauth:grant-type:device_code') {
        S.cuenta.devPolls++; const d = S.dev[f.get('device_code')];
        if (!d) return json(res, 400, { error: 'expired_token' });
        if (d.pendientes-- > 0) return json(res, 428, { error: 'authorization_pending' });
        delete S.dev[f.get('device_code')]; return emitir(res);
      }
      if (g === 'refresh_token') {
        const rt = f.get('refresh_token'); if (!S.refresh[rt]) return json(res, 400, { error: 'invalid_grant' });
        S.cuenta.refrescos++; return json(res, 200, { access_token: nuevoAcceso(rt), expires_in: S.expira, token_type: 'Bearer' });
      }
      return json(res, 400, { error: 'unsupported_grant_type' });
    }
    if (p === '/revoke') { delete S.refresh[form().get('token')]; S.cuenta.revocados++; return json(res, 200, {}); }
    // --- Drive (solo appDataFolder)
    if (p.startsWith('/drive/v3') || p.startsWith('/upload/drive/v3')) {
      if (!autorizado(req)) return json(res, 401, { error: { code: 401, message: 'Invalid Credentials' } });
      if (p === '/drive/v3/about') return json(res, 200, { user: { displayName: 'Jugador', emailAddress: 'Jugador de prueba' } });
      if (p === '/drive/v3/files' && req.method === 'GET') {
        if (q.get('spaces') !== 'appDataFolder') return json(res, 403, { error: { message: 'solo appDataFolder' } });
        S.cuenta.listados++; const m = /name = '([^']+)'/.exec(q.get('q') || '');
        return json(res, 200, { files: Object.values(S.archivos).filter(f => !m || f.name === m[1]).map(meta) });
      }
      let m = /^\/drive\/v3\/files\/([^/]+)$/.exec(p);
      if (m && req.method === 'GET' && q.get('alt') === 'media') {
        const f = S.archivos[m[1]]; if (!f) return json(res, 404, { error: { message: 'File not found' } });
        S.cuenta.bajadas++; res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(f.datos);
      }
      if (q.get('uploadType') === 'multipart') {
        const { meta: mt, datos } = multipart(req, cuerpo); S.cuenta.subidas++;
        if (p === '/upload/drive/v3/files' && req.method === 'POST') {
          if (JSON.stringify(mt.parents) !== '["appDataFolder"]' || !mt.name) return json(res, 400, { error: { message: 'falta parents appDataFolder' } });
          const f = { id: 'f' + (++S.n), name: mt.name, parents: mt.parents, datos, modifiedTime: new Date().toISOString(), appProperties: mt.appProperties || {} };
          S.archivos[f.id] = f; return json(res, 200, meta(f));
        }
        m = /^\/upload\/drive\/v3\/files\/([^/]+)$/.exec(p);
        if (m && req.method === 'PATCH') {
          const f = S.archivos[m[1]]; if (!f) return json(res, 404, { error: { message: 'File not found' } });
          if (mt.parents) return json(res, 400, { error: { message: 'parents no se puede cambiar en PATCH' } });
          f.datos = datos; f.modifiedTime = new Date().toISOString(); f.appProperties = { ...f.appProperties, ...(mt.appProperties || {}) };
          return json(res, 200, meta(f));
        }
      }
    }
    json(res, 404, { error: 'no encontrado: ' + req.method + ' ' + p });
  });
}).listen(PUERTO, '127.0.0.1', () => console.log('servidor falso en http://127.0.0.1:' + PUERTO));
