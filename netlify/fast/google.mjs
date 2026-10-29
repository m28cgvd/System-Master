import crypto from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

function b64u(x) { return Buffer.from(x).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }

function account(env) {
  const cid = String(env.GOOGLE_CLIENT_ID || '').trim(), csec = String(env.GOOGLE_CLIENT_SECRET || '').trim(), rt = String(env.GOOGLE_REFRESH_TOKEN || '').trim();
  if (cid && csec && rt) return { refresh: rt, id: cid, secret: csec, email: '' };
  let email = String(env.GOOGLE_SA_EMAIL || '').trim(), key = String(env.GOOGLE_SA_KEY || '').trim();
  if (key.charAt(0) === '{') {
    try { const j = JSON.parse(key); key = j.private_key || ''; email = email || j.client_email || ''; } catch (e) { key = ''; }
  } else if (key && !/BEGIN/.test(key)) {
    try { const j = JSON.parse(Buffer.from(key, 'base64').toString('utf8')); key = j.private_key || ''; email = email || j.client_email || ''; } catch (e) { key = ''; }
  }
  key = key.replace(/\\n/g, '\n');
  return email && key ? { email, key } : null;
}

class GoogleError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function client(env, fetchImpl) {
  const acct = account(env);
  const base = env.CG_SHEETS_URL || 'https://sheets.googleapis.com/v4/spreadsheets/';
  const tokenUrl = env.CG_TOKEN_URL || TOKEN_URL;
  const doFetch = fetchImpl || globalThis.fetch;
  let tok = null, pending = null;

  async function token() {
    if (tok && tok.exp > Date.now() + 120000) return tok.v;
    if (pending) return pending;
    pending = (async () => {
      let body;
      if (acct.refresh) {
        body = 'grant_type=refresh_token&client_id=' + encodeURIComponent(acct.id) + '&client_secret=' + encodeURIComponent(acct.secret) + '&refresh_token=' + encodeURIComponent(acct.refresh);
      } else {
        const now = Math.floor(Date.now() / 1000);
        const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
        const claim = b64u(JSON.stringify({ iss: acct.email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
        const sig = crypto.createSign('RSA-SHA256').update(head + '.' + claim).sign(acct.key).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        body = 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + head + '.' + claim + '.' + sig;
      }
      const r = await doFetch(tokenUrl, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(5000) });
      const t = await r.text();
      if (r.status !== 200) throw new GoogleError(r.status === 400 || r.status === 401 ? 401 : r.status, 'token ' + r.status + ' ' + t.slice(0, 200));
      const j = JSON.parse(t);
      tok = { v: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
      return tok.v;
    })();
    try { return await pending; } finally { pending = null; }
  }

  async function get(url, tries) {
    tries = tries === undefined ? 2 : tries;
    let r, text;
    try {
      const t = await token();
      r = await doFetch(url, { headers: { authorization: 'Bearer ' + t }, signal: AbortSignal.timeout(6500) });
      text = await r.text();
    } catch (e) {
      if (e instanceof GoogleError) throw e;
      if (tries > 1) { await new Promise(res => setTimeout(res, 250)); return get(url, tries - 1); }
      throw new GoogleError(503, 'network ' + (e && e.message));
    }
    if (r.status === 200) return { text, json: JSON.parse(text) };
    if (r.status >= 500 && tries > 1) { await new Promise(res => setTimeout(res, 300)); return get(url, tries - 1); }
    if (r.status === 401 && tries > 1) { tok = null; return get(url, tries - 1); }
    throw new GoogleError(r.status, text.slice(0, 300));
  }

  const q = t => "'" + String(t).replace(/'/g, "''") + "'";
  return {
    ok: !!acct,
    email: acct ? acct.email : '',
    token,
    meta: id => get(base + encodeURIComponent(id) + '?fields=' + encodeURIComponent('properties(title,timeZone,locale),sheets(properties(sheetId,title,index,hidden,gridProperties(rowCount,columnCount,frozenRowCount)))')),
    values: (id, tabs, mode) => get(base + encodeURIComponent(id) + '/values:batchGet?majorDimension=ROWS&valueRenderOption=' + (mode === 'F' ? 'FORMULA' : 'UNFORMATTED_VALUE') +
      (mode === 'F' ? '' : '&dateTimeRenderOption=' + (mode === 'f' ? 'FORMATTED_STRING' : 'SERIAL_NUMBER')) + tabs.map(t => '&ranges=' + encodeURIComponent(q(t))).join('')),
    dv: (id, tab, a1) => get(base + encodeURIComponent(id) + '?ranges=' + encodeURIComponent(q(tab) + '!' + a1) + '&fields=' + encodeURIComponent('sheets(data(startRow,startColumn,rowData(values(dataValidation))))'))
  };
}

export { client, account, GoogleError };
