// Demo character selection only; this cookie is not authentication or a real user identity.
const PERSONA_IDS = new Set(['demo-f01', 'demo-f02', 'demo-m01', 'demo-m02']);
export function activePersonaId(cookie = globalThis.document?.cookie || '') {
  const raw = cookie.split(';').map(part => part.trim()).find(part => part.startsWith('gscene-persona='))?.slice('gscene-persona='.length);
  try { const value = decodeURIComponent(raw || ''); return PERSONA_IDS.has(value) ? value : 'demo-f01'; }
  catch { return 'demo-f01'; }
}
export function selectDemoPersona(personaId, target = globalThis.document) {
  if (!PERSONA_IDS.has(personaId) || !target) return false;
  try {
    target.cookie = `gscene-persona=${personaId}; Path=/; Max-Age=31536000; SameSite=Lax`;
    return activePersonaId(target.cookie) === personaId;
  } catch { return false; }
}
