'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { RecommendationDomain, RecommendationRequest } from '@/lib/recommendation/types';
import { DOMAIN_LABELS, saveRecommendationUser, useRecommendationPreferences, useRecommendationResult, useRecommendationStatus } from './client';
import { RecommendationContext, RecommendationProducts } from './RecommendationCards';
import './recommendation.css';

export default function RecommendationReview({ initialDomain = 'beauty' }: { initialDomain?: RecommendationDomain }) {
  const [domain, setDomain] = useState<RecommendationDomain>(initialDomain);
  const [retry, setRetry] = useState(0);
  const status = useRecommendationStatus(retry);
  const preferences = useRecommendationPreferences();
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
  const state = useRecommendationResult(request, retry);
  const pendingInput = sample !== submitted.sample || (!sample && draftUser.trim() !== submitted.userId);

  function submit(event: FormEvent) {
    event.preventDefault();
    const userId = draftUser.trim();
    setSubmitted({ sample, userId: sample ? '' : userId });
    if (!sample) saveRecommendationUser(userId);
    setNotice(sample ? '현재 카테고리의 예시 사용자로 추천을 조회합니다.' : userId ? '입력한 사용자의 추천을 조회합니다.' : '구매 기록이 없는 사용자의 추천을 조회합니다.');
    setRetry(value => value + 1);
  }

  return <main className="rec-review">
    <header className="rec-review-header"><a href="/" className="rec-home">← 내 공간</a><a href="/" className="rec-logo">G:Scene<span>•</span></a><span className="rec-review-tag">추천 검토</span></header>
    <section className="rec-intro"><span className="rec-eyebrow">RECOMMENDATION LAB</span><h1>사용자별 추천 상품</h1><p>구매·장바구니와 클릭 기록을 바탕으로 추천 상품과 선정 근거를 확인하세요.</p></section>
    <nav className="rec-domains" aria-label="추천 카테고리">{(Object.keys(DOMAIN_LABELS) as RecommendationDomain[]).map(value => <button key={value} type="button" aria-pressed={domain === value} onClick={() => { setDomain(value); setNotice(''); }}>{DOMAIN_LABELS[value]}</button>)}</nav>

    <form className="rec-controls" onSubmit={submit}>
      <div className="rec-user-field"><label htmlFor="recommendation-user">사용자 ID</label><input id="recommendation-user" value={draftUser} onChange={event => setDraftUser(event.target.value)} disabled={sample} maxLength={512} autoComplete="off" spellCheck={false} placeholder="비워두면 구매 기록 없이 추천" /><small>입력한 ID는 이 브라우저에 저장해 추천 검토 화면에서만 사용하며, URL에는 포함하지 않습니다.</small></div>
      <div className="rec-query-actions"><label className="rec-checkbox"><input type="checkbox" checked={sample} onChange={event => setSample(event.target.checked)} />예시 사용자로 조회</label><button className="rec-primary" type="submit" disabled={status.loading || !status.data?.ready}>추천 조회</button></div>
      {pendingInput && <p className="rec-form-note">입력을 바꿨어요. 추천 조회를 누르면 새 조건이 적용됩니다.</p>}
    </form>

    {status.loading ? <p className="rec-empty" role="status">추천 데이터 상태를 확인하고 있어요…</p>
      : status.error ? <div className="rec-empty" role="alert"><p>{status.error}</p><button className="rec-text-button" onClick={() => setRetry(value => value + 1)}>다시 확인</button></div>
      : !status.data?.ready ? <div className="rec-setup"><h2>추천 데이터 준비가 필요해요</h2><p>서버에서 CSV 데이터를 준비한 뒤 다시 확인해 주세요.</p><code>npm run recommendations:prepare</code><button className="rec-primary" onClick={() => setRetry(value => value + 1)}>준비 상태 다시 확인</button></div>
      : <>
        <div className="rec-data-summary"><span>{status.data.window ? `${status.data.window.from} ~ ${status.data.window.to}` : '준비된 데이터'} 기준</span><span>{typeof status.data.summary?.products === 'number' ? `${status.data.summary.products.toLocaleString('ko-KR')}개 상품 · ` : ''}{DOMAIN_LABELS[domain]}</span></div>
        <div className="rec-results-heading"><div><h2>{submitted.sample ? '예시 사용자' : submitted.userId ? '입력한 사용자' : '구매 기록 없는 사용자'}의 {DOMAIN_LABELS[domain]} 추천</h2><p>조회한 사용자와 카테고리의 추천 결과입니다.</p></div></div>
        <p className="rec-notice" role="status">{state.loading ? '추천 상품을 불러오고 있어요…' : notice || '추천 기준 상품과 각 상품의 선정 근거를 확인할 수 있어요.'}</p>
        {submitted.sample && !sampleAvailable ? <div className="rec-empty"><p>이 카테고리에는 사용할 예시 사용자가 없어요.</p><p>예시 사용자 체크를 해제하고 ID를 입력하거나, 빈 ID로 추천을 확인할 수 있어요.</p></div> : <div className="rec-comparison rec-comparison-single">
          <section className="rec-column" aria-label="추천 결과" aria-busy={state.loading}>
            {state.loading ? <p className="rec-empty" role="status">추천을 불러오고 있어요…</p> : state.error ? <div className="rec-empty" role="alert"><p>{state.error}</p><button className="rec-text-button" onClick={() => setRetry(value => value + 1)}>다시 시도</button></div> : state.result && <>
              <RecommendationContext result={state.result} />
              <RecommendationProducts items={state.result.items} diagnostic />
              <details className="rec-result-details"><summary>전체 결과 정보</summary><p>후보 {state.result.totalCandidates}개 · 제외 {state.result.excludedCount}개 · 추천 {state.result.items.length}개</p><p>사용자 상태: {{ history: '구매·장바구니 기록 있음', 'views-only': '클릭 기록만 있음', 'no-domain-history': '현재 카테고리 기록 없음', unknown: '사용자 기록 없음' }[state.result.userState]}</p><p>생성 시각: {state.result.data.builtAt}</p><p>점수는 이 결과 안에서 추천 순서를 비교하는 값입니다.</p></details>
            </>}
          </section>
        </div>}
      </>}
    <nav className="rec-return-links" aria-label="방 화면으로 이동"><a href="/fashion">패션 옷장</a><a href="/living">리빙 공간</a><a href="/food">푸드 주방</a><a href="/beauty">뷰티 화장대</a></nav>
  </main>;
}
