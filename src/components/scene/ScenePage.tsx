'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { DemoHome, Purchase } from '../../types/home';
import type { DemoScene, SceneCategory, SceneProduct } from '../../types/scene';
import { recommend, type SceneFilters } from '../../lib/scene/recommend';
import './scene.css';

const CONFIG = {
  fashion: {
    title: '내 옷장', english: 'MY WARDROBE', subtitle: '익숙한 옷에, 새로운 나를 더하기.',
    room: 'wardrobe-room.png', question: '오늘은 어떤 장면인가요?',
    situations: ['출근', '주말', '여행', '약속'], tastes: ['미니멀', '캐주얼', '포근한', '단정한'],
    kinds: ['전체', '하의', '아우터', '신발', '상의'], firstTaste: '미니멀',
    discovery: '오늘의 나에게 새로운 한 벌', anchorTitle: '함께 입을 아이템',
  },
  living: {
    title: '내 거실', english: 'MY LIVING ROOM', subtitle: '좋아하는 물건 곁에, 새로운 일상.',
    room: 'living-room.png', question: '어떤 시간을 보내고 싶나요?',
    situations: ['퇴근 후 휴식', '집들이', '주말 홈카페', '집중하는 시간'],
    tastes: ['내추럴', '미니멀', '포근한', '모던'], kinds: ['전체', '패브릭', '가구', '조명'],
    firstTaste: '내추럴', discovery: '내 공간에 작은 기분 전환', anchorTitle: '함께 놓을 아이템',
  },
} as const;
const SPRITES: Record<string, number> = {
  knit: 0, trousers: 1, shirt: 2, denim: 3, blazer: 4, tee: 5, sneakers: 6, flats: 7,
  loafers: 8, canvas: 9, sofa: 10, table: 11, cushion: 12, rug: 13, 'table-lamp': 14, 'mushroom-lamp': 15,
};
const money = (value: number) => value.toLocaleString('ko-KR');
const withParticle = (name: string) => (name.charCodeAt(name.length - 1) - 0xac00) % 28 ? '과' : '와';
const budgetLabel = (budget: number) => budget ? `${money(budget)}원 이하` : '예산 제한 없음';
type Item = Purchase | SceneProduct;
type Panel = 'owned' | 'cart' | 'saved' | 'product' | null;

function Icon({ name, size = 20 }: { name: 'back' | 'bag' | 'heart' | 'home' | 'arrow' | 'sliders' | 'check' | 'close'; size?: number }) {
  const paths = {
    back: <path d="m14 5-7 7 7 7M7 12h14" />,
    bag: <><path d="M5 7h14l1 14H4L5 7Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
    heart: <path d="M20.5 4.8a5.5 5.5 0 0 0-8.5 1 5.5 5.5 0 0 0-8.5-1C-.5 9 5.5 15 12 20c6.5-5 12.5-11 8.5-15.2Z" />,
    home: <><path d="m3 10 9-7 9 7v11h-7v-7h-4v7H3V10Z" /></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    sliders: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" /><circle cx="15" cy="17" r="3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function ProductVisual({ item }: { item: Pick<Item, 'imageUrl' | 'name'> }) {
  const sprite = item.imageUrl.startsWith('/scene-art/products.png#') ? SPRITES[item.imageUrl.split('#')[1]] : undefined;
  if (sprite !== undefined) {
    return <span className="sc-product-visual sc-sprite" role="img" aria-label={item.name} style={{ backgroundPosition: `${(sprite % 4) * 100 / 3}% ${Math.floor(sprite / 4) * 100 / 3}%` }} />;
  }
  return <img className="sc-product-visual" src={item.imageUrl} alt={item.name} loading="lazy" />;
}

function Dialog({ title, viewKey, onClose, children }: { title: string; viewKey: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = overflow; };
  }, []);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTop = 0;
    ref.current.querySelector<HTMLElement>('#sc-dialog-title')?.focus({ preventScroll: true });
  }, [viewKey]);
  return <dialog ref={ref} className="sc-dialog" aria-labelledby="sc-dialog-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="sc-dialog-inner">
      <div className="sc-dialog-head"><h2 id="sc-dialog-title" tabIndex={-1}>{title}</h2><button className="sc-icon-button" onClick={onClose} aria-label="닫기"><Icon name="close" /></button></div>
      {children}
    </div>
  </dialog>;
}

