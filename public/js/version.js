export const VERSION = '1.1.0';
export const REPO = 'pilahito/pixelsoft';

/** 1.10.0 > 1.9.3 */
export function esMasNueva(a, b) {
  const pa = String(a).replace(/^\D+/, '').split('.').map(Number);
  const pb = String(b).replace(/^\D+/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

/** Mira la ultima release publica en GitHub. */
export async function buscarActualizacion() {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { signal: ctl.signal, headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error('GitHub respondió ' + r.status);
    const j = await r.json();
    const activos = j.assets || [];
    return {
      version: j.tag_name,
      nueva: esMasNueva(j.tag_name, VERSION),
      notas: j.body || '',
      url: j.html_url,
      exe: (activos.find((x) => /\.exe$/i.test(x.name)) || {}).browser_download_url || null,
      apk: (activos.find((x) => /\.apk$/i.test(x.name)) || {}).browser_download_url || null
    };
  } finally { clearTimeout(t); }
}
