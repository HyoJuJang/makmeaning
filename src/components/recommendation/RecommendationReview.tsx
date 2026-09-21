'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { RecommendationDomain, RecommendationMode, RecommendationRequest } from '@/lib/recommendation/types';
import { DOMAIN_LABELS, MODE_LABELS, saveRecommendationMode, saveRecommendationUser, useRecommendationPreferences, useRecommendationResult, useRecommendationStatus } from './client';
import { RecommendationContext, RecommendationFallback, RecommendationProducts } from './RecommendationCards';
import './recommendation.css';

type ViewMode = RecommendationMode | 'compare';

export default function RecommendationReview({ initialDomain = 'beauty' }: { initialDomain?: RecommendationDomain }) {
  const [domain, setDomain] = useState<RecommendationDomain>(initialDomain);
  const [view, setView] = useState<ViewMode>('compare');
  const [retry, setRetry] = useState(0);
  const status = useRecommendationStatus(retry);
  const preferences = useRecommendationPreferences(status.data?.defaultMode);
  const [draftUser, setDraftUser] = useState('');
  const [sample, setSample] = useState(true);
  const [submitted, setSubmitted] = useState<{ sample: boolean; userId: string }>({ sample: true, userId: '' });
  const [notice, setNotice] = useState('');
  const initialized = useRef(false);
  useEffect(() => {
    if (!preferences.ready || initialized.current) return;
    initialized.current = true;
    setDraftUser(preferences.userId);
    if (preferences.userId) {
      setSample(false);
      setSubmitted({ sample: false, userId: preferences.userId });
    }
  }, [preferences.ready, preferences.userId]);

  const sampleAvailable = status.data?.sampleDomains.includes(domain) ?? false;
  const request: Omit<RecommendationRequest, 'mode'> | null = preferences.ready && status.data?.ready && (!submitted.sample || sampleAvailable) ? {
    domain, limit: 6,
    ...(submitted.sample ? { sample: domain } : submitted.userId ? { userId: submitted.userId } : {}),
  } : null;
  const behavior = useRecommendationResult(request ? { ...request, mode: 'behavior' } : null, retry);
  const metadata = useRecommendationResult(request ? { ...request, mode: 'metadata' } : null, retry);
  const loading = behavior.loading || metadata.loading;
  const pendingInput = sample !== submitted.sample || (!sample && draftUser.trim() !== submitted.userId);

  function submit(event: FormEvent) {
    event.preventDefault();
    const userId = draftUser.trim();
    setSubmitted({ sample, userId: sample ? '' : userId });
    if (!sample) saveRecommendationUser(userId);
    setNotice(sample ? '현재 카테고리의 예시 사용자로 두 방식을 비교합니다.' : userId ? '입력한 사용자를 방 화면의 추천에도 적용했어요.' : '구매 기록이 없는 상태의 백업 결과를 비교합니다.');
    setRetry(value => value + 1);
  }

  function applyMode(mode: RecommendationMode) {
    saveRecommendationMode(mode);
    setNotice(`${MODE_LABELS[mode]} 방식을 이 브라우저의 방 화면에 적용했어요.`);
  }

  return <main className="rec-review">
    <header className="rec-review-header"><a href="/" className="rec-home">← 내 공간</a><a href="/" className="rec-logo">G:Scene<span>•</span></a><span className="rec-review-tag">추천 검토</span></header>
    <section className="rec-intro"><span className="rec-eyebrow">RECOMMENDATION LAB</span><h1>같은 취향, 두 가지 추천</h1><p>구매·장바구니를 바탕으로 한 본 추천과 카테고리 규칙만 쓰는 백업을 비교하고, 방 화면에 사용할 방식을 골라보세요.</p></section>
    <nav className="rec-domains" aria-label="추천 카테고리">{(Object.keys(DOMAIN_LABELS) as RecommendationDomain[]).map(value => <button key={value} type="button" aria-pressed={domain === value} onClick={() => { setDomain(value); setNotice(''); }}>{DOMAIN_LABELS[value]}</button>)}</nav>

    <form className="rec-controls" onSubmit={submit}>
      <div className="rec-user-field"><label htmlFor="recommendation-user">사용자 ID</label><input id="recommendation-user" value={draftUser} onChange={event => setDraftUser(event.target.value)} disabled={sample} maxLength={512} autoComplete="off" spellCheck={false} placeholder="비워두면 구매 기록 없이 추천" /><small>입력한 ID는 이 브라우저에 저장되며 URL에는 포함되지 않습니다.</small></div>
      <div className="rec-query-actions"><label className="rec-checkbox"><input type="checkbox" checked={sample} onChange={event => setSample(event.target.checked)} />예시 사용자로 비교</label><button className="rec-primary" type="submit" disabled={status.loading || !status.data?.ready}>추천 조회</button></div>
      {pendingInput && <p className="rec-form-note">입력을 바꿨어요. 추천 조회를 누르면 새 조건이 적용됩니다.</p>}
    </form>

    {status.loading ? <p className="rec-empty" role="status">추천 데이터 상태를 확인하고 있어요…</p>
      : status.error ? <div className="rec-empty" role="alert"><p>{status.error}</p><button className="rec-text-button" onClick={() => setRetry(value => value + 1)}>다시 확인</button></div>
      : !status.data?.ready ? <div className="rec-setup"><h2>추천 데이터 준비가 필요해요</h2><p>서버에서 CSV 데이터를 준비한 뒤 다시 확인해 주세요.</p><code>npm run recommendations:prepare</code><button className="rec-primary" onClick={() => setRetry(value => value + 1)}>준비 상태 다시 확인</button></div>
      : <>
        <div className="rec-data-summary"><span>{status.data.window ? `${status.data.window.from} ~ ${status.data.window.to}` : '준비된 데이터'} 기준</span><span>{typeof status.data.summary?.products === 'number' ? `${status.data.summary.products.toLocaleString('ko-KR')}개 상품 · ` : ''}{DOMAIN_LABELS[domain]}</span></div>
        <div className="rec-results-heading"><div><h2>{submitted.sample ? '예시 사용자' : submitted.userId ? '입력한 사용자' : '구매 기록 없는 사용자'}의 {DOMAIN_LABELS[domain]} 추천</h2><p>방 화면 적용: <b>{MODE_LABELS[preferences.mode]}</b>{submitted.sample && ' · 예시 사용자는 비교에만 사용합니다.'}</p></div><div className="rec-segment" aria-label="결과 보기">{(['behavior', 'metadata', 'compare'] as ViewMode[]).map(value => <button key={value} aria-pressed={view === value} onClick={() => setView(value)}>{value === 'compare' ? '나란히 비교' : value === 'behavior' ? '본 추천' : '백업 추천'}</button>)}</div></div>
        <p className="rec-notice" role="status">{notice || (loading ? '동일한 사용자와 카테고리로 두 추천을 불러오고 있어요…' : '결과를 확인하고 원하는 추천 방식을 방 화면에 적용하세요.')}</p>
        {submitted.sample && !sampleAvailable ? <div className="rec-empty"><p>이 카테고리에는 사용할 예시 사용자가 없어요.</p><p>예시 사용자 체크를 해제하고 ID를 입력하거나, 빈 ID로 백업을 확인할 수 있어요.</p></div> : <>
          <div className={`rec-comparison${view !== 'compare' ? ' rec-comparison-single' : ''}`}>
            {(['behavior', 'metadata'] as RecommendationMode[]).filter(mode => view === 'compare' || mode === view).map(mode => {
              const state = mode === 'behavior' ? behavior : metadata;
              return <section key={mode} className="rec-column" aria-label={`${MODE_LABELS[mode]} 결과`} aria-busy={state.loading}>
                <div className="rec-column-heading"><span className="rec-eyebrow">{mode === 'behavior' ? 'BEHAVIOR' : 'CATEGORY RULE'}</span><h2>{MODE_LABELS[mode]}</h2><p>{mode === 'behavior' ? '구매·장바구니와 다른 사용자의 행동, 인기도를 함께 봅니다.' : '기준 상품의 카테고리·브랜드로 연결합니다. 클릭·인기도는 쓰지 않습니다.'}</p><button className={preferences.mode === mode ? 'rec-applied' : 'rec-apply'} onClick={() => applyMode(mode)} aria-pressed={preferences.mode === mode}>{preferences.mode === mode ? '✓ 방 화면에 적용 중' : '이 방식을 방 화면에 적용'}</button></div>
                {state.loading ? <p className="rec-empty" role="status">추천을 불러오고 있어요…</p> : state.error ? <div className="rec-empty" role="alert"><p>{state.error}</p><button className="rec-text-button" onClick={() => setRetry(value => value + 1)}>다시 시도</button></div> : state.result && <>
                  <RecommendationFallback result={state.result} />
                  <RecommendationContext result={state.result} />
                  <RecommendationProducts items={state.result.items} diagnostic />
                  <details className="rec-result-details"><summary>전체 결과 정보</summary><p>후보 {state.result.totalCandidates}개 · 제외 {state.result.excludedCount}개 · 추천 {state.result.items.length}개</p><p>사용자 상태: {{ history: '구매·장바구니 기록 있음', 'views-only': '클릭 기록만 있음', 'no-domain-history': '현재 카테고리 기록 없음', unknown: '사용자 기록 없음' }[state.result.userState]}</p><p>생성 시각: {state.result.data.builtAt}</p><p>점수는 각 추천 방식 안에서 순서를 비교하는 값입니다.</p></details>
                </>}
              </section>;
            })}
          </div>
        </>}
      </>}
    <nav className="rec-return-links" aria-label="방 화면으로 이동"><a href="/fashion">패션 옷장</a><a href="/living">리빙 공간</a><a href="/food">푸드 주방</a><a href="/beauty">뷰티 화장대</a></nav>
  </main>;
}