export default function ScenePage({ category }: { category: SceneCategory }) {
  const config = CONFIG[category];
  const initialFilters: SceneFilters = { situation: config.situations[0], tastes: [config.firstTaste], budget: 50000, kind: '전체', sort: 'recommended' };
  const [home, setHome] = useState<DemoHome | null>(null);
  const [catalog, setCatalog] = useState<DemoScene | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<'owned' | 'cart'>('owned');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [draft, setDraft] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [customBudget, setCustomBudget] = useState('');
  const [budgetError, setBudgetError] = useState('');
  const [panel, setPanel] = useState<Panel>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [storageReady, setStorageReady] = useState(false);
  const resultRef = useRef<HTMLElement>(null);
  const storeKey = `gscene-scene-${category}-v1`;

  useEffect(() => {
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 10000);
    let mounted = true;
    setError(false);
    async function load() {
      try {
        const responses = await Promise.all([
          fetch('/api/demo/home', { signal: abort.signal, cache: 'no-store' }),
          fetch(`/api/demo/scenes?category=${category}`, { signal: abort.signal, cache: 'no-store' }),
        ]);
        if (responses.some(response => !response.ok)) throw new Error('Scene unavailable');
        const [homeData, sceneData]: [DemoHome, DemoScene] = await Promise.all([responses[0].json(), responses[1].json()]);
        if (!Array.isArray(homeData.purchases) || !homeData.user?.name || sceneData.category !== category || !Array.isArray(sceneData.products) || !Array.isArray(sceneData.cartIds)) throw new Error('Invalid scene');
        if (!mounted) return;
        const ids = new Set(sceneData.products.map(product => product.id));
        let cart = sceneData.cartIds, saved: string[] = [];
        try {
          const stored = JSON.parse(localStorage.getItem(storeKey) || 'null');
          if (stored && Array.isArray(stored.cartIds)) cart = [...new Set<string>(stored.cartIds.filter((id: unknown) => typeof id === 'string' && ids.has(id)))];
          if (stored && Array.isArray(stored.savedIds)) saved = [...new Set<string>(stored.savedIds.filter((id: unknown) => typeof id === 'string' && ids.has(id)))];
        } catch { /* A blocked or corrupt local store must not prevent browsing. */ }
        setHome(homeData); setCatalog(sceneData); setCartIds(cart); setSavedIds(saved);
        setSelectedId(homeData.purchases.find(product => product.category === category)?.id || null);
        setStorageReady(true);
      } catch { if (mounted) setError(true); }
      finally { clearTimeout(timeout); }
    }
    load();
    return () => { mounted = false; abort.abort(); clearTimeout(timeout); };
  }, [category, attempt, storeKey]);

  useEffect(() => {
    if (!storageReady) return;
    try { localStorage.setItem(storeKey, JSON.stringify({ cartIds, savedIds })); }
    catch { setNotice('이 브라우저에서는 보관할 수 없어, 이번 방문 동안만 유지돼요.'); }
  }, [cartIds, savedIds, storageReady, storeKey]);
  useEffect(() => { if (!notice) return; const timeout = setTimeout(() => setNotice(''), 3500); return () => clearTimeout(timeout); }, [notice]);

  const purchases = home?.purchases.filter(product => product.category === category) || [];
  const cart = catalog?.products.filter(product => cartIds.includes(product.id)) || [];
  const saved = catalog?.products.filter(product => savedIds.includes(product.id)) || [];
  const rail: Item[] = tab === 'owned' ? purchases : cart;
  const anchor: Item | null = [...purchases, ...cart].find(product => product.id === selectedId) || null;
  const recommendations = recommend(catalog?.products || [], filters, anchor);
  const detail = catalog?.products.find(product => product.id === detailId);
  const detailMatch = recommendations.find(match => match.product.id === detailId);
  const dirty = JSON.stringify(draft) !== JSON.stringify(filters);

  function choose(item: Item, source: 'owned' | 'cart') { setSelectedId(item.id); setTab(source); }
  function changeTab(next: 'owned' | 'cart') { setTab(next); setSelectedId((next === 'owned' ? purchases : cart)[0]?.id || null); }
  function addCart(id: string) {
    if (cartIds.includes(id)) { setPanel('cart'); return; }
    setCartIds(previous => [...previous, id]); setNotice('장바구니에 담았어요. 이 상품과의 조합도 찾아보세요.');
  }
  function removeCart(id: string) { setCartIds(previous => previous.filter(value => value !== id)); if (selectedId === id) setSelectedId(null); }
  function toggleSaved(id: string) { setSavedIds(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]); }
  function applyFilters() {
    if (budgetError) return;
    setFilters({ ...draft, tastes: [...draft.tastes] });
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }));
  }
  function setBudget(value: string) {
    setCustomBudget(value);
    const amount = Number(value);
    if (value === '' || !Number.isSafeInteger(amount) || amount < 1000 || amount > 10000000) { setBudgetError('1,000원부터 10,000,000원까지 입력해 주세요.'); return; }
    setBudgetError(''); setDraft(previous => ({ ...previous, budget: amount }));
  }
  function resetFilters() { setDraft(initialFilters); setFilters(initialFilters); setCustomBudget(''); setBudgetError(''); }

  return <main className={`sc-page sc-${category}`}>
    <header className="sc-header">
      <a href="/" className="sc-back" aria-label="내 공간으로 돌아가기"><Icon name="back" /><span>내 공간</span></a>
      <a href="/" className="sc-brand">G:Scene<span>.</span></a>
      <button className="sc-icon-button sc-bag" aria-label={`장바구니 ${cartIds.length}개`} onClick={() => setPanel('cart')}><Icon name="bag" /><span>{cartIds.length}</span></button>
    </header>
    {(!home || !catalog) ? <section className="sc-load" role="status"><span className="sc-kicker">YOUR NEXT SCENE</span><h1>{error ? '공간을 불러오지 못했어요' : '나의 공간을 준비하고 있어요'}</h1><p>{error ? '연결을 확인한 뒤 다시 시도해 주세요.' : '구매한 물건과 새로운 취향을 연결하는 중'}</p>{error && <button className="sc-primary" onClick={() => setAttempt(value => value + 1)}>다시 불러오기</button>}</section> : <>
      <div className="sc-heading"><div><span className="sc-kicker">{config.english}</span><h1>{config.title}<span className="sc-title-dot">.</span></h1><p>{config.subtitle}</p></div><span className="sc-person"><span className="sc-person-dot" />{home.user.name}의 취향이 자라는 중</span></div>
      <div className="sc-layout">
        <div className="sc-context">
          <section className="sc-collection" aria-label={`구매한 상품이 있는 ${config.title}`}>
            <div className="sc-room">
              <img className="sc-room-art" src={`/scene-art/${config.room}`} alt={category === 'fashion' ? '메인 공간과 이어지는 아늑한 픽셀 옷장' : '소파와 우드 가구가 있는 아늑한 픽셀 거실'} />
              <span className="sc-room-label"><i />MY LITTLE {category === 'fashion' ? 'CLOSET' : 'ROOM'}</span>
              {purchases.map((product, index) => <button key={product.id} className={`sc-room-pin sc-pin-${product.id}`} aria-label={`${product.name} 기준으로 추천받기`} aria-pressed={selectedId === product.id} onClick={() => choose(product, 'owned')}><span>{index + 1}</span><span className="sc-pin-name">{product.name}</span></button>)}
              {category === 'living' && <><img className="sc-room-cushion" src="/products/cushion.svg" alt="" aria-hidden="true" /><img className="sc-room-lamp" src="/products/lamp.svg" alt="" aria-hidden="true" /></>}
              <span className="sc-room-footnote">구매한 물건은 번호로 표시했어요</span>
            </div>
            <div className="sc-inventory-head"><div className="sc-tabs" role="group" aria-label="추천 기준 상품 목록"><button aria-pressed={tab === 'owned'} onClick={() => changeTab('owned')}>구매한 상품 <span>{purchases.length}</span></button><button aria-pressed={tab === 'cart'} onClick={() => changeTab('cart')}>장바구니 <span>{cart.length}</span></button></div><button className="sc-text-button" onClick={() => setPanel(tab)}>전체 보기 ↗</button></div>
            <div className="sc-inventory-rail">
              {rail.map((product, index) => <button key={product.id} className="sc-owned-item" aria-pressed={selectedId === product.id} onClick={() => choose(product, tab)}><span className="sc-owned-photo"><ProductVisual item={product} />{tab === 'owned' && <span className="sc-item-index">{index + 1}</span>}{selectedId === product.id && <span className="sc-selected-check"><Icon name="check" size={12} /></span>}</span><span>{product.name}</span></button>)}
              <button className="sc-owned-item sc-new-item" aria-pressed={!anchor} onClick={() => setSelectedId(null)}><span className="sc-owned-photo"><span>＋</span></span><span>새롭게 둘러보기</span></button>
            </div>
            <div className="sc-anchor-caption"><span className="sc-small-star">✳</span>{anchor ? <p><b>{anchor.name}</b>{withParticle(anchor.name)}{category === 'fashion' ? ' 함께 입을 상품을 찾아요.' : ' 어울리는 물건을 찾아요.'}</p> : <p>가지고 있는 물건과 상관없이 <b>새로운 취향</b>을 찾아요.</p>}</div>
          </section>

          <section className="sc-conditions" aria-labelledby="sc-conditions-title">
            <div className="sc-section-title"><div><span className="sc-kicker">MAKE YOUR SCENE</span><h2 id="sc-conditions-title">{config.question}</h2></div><button className="sc-text-button" onClick={resetFilters}>초기화</button></div>
            <fieldset className="sc-chip-group"><legend>상황</legend><div>{config.situations.map(value => <button key={value} aria-pressed={draft.situation === value} onClick={() => setDraft(previous => ({ ...previous, situation: value }))}>{value}</button>)}</div></fieldset>
            <fieldset className="sc-chip-group"><legend>취향 <small>복수 선택</small></legend><div>{config.tastes.map(value => <button key={value} aria-pressed={draft.tastes.includes(value)} onClick={() => setDraft(previous => ({ ...previous, tastes: previous.tastes.includes(value) ? previous.tastes.filter(taste => taste !== value) : [...previous.tastes, value] }))}>{value}</button>)}</div></fieldset>
            <fieldset className="sc-chip-group"><legend>예산 <small>새 상품 1개 기준</small></legend><div>{[30000, 50000, 100000, 0].map(value => <button key={value} aria-pressed={draft.budget === value} onClick={() => { setDraft(previous => ({ ...previous, budget: value })); setCustomBudget(''); setBudgetError(''); }}>{value ? `${value / 10000}만원 이하` : '전체'}</button>)}</div></fieldset>
            <details className="sc-more-filters"><summary><span><Icon name="sliders" size={15} />상품 종류 · 예산 직접 입력</span><span>＋</span></summary><fieldset className="sc-chip-group"><legend>찾는 상품</legend><div>{config.kinds.map(value => <button key={value} aria-pressed={draft.kind === value} onClick={() => setDraft(previous => ({ ...previous, kind: value }))}>{value}</button>)}</div></fieldset><label className="sc-budget-input">직접 정하는 예산 <span><input type="number" inputMode="numeric" min="1000" max="10000000" step="1000" placeholder="예: 45000" value={customBudget} onChange={event => setBudget(event.target.value)} aria-invalid={!!budgetError} aria-describedby={budgetError ? 'sc-budget-error' : undefined} />원 이하</span></label>{budgetError && <p id="sc-budget-error" className="sc-input-error" role="alert">{budgetError}</p>}</details>
            <button className="sc-primary" onClick={applyFilters} disabled={!!budgetError}><span>이 조건으로 추천받기</span><Icon name="arrow" size={18} /></button>
            {dirty && <p className="sc-pending" role="status">선택한 조건을 적용하면 추천이 바뀌어요.</p>}
          </section>
        </div>

        <section className="sc-results" ref={resultRef} aria-labelledby="sc-results-title">
          <div className="sc-result-intro"><span className="sc-kicker">A LITTLE ADDITION, A NEW SCENE</span><h2 id="sc-results-title">{anchor ? <>{anchor.name}에<br /><em>새로운 장면</em>을 더하면</> : config.discovery}</h2><p>{category === 'fashion' ? '내일의 코디가 조금 더 쉬워지도록.' : '익숙한 공간이 조금 더 좋아지도록.'}</p></div>
          <div className="sc-active-filters" aria-label="적용된 추천 조건"><span>{filters.situation}</span>{filters.tastes.map(taste => <span key={taste}>{taste}</span>)}<span>{budgetLabel(filters.budget)}</span>{filters.kind !== '전체' && <span>{filters.kind}</span>}</div>
          <div className="sc-results-meta"><p aria-live="polite">함께 발견한 상품 <b>{recommendations.length}</b></p><label className="sc-sort"><span className="sr-only">상품 정렬</span><select value={filters.sort} onChange={event => { const sort = event.target.value as SceneFilters['sort']; setFilters(previous => ({ ...previous, sort })); setDraft(previous => ({ ...previous, sort })); }}><option value="recommended">추천순</option><option value="price-low">낮은 가격순</option></select></label></div>
          {recommendations.length === 0 ? <div className="sc-empty"><span>◌</span><h3>이 조건에는 아직 상품이 없어요</h3><p>예산을 조금 넓히거나, 상품 종류를 바꿔보세요.</p><button className="sc-outline" onClick={resetFilters}>조건 초기화</button></div> : <div className="sc-product-grid">{recommendations.map(({ product, reason, matches }, index) => <article className="sc-card" key={product.id}>
            <div className="sc-card-image"><button className="sc-card-open" aria-label={`${product.name} 상세 보기`} onClick={() => { setDetailId(product.id); setPanel('product'); }}><ProductVisual item={product} /></button><button className="sc-heart" aria-label={`${product.name} 찜`} aria-pressed={savedIds.includes(product.id)} onClick={() => toggleSaved(product.id)}><Icon name="heart" size={18} /></button>{index === 0 && filters.sort === 'recommended' && <span className="sc-top-pick">먼저 만나볼 아이템</span>}</div>
            <div className="sc-card-copy"><span className="sc-product-kind">{product.kind}</span><button className="sc-card-name" onClick={() => { setDetailId(product.id); setPanel('product'); }}>{product.name}</button><strong className="sc-price">{money(product.price)}<small>원</small></strong><p className="sc-reason"><span>↳</span>{reason}</p>{matches.length > 0 && <div className="sc-match-tags">{matches.slice(0, 2).map(match => <span key={match}>{match}</span>)}</div>}<button className={`sc-cart-button ${cartIds.includes(product.id) ? 'is-added' : ''}`} onClick={() => addCart(product.id)}>{cartIds.includes(product.id) ? <><Icon name="check" size={15} />담은 상품 보기</> : <><Icon name="bag" size={15} />장바구니에 담기</>}</button></div>
          </article>)}</div>}
          <p className="sc-demo-note">가상 고객 · 예시 상품과 가격으로 구성된 데모예요.<br />상황과 취향은 추천 순서에, 예산과 상품 종류는 표시할 상품에 반영돼요.</p>
        </section>
      </div>
    </>}
    <nav className="sc-bottom-nav" aria-label="공간 메뉴"><a href="/"><Icon name="home" size={18} /><span>내 공간</span></a><a href="/fashion" aria-current={category === 'fashion' ? 'page' : undefined}><span className="sc-nav-letter">F</span><span>패션</span></a><a href="/living" aria-current={category === 'living' ? 'page' : undefined}><span className="sc-nav-letter">L</span><span>리빙</span></a><button onClick={() => setPanel('saved')}><Icon name="heart" size={18} /><span>찜한 상품</span></button></nav>
    {notice && <div className="sc-toast" role="status">{notice}</div>}
    {panel && <Dialog viewKey={`${panel}:${panel === 'product' ? detailId : ''}`} title={panel === 'product' ? '내 장면에 더하기' : panel === 'owned' ? `나의 구매 상품 ${purchases.length}` : panel === 'saved' ? `찜한 상품 ${saved.length}` : `장바구니 ${cart.length}`} onClose={() => setPanel(null)}>
      {panel === 'product' && detail ? <><div className="sc-detail-image"><ProductVisual item={detail} /></div><div className="sc-detail-copy"><span className="sc-kicker">{detail.kind} / SCENE SAMPLE</span><h3>{detail.name}</h3><strong className="sc-detail-price">{money(detail.price)}원</strong><p>{detail.description}</p><div className="sc-detail-reason"><span>이 상품을 발견한 이유</span><p>{detailMatch?.reason || detail.description}</p></div><p className="sc-demo-note">실제 판매 상품이 아닌 예시예요. 결제는 진행되지 않아요.</p><button className="sc-primary" onClick={() => addCart(detail.id)}>{cartIds.includes(detail.id) ? '장바구니에서 보기' : '장바구니에 담기'}<Icon name="bag" size={18} /></button></div></> : <>
        <p className="sc-dialog-description">{panel === 'owned' ? '구매한 물건을 골라 새로운 조합을 찾아보세요.' : panel === 'cart' ? '아직 구매하지 않은 물건이에요. 함께 어울릴 상품도 찾아보세요.' : '마음에 든 상품을 모아뒀어요.'}</p>
        {(panel === 'owned' ? purchases : panel === 'cart' ? cart : saved).length === 0 && <div className="sc-empty"><Icon name={panel === 'saved' ? 'heart' : 'bag'} size={32} /><h3>{panel === 'saved' ? '마음에 드는 상품을 찜해보세요' : '아직 담아둔 상품이 없어요'}</h3><button className="sc-outline" onClick={() => setPanel(null)}>상품 둘러보기</button></div>}
        <div className="sc-dialog-list">{(panel === 'owned' ? purchases : panel === 'cart' ? cart : saved).map(product => <div className="sc-dialog-item" key={product.id}><div className="sc-dialog-thumb"><ProductVisual item={product} /></div><div><h3>{product.name}</h3><p>{'purchasedAt' in product ? `${product.purchasedAt} 구매` : `예시 가격 ${money(product.price)}원`}</p><button className="sc-text-button" onClick={() => { if (panel === 'saved') { setDetailId(product.id); setPanel('product'); } else { choose(product, panel === 'owned' ? 'owned' : 'cart'); setPanel(null); } }}>{panel === 'saved' ? '상품 자세히 보기 ↗' : '이 상품과 조합하기 ↗'}</button></div>{panel !== 'owned' && <button className="sc-icon-button" aria-label={`${product.name} ${panel === 'cart' ? '장바구니에서 삭제' : '찜 해제'}`} onClick={() => panel === 'cart' ? removeCart(product.id) : toggleSaved(product.id)}><Icon name="close" size={16} /></button>}</div>)}</div>
        {panel === 'cart' && cart.length > 0 && <div className="sc-cart-total"><span>새로 담은 상품 합계</span><strong>{money(cart.reduce((sum, product) => sum + product.price, 0))}원</strong><small>선택한 예산은 상품 1개 기준이며, 합계에는 적용되지 않아요.</small></div>}
      </>}
    </Dialog>}
  </main>;
}
