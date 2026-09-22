'use client';
import { useEffect, useState } from 'react';
import type { AssetLibraryResult, AssetSummary, AssetStatus, Domain, ProductWithAsset } from '../../src/lib/game-asset-types';
import { GameItemSprite } from '../../src/components/GameItemSprite';
import styles from './library.module.css';

const domains: Record<Domain, string> = { fashion: '옷장', food: '주방', living: '거실', beauty: '화장대' };
const statuses: Record<AssetStatus, string> = { ready: '연결 완료', pending_generation: '제작 대기', needs_review: '형태 확인' };
const colors: Record<string, string> = { unspecified: '색상 미확인', navy: '네이비', gray: '그레이', ivory: '아이보리', blue: '블루', yellow: '옐로', neutral: '공용 컬러' };

function ProductCard({ product }: { product: ProductWithAsset }) {
  const [photoError, setPhotoError] = useState(false);
  return <article className={styles.card}>
    <div className={styles.cardTop}><span>{domains[product.domain]}</span><span className={product.assetStatus === 'ready' ? styles.ready : styles.pending}>{statuses[product.assetStatus]}</span></div>
    <div className={styles.pair}>
      <div className={styles.photo}>{photoError ? <span>원본 이미지 확인 필요</span> : <img src={product.sourceImageUrl} alt={product.view_name} loading="lazy" referrerPolicy="no-referrer" onError={() => setPhotoError(true)} />}<small>실제 상품</small></div>
      <span className={styles.arrow} aria-hidden>→</span>
      <div className={styles.sprite}>{product.asset ? <GameItemSprite asset={product.asset} /> : <div className={styles.empty}><span>◇</span>{product.assetStatus === 'needs_review' ? '형태부터 확인해요' : '이 형태의 그림을 준비해요'}</div>}<small>내 공간 속 모습</small></div>
    </div>
    <div className={styles.productBody}>
      <span className={styles.id}>#{product.prd_id}</span>
      <h2>{product.view_name}</h2>
      <p className={styles.price}>{Number(product.discprice).toLocaleString('ko-KR')}원 <span>· CSV 기준</span></p>
      <div className={styles.family}>{product.familyLabel}<span>{colors[product.asset?.color ?? product.color] ?? product.color}</span></div>
      <details><summary>연결 기준 보기</summary>
        <p>{product.evidence.join(' · ') || '이미지로 형태를 확인해야 합니다.'}</p>
        {product.reasons.length > 0 && <p>{product.reasons.join(' · ')}</p>}
        <code>{product.assetUrl ?? '연결된 이미지 없음'}</code>
        <a href={product.sourceImageUrl} target="_blank" rel="noreferrer">원본 이미지 열기 ↗</a>
      </details>
    </div>
  </article>;
}

export function AssetLibrary({ summary }: { summary: AssetSummary }) {
  // Manifest counts describe the catalog, not whether its images are available.
  // Always hydrate cards through the API, including the first visit.
  const [result, setResult] = useState<AssetLibraryResult | null>(null);
  const [domain, setDomain] = useState(''); const [status, setStatus] = useState('ready');
  const [draft, setDraft] = useState(''); const [query, setQuery] = useState(''); const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setResult(null);
    const params = new URLSearchParams({ domain, status, q: query, page: String(page) });
    fetch(`/api/demo/game-assets?${params}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('상품 목록을 불러오지 못했습니다.');
      const next: AssetLibraryResult = await response.json();
      if (!controller.signal.aborted) setResult(next);
    }).catch(() => { if (!controller.signal.aborted) setError('에셋 서비스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [domain, status, query, page, attempt]);
  return <main className={styles.library}>
    <header className={styles.header}><a href="/">G:Scene<span>MY LITTLE SPACE</span></a><a className={styles.homeLink} href="/">내 공간으로 ↗</a></header>
    <section className={styles.intro}>
      <p className={styles.eyebrow}>상품과 공간을 잇는 작은 그림</p>
      <h1>같은 모양은 함께,<br />내 물건은 그대로.</h1>
      <p>상품 번호로 연결하고, 닮은 상품은 하나의 픽셀 에셋을 나눠 써요.<br className={styles.desktopBreak} /> 실제 상품 정보와 공간 속 표현을 나란히 확인해보세요.</p>
      <div className={styles.stats}>
        <div><strong>{summary.totalProducts.toLocaleString()}</strong><span>상품 번호 연결</span></div>
        <div><strong>{summary.assetFiles}</strong><span>준비된 에셋</span></div>
        <div><strong>{summary.assetStatuses.ready}</strong><span>카탈로그 연결 기록</span></div>
      </div>
    </section>
    <section className={styles.catalog} aria-label="상품 에셋 목록">
      <div className={styles.toolbar}>
        <div className={styles.domains}>{[['', '모든 공간'], ...Object.entries(domains)].map(([value, label]) => <button key={value} aria-pressed={domain === value} onClick={() => { setDomain(value); setPage(1); }}>{label}</button>)}</div>
        <form className={styles.search} onSubmit={event => { event.preventDefault(); setQuery(draft); setStatus(''); if (/^\d+$/.test(draft.trim())) setDomain(''); setPage(1); }}>
          <label className={styles.srOnly} htmlFor="asset-search">상품 번호 또는 상품명</label>
          <input id="asset-search" placeholder="상품 번호 또는 상품명" value={draft} onChange={event => setDraft(event.target.value)} />
          <button type="submit">찾기</button>
        </form>
      </div>
      <div className={styles.filters}>
        <label>상태 <select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
          <option value="">전체 {summary.totalProducts.toLocaleString()}개</option>
          {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label} {summary.assetStatuses[value as AssetStatus].toLocaleString()}개</option>)}
        </select></label>
        <span role="status">{loading ? '불러오는 중…' : result ? `${result.total.toLocaleString()}개 상품` : '목록을 확인할 수 없어요'}</span>
      </div>
      <p className={styles.note}>공간 속 그림은 형태를 단순화한 공용 에셋입니다. 구매 옵션·색상·구성 수량은 실제 상품 정보로 확인해요.</p>
      {error && <div role="alert"><p>{error}</p><button onClick={() => setAttempt(value => value + 1)}>다시 불러오기</button></div>}
      <div className={styles.grid} aria-busy={loading}>{result?.products.map(product => <ProductCard key={product.prd_id} product={product} />)}</div>
      {result && !result.products.length && <p className={styles.noResults}>조건에 맞는 상품이 없어요. 다른 상품 번호나 공간으로 찾아보세요.</p>}
      {result && result.pages > 1 && <nav className={styles.pagination} aria-label="목록 페이지"><button disabled={loading || result.page <= 1} onClick={() => setPage(result.page - 1)}>← 이전</button><span>{result.page} / {result.pages}</span><button disabled={loading || result.page >= result.pages} onClick={() => setPage(result.page + 1)}>다음 →</button></nav>}
    </section>
    <footer className={styles.footer}>GS SHOP 카탈로그 기반 · G:Scene 데모 에셋 검수</footer>
  </main>;
}
