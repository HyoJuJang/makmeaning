'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { DemoHome, Purchase } from '../../types/home';
import { DEMO_STATE_KEY, applyOwnedOutfit, readDemoState, selectWardrobeProducts, updateDemoState, type DemoState } from '../../../app/demo-state.js';
import type { DemoScene, SceneCategory, SceneProduct } from '../../types/scene';
import { recommend, type SceneFilters } from '../../lib/scene/recommend';
import RoomAvatar from './RoomAvatar';
import { restoreSceneCollection } from '../../lib/scene/collection-state';
import RoomPlacement, { canPlaceInRoom } from './RoomPlacement';
import CategoryNav from '../navigation/CategoryNav';
import './scene.css';

const CONFIG = {
  fashion: {
    title: '내 옷장', english: 'MY WARDROBE',
    room: 'wardrobe-room.png', question: '오늘은 어떤 장면인가요?',
    situations: ['출근', '주말', '여행', '약속'], tastes: ['미니멀', '캐주얼', '포근한', '단정한'],
    kinds: ['전체', '하의', '아우터', '신발', '상의'],
    anchorTitle: '함께 입을 아이템',
  },
  living: {
    title: '내 거실', english: 'MY LIVING ROOM',
    room: 'living-room.png', question: '어떤 시간을 보내고 싶나요?',
    situations: ['퇴근 후 휴식', '집들이', '주말 홈카페', '집중하는 시간'],
    tastes: ['내추럴', '미니멀', '포근한', '모던'], kinds: ['전체', '패브릭', '가구', '조명'],
    anchorTitle: '함께 놓을 아이템',
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
type Panel = 'owned' | 'cart' | 'saved' | 'product' | 'filters' | null;

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

function ProductVisual({ item }: { item: Pick<Item, 'imageUrl' | 'name'> & Partial<Pick<Purchase, 'illustrationKey'>> }) {
  const visualLabel = item.illustrationKey ? `${item.name} 공간용 예시 그림` : item.name;
  const sprite = item.imageUrl.startsWith('/scene-art/products.png#') ? SPRITES[item.imageUrl.split('#')[1]] : undefined;
  if (sprite !== undefined) {
    return <span className="sc-product-visual sc-sprite" role="img" aria-label={visualLabel} style={{ backgroundPosition: `${(sprite % 4) * 100 / 3}% ${Math.floor(sprite / 4) * 100 / 3}%` }} />;
  }
  return <img className="sc-product-visual" src={item.imageUrl} alt={visualLabel} loading="lazy" />;
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
  const initialFilters: SceneFilters = { situation: '', tastes: [], budget: 0, kind: '전체', sort: 'recommended' };
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
  const [confirmedState, setConfirmedState] = useState<DemoState | null>(null);
  const [outfitPreviewId, setOutfitPreviewId] = useState<string | null>(null);
  const [interactionKey, setInteractionKey] = useState(0);
  const [seated, setSeated] = useState(false);
  const [lampPreview, setLampPreview] = useState<boolean | null>(null);
  const [placedId, setPlacedId] = useState<string | null>(null);
  const [lookIds, setLookIds] = useState<Record<string, string>>({});
  const [previewSequence, setPreviewSequence] = useState(0);
  const collectionRef = useRef<HTMLElement>(null);
  const previewFocus = useRef(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const returnToFilters = useRef(false);
  const loadedStoreKey = useRef<string | null>(null);
  const storeKey = `gscene-scene-${category}-v1`;

  useEffect(() => {
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 10000);
    let mounted = true;
    setError(false);
    setStorageReady(false);
    loadedStoreKey.current = null;
    setHome(null); setCatalog(null); setConfirmedState(null);
    setOutfitPreviewId(null); setLampPreview(null); setPlacedId(null); setLookIds({}); setSeated(false);
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
        let collection = restoreSceneCollection(sceneData, null);
        try { collection = restoreSceneCollection(sceneData, localStorage.getItem(storeKey)); }
        catch { /* Blocked storage keeps this visit usable. */ }
        setConfirmedState(readDemoState(homeData));
        setHome(homeData); setCatalog(sceneData); setCartIds(collection.cartIds); setSavedIds(collection.savedIds);
        setSelectedId(null);
        loadedStoreKey.current = storeKey;
        setStorageReady(true);
      } catch { if (mounted) setError(true); }
      finally { clearTimeout(timeout); }
    }
    load();
    return () => { mounted = false; abort.abort(); clearTimeout(timeout); };
  }, [category, attempt, storeKey]);

  useEffect(() => {
    if (!storageReady || loadedStoreKey.current !== storeKey) return;
    try { localStorage.setItem(storeKey, JSON.stringify({ cartIds, savedIds })); }
    catch { setNotice('이 브라우저에서는 보관할 수 없어, 이번 방문 동안만 유지돼요.'); }
  }, [cartIds, savedIds, storageReady, storeKey]);
  useEffect(() => { if (!notice) return; const timeout = setTimeout(() => setNotice(''), 3500); return () => clearTimeout(timeout); }, [notice]);

  useEffect(() => {
    if (!home || !catalog) return;
    const restore = () => {
      setConfirmedState(readDemoState(home));
      try {
        const next = restoreSceneCollection(catalog, localStorage.getItem(storeKey));
        setCartIds(previous => JSON.stringify(previous) === JSON.stringify(next.cartIds) ? previous : next.cartIds);
        setSavedIds(previous => JSON.stringify(previous) === JSON.stringify(next.savedIds) ? previous : next.savedIds);
      } catch { /* Keep current in-memory choices when storage is unavailable. */ }
    };
    const onStorage = (event: StorageEvent) => { if ([DEMO_STATE_KEY, storeKey, null].includes(event.key)) restore(); };
    const onPageShow = () => { restore(); setOutfitPreviewId(null); setLampPreview(null); setPlacedId(null); setLookIds({}); setSeated(false); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', onPageShow);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('pageshow', onPageShow); };
  }, [home, catalog, storeKey]);

  const purchases = home?.purchases.filter(product => product.category === category) || [];
  const wardrobeProducts = home && confirmedState ? selectWardrobeProducts(home, confirmedState) : [];
  const previewPurchase = purchases.find(product => product.id === outfitPreviewId);
  const previewArt = previewPurchase?.illustrationKey;
  const outfitPreview = previewArt === 'knit' || previewArt === 'shirt' ? previewArt : null;
  const previewHanger = wardrobeProducts.findIndex(product => product.id === outfitPreviewId);
  const wardrobeStyle = { '--sc-preview-hanger-x': 23.5 + (Math.max(0, previewHanger) + .5) * 50.8 / Math.max(1, wardrobeProducts.length) } as CSSProperties;
  const lampLit = lampPreview ?? confirmedState?.lampOn ?? false;
  const cart = catalog?.products.filter(product => cartIds.includes(product.id)) || [];
  const saved = catalog?.products.filter(product => savedIds.includes(product.id)) || [];
  const rail: Item[] = tab === 'owned' ? purchases : cart;
  const anchor: Item | null = [...purchases, ...cart].find(product => product.id === selectedId) || null;
  const anchorArt = anchor && 'illustrationKey' in anchor ? anchor.illustrationKey : null;
  const recommendations = recommend(catalog?.products || [], filters, anchor);
  const detail = catalog?.products.find(product => product.id === detailId);
  const detailMatch = recommendations.find(match => match.product.id === detailId);
  const placedProduct = catalog?.products.find(product => product.id === placedId);
  const lookProducts = catalog?.products.filter(product => Object.values(lookIds).includes(product.id)) || [];
  const anchorKind = anchor && ('kind' in anchor ? anchor.kind : '상의');
  const lookKinds = ['상의', '하의', '신발', ...(lookIds['아우터'] || anchorKind === '아우터' ? ['아우터'] : [])];
  const canPreview = (product: SceneProduct) => category === 'fashion' || canPlaceInRoom(product.id);
  const isPreviewed = (product: SceneProduct) => category === 'fashion' ? lookIds[product.kind] === product.id : placedId === product.id;
  const dirty = JSON.stringify(draft) !== JSON.stringify(filters);
  const draftCount = recommend(catalog?.products || [], draft, anchor).length;
  const filterParts = [filters.situation, ...filters.tastes, filters.budget ? budgetLabel(filters.budget) : '', filters.kind === '전체' ? '' : filters.kind].filter(Boolean);
  const filterSummary = filterParts.join(' · ') || '조건 없이 추천받는 중';

  useEffect(() => {
    if (panel || !returnToFilters.current) return;
    returnToFilters.current = false;
    const frame = requestAnimationFrame(() => filterButtonRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [panel]);

  useEffect(() => {
    if (panel || !previewFocus.current) return;
    previewFocus.current = false;
    const frame = requestAnimationFrame(() => {
      collectionRef.current?.focus({ preventScroll: true });
      collectionRef.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [previewSequence, panel]);

  function previewProduct(product: SceneProduct) {
    if (!canPreview(product)) return;
    if (category === 'fashion') setLookIds(previous => ({ ...previous, [product.kind]: product.id }));
    else { setPlacedId(product.id); setSeated(false); }
    setPanel(null);
    previewFocus.current = true;
    setPreviewSequence(value => value + 1);
    setNotice(category === 'fashion' ? '코디 보드에 추가했어요.' : '공간에 미리 놓아봤어요.');
  }
  function clearPreview() {
    setLookIds({}); setPlacedId(null);
    requestAnimationFrame(() => collectionRef.current?.focus({ preventScroll: true }));
  }
  function restoreOutfit() {
    setOutfitPreviewId(null); setInteractionKey(value => value + 1);
    requestAnimationFrame(() => collectionRef.current?.focus({ preventScroll: true }));
  }

  function applyOutfit() {
    if (!home || !confirmedState || !previewPurchase || !outfitPreview) return;
    const { state: next, saved: stored } = updateDemoState(home, confirmedState, latest => applyOwnedOutfit(home, latest, previewPurchase.id));
    if (!stored) {
      setNotice('착장을 저장하지 못했어요. 현재 미리보기는 유지돼요.');
      return;
    }
    setConfirmedState(next);
    setOutfitPreviewId(null);
    setInteractionKey(value => value + 1);
    setNotice('내 착장으로 적용했어요. 내 공간에서도 이어져요.');
  }

  function openFilters() {
    setDraft({ ...filters, tastes: [...filters.tastes] });
    setCustomBudget([0, 30000, 50000, 100000].includes(filters.budget) ? '' : String(filters.budget));
    setBudgetError('');
    returnToFilters.current = true;
    setPanel('filters');
  }

  function choose(item: Item, source: 'owned' | 'cart') {
    setSelectedId(item.id); setTab(source);
    if (source !== 'owned') setOutfitPreviewId(null);
    if (category === 'fashion' && source === 'owned' && 'illustrationKey' in item && (item.illustrationKey === 'knit' || item.illustrationKey === 'shirt')) {
      setOutfitPreviewId(item.id); setInteractionKey(value => value + 1);
    }
  }
  function changeTab(next: 'owned' | 'cart') { setTab(next); setSelectedId(null); if (next === 'cart') setOutfitPreviewId(null); }
  function addCart(id: string) {
    if (cartIds.includes(id)) { setPanel('cart'); return; }
    setCartIds(previous => [...previous, id]); setNotice('장바구니에 담았어요. 이 상품과의 조합도 찾아보세요.');
  }
  function removeCart(id: string) { setCartIds(previous => previous.filter(value => value !== id)); if (selectedId === id) setSelectedId(null); }
  function toggleSaved(id: string) { setSavedIds(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]); }
  function removeDialogItem(id: string) {
    if (panel === 'cart') removeCart(id); else toggleSaved(id);
    requestAnimationFrame(() => document.getElementById('sc-dialog-title')?.focus({ preventScroll: true }));
  }
  function applyFilters() {
    if (budgetError) return;
    setFilters({ ...draft, tastes: [...draft.tastes] });
    setPanel(null);
  }
  function setBudget(value: string) {
    setCustomBudget(value);
    const amount = Number(value);
    if (value === '' || !Number.isSafeInteger(amount) || amount < 1000 || amount > 10000000) { setBudgetError('1,000원부터 10,000,000원까지 입력해 주세요.'); return; }
    setBudgetError(''); setDraft(previous => ({ ...previous, budget: amount }));
  }
  function resetDraft() { setDraft({ ...initialFilters, sort: filters.sort }); setCustomBudget(''); setBudgetError(''); }
  function resetFilters() { resetDraft(); setFilters({ ...initialFilters, sort: filters.sort }); }

  return <main className={`sc-page sc-${category}`}>
    <header className="sc-header">
      <a href="/" className="sc-back" aria-label="내 공간으로 돌아가기"><Icon name="back" /><span>내 공간</span></a>
      <a href="/" className="sc-brand">G:Scene<span>.</span></a>
      <div className="sc-header-actions">
        <button className="sc-icon-button" aria-label={`찜한 상품 ${savedIds.length}개`} onClick={() => setPanel('saved')}><Icon name="heart" /></button>
        <button className="sc-icon-button sc-bag" aria-label={`장바구니 ${cartIds.length}개`} onClick={() => setPanel('cart')}><Icon name="bag" /><span>{cartIds.length}</span></button>
      </div>
    </header>
    {(!home || !catalog) ? <section className="sc-load" role="status"><span className="sc-kicker">YOUR NEXT SCENE</span><h1>{error ? '공간을 불러오지 못했어요' : '나의 공간을 준비하고 있어요'}</h1><p>{error ? '연결을 확인한 뒤 다시 시도해 주세요.' : '구매한 물건과 새로운 취향을 연결하는 중'}</p>{error && <button className="sc-primary" onClick={() => setAttempt(value => value + 1)}>다시 불러오기</button>}</section> : <>
      <div className="sc-heading"><div><span className="sc-room-number">{category === 'fashion' ? '01' : '02'}</span><h1>{config.title}</h1></div><span className="sc-person">{home.user.name}의 작은 취향 공간</span></div>
      <div className="sc-layout">
        <div className="sc-context">
          <section ref={collectionRef} tabIndex={-1} id="sc-room-preview" className="sc-collection" aria-label={`구매한 상품이 있는 ${config.title}`}>
            <div className="sc-room-hud"><span><i />{config.english}</span>{category === 'living' ? <div className="sc-room-controls"><button aria-pressed={lampLit} onClick={() => setLampPreview(!lampLit)}>{lampLit ? '조명 끄기 체험' : '조명 켜기 체험'}</button><button aria-pressed={seated} onClick={() => setSeated(value => !value)}>{seated ? '↟ 일어나기' : '⌑ 소파 앉기'}</button></div> : outfitPreview ? <button className="sc-outfit-reset" onClick={restoreOutfit}>입어보기 취소</button> : <span>MY ITEMS <b>{String(purchases.length).padStart(2, '0')}</b></span>}</div>
            <div className={`sc-room ${lampLit ? 'sc-light-on' : ''}`} style={category === 'fashion' ? wardrobeStyle : undefined} data-preview-product={placedId || undefined} data-confirmed-outfit-id={confirmedState?.outfitId} data-preview-outfit-id={outfitPreviewId || undefined}>
              <img className="sc-room-art" src={`/scene-art/${config.room}`} alt={category === 'fashion' ? '메인 공간과 이어지는 아늑한 픽셀 옷장' : '소파와 우드 가구가 있는 아늑한 픽셀 거실'} />
              {category === 'living' && <span className="sc-room-light" aria-hidden="true" />}
              {placedProduct && <RoomPlacement key={`${placedProduct.id}-${previewSequence}`} productId={placedProduct.id} lit={lampLit} />}
              {category === 'fashion' && <div className="sc-wardrobe-owned" aria-label="내가 보유한 의류 옷걸이">
                {wardrobeProducts.map(product => <button key={product.id} className="sc-wardrobe-garment" data-wardrobe-product-id={product.id} data-wearing={confirmedState?.outfitId === product.id} aria-label={`${product.name} 입어보기${confirmedState?.outfitId === product.id ? ', 현재 착장' : ''}`} aria-pressed={outfitPreviewId === product.id} onClick={() => choose(product, 'owned')}>
                  <svg className="sc-owned-hanger" viewBox="0 0 60 24" aria-hidden="true"><path d="M30 9V6c7-7-6-9-6-3M30 9 9 22h42L30 9Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
                  <img src={product.imageUrl} alt="" aria-hidden="true" />
                  <span>{purchases.findIndex(item => item.id === product.id) + 1}{confirmedState?.outfitId === product.id && <i aria-hidden="true">✓</i>}</span>
                </button>)}
              </div>}
              <RoomAvatar home={home} confirmedState={confirmedState ?? undefined} category={category} outfitPreview={outfitPreview} seated={seated} interactionKey={interactionKey} />
              {category === 'living' && anchor && anchorArt && tab === 'owned' && <span key={`${anchor.id}-${interactionKey}`} className={`sc-room-target sc-target-${anchorArt}`} aria-hidden="true" /> }
              {category === 'living' && purchases.map((product, index) => <button key={product.id} className={`sc-room-pin sc-pin-${product.illustrationKey}`} aria-label={`${product.name} 기준으로 추천받기`} aria-pressed={selectedId === product.id} onClick={() => choose(product, 'owned')}><span>{index + 1}</span></button>)}
              {category === 'living' && <><img className="sc-room-cushion" src="/products/cushion.svg" alt="" aria-hidden="true" /><img className="sc-room-lamp" src="/products/lamp.svg" alt="" aria-hidden="true" /></>}
              <span className="sc-room-footnote">{placedProduct ? '공간 미리보기' : category === 'fashion' ? outfitPreview ? '캐릭터 착장 미리보기' : '옷을 눌러 입어보세요' : '번호를 눌러 조합해보세요'}</span>
            </div>
            {outfitPreview && previewPurchase && <div className="sc-confirmed-preview" aria-live="polite"><span><b>입어보기</b> {previewPurchase.name}</span><div><button onClick={restoreOutfit}>취소</button><button className="sc-apply-outfit" onClick={applyOutfit}>내 착장으로 적용</button></div></div>}
            {category === 'living' && lampPreview !== null && <div className="sc-confirmed-preview" aria-live="polite"><span><b>조명 미리보기</b> 내 공간의 조명 상태는 유지돼요.</span><button onClick={() => setLampPreview(null)}>미리보기 취소</button></div>}
            <p className="sc-ownership-note">가상 고객의 구매 목록 · 실상품 카탈로그 참고가<br />공간 그림은 상품의 정확한 외형이나 가상 피팅이 아니에요.</p>
            {placedProduct && <div className="sc-placement-caption" aria-live="polite"><span><b>미리보기</b> {placedProduct.name}</span><button onClick={clearPreview}>↶ 되돌리기</button><small>색감과 분위기를 보는 예시예요.</small></div>}
            <div className="sc-inventory-head"><div className="sc-tabs" role="group" aria-label="추천 기준 상품 목록"><button aria-pressed={tab === 'owned'} onClick={() => changeTab('owned')}>구매한 상품 <span>{purchases.length}</span></button><button aria-pressed={tab === 'cart'} onClick={() => changeTab('cart')}>장바구니 <span>{cart.length}</span></button></div><button className="sc-text-button" onClick={() => setPanel(tab)}>전체 보기 ↗</button></div>
            <div className="sc-inventory-rail">
              {rail.map((product, index) => <button key={product.id} className="sc-owned-item" data-owned-product-id={tab === 'owned' ? product.id : undefined} title={product.name} aria-pressed={selectedId === product.id} onClick={() => choose(product, tab)}><span className="sc-owned-photo"><ProductVisual item={product} />{tab === 'owned' && <span className="sc-item-index">{index + 1}</span>}{selectedId === product.id && <span className="sc-selected-check"><Icon name="check" size={12} /></span>}</span><span className="sc-owned-name">{product.name}</span>{tab === 'owned' && <small>{money(product.price)}원 참고가{category === 'fashion' && confirmedState?.outfitId === product.id ? ' · 입고 있어요' : ''}</small>}</button>)}
              <button className="sc-owned-item sc-new-item" aria-pressed={!anchor} onClick={() => setSelectedId(null)}><span className="sc-owned-photo"><span>＋</span></span><span>새롭게 둘러보기</span></button>
            </div>
            <div className="sc-anchor-caption" aria-live="polite"><span className="sc-small-star" aria-hidden="true">＋</span>{anchor ? <p><b>{anchor.name}</b>{withParticle(anchor.name)} {category === 'fashion' ? '함께 입기' : '함께 놓기'}</p> : <p>내 물건과 상관없이 <b>새로운 취향 찾기</b></p>}<span className="sc-anchor-arrow" aria-hidden="true">↓</span></div>
          </section>
          {category === 'fashion' && lookProducts.length > 0 && <section className="sc-look-board" aria-label="코디 보드 미리보기"><div className="sc-look-head"><h2>나의 코디 보드 <small>미리보기</small></h2><button onClick={clearPreview}>↶ 코디 비우기</button></div><div className="sc-look-slots">{lookKinds.map(kind => {
            const added = lookProducts.find(product => product.kind === kind);
            const item = added || (anchorKind === kind ? anchor : null);
            return <div className={`sc-look-slot ${added ? 'sc-look-added' : ''}`} key={kind}><span>{kind}</span>{item ? <div key={item.id}><ProductVisual item={item} /><p>{item.name}</p><small>{added ? '미리보기' : 'purchasedAt' in item ? '내 옷' : '기준 상품'}</small></div> : <div className="sc-look-empty">＋<small>골라보세요</small></div>}</div>;
          })}</div><p className="sc-look-note">같은 종류를 고르면 교체돼요. 마음에 들면 상품 카드에서 장바구니에 담아보세요.</p></section>}
        </div>

        <section className="sc-results" aria-labelledby="sc-results-title">
          <button ref={filterButtonRef} className="sc-filter-summary" onClick={openFilters} aria-haspopup="dialog" aria-label={`추천 조건 변경: ${filterSummary}`}><Icon name="sliders" size={17} /><span>{filterSummary}</span><b>{filterParts.length ? '조건 수정' : '조건 추가'}</b><span aria-hidden="true">＋</span></button>
          <div className="sc-results-heading"><h2 id="sc-results-title"><span className="sc-pixel-spark" aria-hidden="true">✦</span>{anchor ? config.anchorTitle : '새로운 취향 발견'} <span className="sc-result-count" aria-live="polite">{recommendations.length}</span></h2><label className="sc-sort"><span className="sr-only">상품 정렬</span><select value={filters.sort} onChange={event => { const sort = event.target.value as SceneFilters['sort']; setFilters(previous => ({ ...previous, sort })); setDraft(previous => ({ ...previous, sort })); }}><option value="recommended">추천순</option><option value="price-low">낮은 가격순</option></select></label></div>
          <p className="sc-sample-note">가상 예시 상품으로 살펴보는 Scene 추천</p>
          {recommendations.length === 0 ? <div className="sc-empty"><span>◌</span><h3>이 조건에는 아직 상품이 없어요</h3><p>예산을 조금 넓히거나, 상품 종류를 바꿔보세요.</p><button className="sc-outline" onClick={resetFilters}>조건 초기화</button></div> : <div className="sc-product-grid">{recommendations.map(({ product, reason, matches }, index) => <article className="sc-card" key={product.id}>
            <div className="sc-card-image"><button className="sc-card-open" aria-label={`${product.name} 상세 보기`} onClick={() => { setDetailId(product.id); setPanel('product'); }}><ProductVisual item={product} /></button><button className="sc-heart" aria-label={`${product.name} 찜`} aria-pressed={savedIds.includes(product.id)} onClick={() => toggleSaved(product.id)}><Icon name="heart" size={18} /></button>{index === 0 && filters.sort === 'recommended' && <span className="sc-top-pick">먼저 만나볼 아이템</span>}</div>
            <div className="sc-card-copy"><span className="sc-product-kind">{product.kind}</span><button className="sc-card-name" onClick={() => { setDetailId(product.id); setPanel('product'); }}>{product.name}</button><strong className="sc-price">{money(product.price)}<small>원</small></strong>{canPreview(product) && <button className={`sc-preview-button ${isPreviewed(product) ? 'is-previewed' : ''}`} aria-label={`${product.name} ${category === 'fashion' ? '코디에 더하기' : '내 공간에 놓아보기'}`} aria-controls="sc-room-preview" onClick={() => previewProduct(product)}><span aria-hidden="true">{isPreviewed(product) ? '✓' : '＋'}</span>{category === 'fashion' ? isPreviewed(product) ? '코디 보드 보기' : '코디에 더하기' : isPreviewed(product) ? '놓아둔 공간 보기' : '내 공간에 놓아보기'}</button>}<p className="sc-reason"><span>↳</span>{reason}</p>{matches.length > 0 && <div className="sc-match-tags">{matches.slice(0, 2).map(match => <span key={match}>{match}</span>)}</div>}<button className={`sc-cart-button ${cartIds.includes(product.id) ? 'is-added' : ''}`} onClick={() => addCart(product.id)}>{cartIds.includes(product.id) ? <><Icon name="check" size={15} />담은 상품 보기</> : <><Icon name="bag" size={15} />장바구니에 담기</>}</button></div>
          </article>)}</div>}
          <p className="sc-demo-note">추천 목록의 상품·가격은 가상 예시이며, 구매 목록의 실상품 카탈로그와 구분돼요.<br />상황과 취향은 추천 순서에, 예산과 상품 종류는 표시할 상품에 반영돼요.</p>
        </section>
      </div>
    </>}
    <CategoryNav activeCategory={category} />
    {notice && <div className="sc-toast" role="status">{notice}</div>}
    {panel && <Dialog viewKey={`${panel}:${panel === 'product' ? detailId : ''}`} title={panel === 'filters' ? '나만의 Scene 설정' : panel === 'product' ? '내 장면에 더하기' : panel === 'owned' ? `나의 구매 상품 ${purchases.length}` : panel === 'saved' ? `찜한 상품 ${saved.length}` : `장바구니 ${cart.length}`} onClose={() => setPanel(null)}>
      {panel === 'filters' ? (
          <section className="sc-conditions" aria-labelledby="sc-conditions-title">
            <div className="sc-section-title"><p id="sc-conditions-title">{config.question}</p><button className="sc-text-button" onClick={resetDraft}>초기화</button></div>
            <fieldset className="sc-chip-group"><legend>상황 <small>선택 사항</small></legend><div>{['', ...config.situations].map(value => <button key={value || 'all'} aria-pressed={draft.situation === value} onClick={() => setDraft(previous => ({ ...previous, situation: value }))}>{value || '전체'}</button>)}</div></fieldset>
            <fieldset className="sc-chip-group"><legend>취향 <small>복수 선택</small></legend><div>{config.tastes.map(value => <button key={value} aria-pressed={draft.tastes.includes(value)} onClick={() => setDraft(previous => ({ ...previous, tastes: previous.tastes.includes(value) ? previous.tastes.filter(taste => taste !== value) : [...previous.tastes, value] }))}>{value}</button>)}</div></fieldset>
            <fieldset className="sc-chip-group"><legend>예산 <small>새 상품 1개 기준</small></legend><div>{[0, 30000, 50000, 100000].map(value => <button key={value} aria-pressed={draft.budget === value} onClick={() => { setDraft(previous => ({ ...previous, budget: value })); setCustomBudget(''); setBudgetError(''); }}>{value ? `${value / 10000}만원 이하` : '제한 없음'}</button>)}</div></fieldset>
            <details className="sc-more-filters" open><summary><span><Icon name="sliders" size={15} />상품 종류 · 예산 직접 입력</span><span>＋</span></summary><fieldset className="sc-chip-group"><legend>찾는 상품</legend><div>{config.kinds.map(value => <button key={value} aria-pressed={draft.kind === value} onClick={() => setDraft(previous => ({ ...previous, kind: value }))}>{value}</button>)}</div></fieldset><label className="sc-budget-input">직접 정하는 예산 <span><input type="number" inputMode="numeric" min="1000" max="10000000" step="1" placeholder="예: 45000" value={customBudget} onChange={event => setBudget(event.target.value)} aria-invalid={!!budgetError} aria-describedby={budgetError ? 'sc-budget-error' : undefined} />원 이하</span></label></details>
            {budgetError && <p id="sc-budget-error" className="sc-input-error" role="alert">{budgetError}</p>}
            <button className="sc-primary" onClick={applyFilters} disabled={!!budgetError}><span>{draftCount ? `${draftCount}개 상품 추천받기` : '이 조건으로 확인하기'}</span><Icon name="arrow" size={18} /></button>
            {dirty && <p className="sc-pending" role="status">선택한 조건을 적용하면 추천이 바뀌어요.</p>}
          </section>
      ) : panel === 'product' && detail ? <><div className="sc-detail-image"><ProductVisual item={detail} /></div><div className="sc-detail-copy"><span className="sc-kicker">{detail.kind} / SCENE SAMPLE</span><h3>{detail.name}</h3><strong className="sc-detail-price">{money(detail.price)}원</strong><p>{detail.description}</p><div className="sc-detail-reason"><span>이 상품을 발견한 이유</span><p>{detailMatch?.reason || detail.description}</p></div><p className="sc-demo-note">실제 판매 상품이 아닌 예시예요. 결제는 진행되지 않아요.</p>{canPreview(detail) && <button className="sc-preview-button" onClick={() => previewProduct(detail)}>＋ {category === 'fashion' ? '코디에 더하기' : '내 공간에 놓아보기'}</button>}<button className="sc-primary" onClick={() => addCart(detail.id)}>{cartIds.includes(detail.id) ? '장바구니에서 보기' : '장바구니에 담기'}<Icon name="bag" size={18} /></button></div></> : <>
        <p className="sc-dialog-description">{panel === 'owned' ? '가상 구매 이력이에요. 이름·참고가는 실상품 카탈로그 기준이며, 그림은 실제 외형이 아니에요.' : panel === 'cart' ? '아직 구매하지 않은 물건이에요. 함께 어울릴 상품도 찾아보세요.' : '마음에 든 상품을 모아뒀어요.'}</p>
        {(panel === 'owned' ? purchases : panel === 'cart' ? cart : saved).length === 0 && <div className="sc-empty"><Icon name={panel === 'saved' ? 'heart' : 'bag'} size={32} /><h3>{panel === 'saved' ? '마음에 드는 상품을 찜해보세요' : '아직 담아둔 상품이 없어요'}</h3><button className="sc-outline" onClick={() => setPanel(null)}>상품 둘러보기</button></div>}
        <div className="sc-dialog-list">{(panel === 'owned' ? purchases : panel === 'cart' ? cart : saved).map(product => <div className="sc-dialog-item" key={product.id}><div className="sc-dialog-thumb"><ProductVisual item={product} /></div><div><h3>{product.name}</h3><p>{'purchasedAt' in product ? `${product.purchasedAt} 가상 구매 · 카탈로그 참고가 ${money(product.price)}원` : `예시 가격 ${money(product.price)}원`}</p><button className="sc-text-button" onClick={() => { if (panel === 'saved') { setDetailId(product.id); setPanel('product'); } else { choose(product, panel === 'owned' ? 'owned' : 'cart'); setPanel(null); } }}>{panel === 'saved' ? '상품 자세히 보기 ↗' : '이 상품과 조합하기 ↗'}</button></div>{panel !== 'owned' && <button className="sc-icon-button" aria-label={`${product.name} ${panel === 'cart' ? '장바구니에서 삭제' : '찜 해제'}`} onClick={() => removeDialogItem(product.id)}><Icon name="close" size={16} /></button>}</div>)}</div>
        {panel === 'cart' && cart.length > 0 && <div className="sc-cart-total"><span>새로 담은 상품 합계</span><strong>{money(cart.reduce((sum, product) => sum + product.price, 0))}원</strong><small>선택한 예산은 상품 1개 기준이며, 합계에는 적용되지 않아요.</small></div>}
      </>}
    </Dialog>}
  </main>;
}
