'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { personaChoices, switchPersona, watchPersona, type PersonaHome } from '../../app/persona-browser.js';

/** Buying history belongs to this profile; avatar styling remains a separate choice. */
export default function PersonaSwitcher({ home }: { home: PersonaHome }) {
  const id = useId();
  const [selected, setSelected] = useState(home.user.id);
  const [error, setError] = useState('');
  const choices = personaChoices(home);
  useEffect(() => { setSelected(home.user.id); setError(''); return watchPersona(home.user.id); }, [home.user.id]);
  if (choices.length < 2) return null;
  const changed = selected !== home.user.id;
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!changed) return;
    try { switchPersona(selected); }
    catch { setError('공간 선택을 저장하지 못했어요. 브라우저의 쿠키 설정을 확인해 주세요.'); }
  }
  return <form className="gs-persona-selector" aria-label="데모 구매자 선택" onSubmit={apply}>
    <label className="gs-persona-label" htmlFor={id}>체험할 공간</label>
    <select id={id} name="persona" aria-label="체험할 구매자" value={selected} onChange={event => { setSelected(event.target.value); setError(''); }}>
      {choices.map(persona => <option key={persona.id} value={persona.id}>{persona.name}</option>)}
    </select>
    <button type="submit" disabled={!changed}>{changed ? '이 공간 보기' : '현재 공간'}</button>
    <p className="gs-persona-hint">{choices.find(persona => persona.id === selected)?.theme || '구매자마다 다른 물건이 놓여 있어요'}</p>
    {error && <p className="gs-persona-error" role="alert">{error}</p>}
  </form>;
}
