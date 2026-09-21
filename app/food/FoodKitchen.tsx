'use client';

import { useEffect, useRef, useState } from 'react';
import type { CartLine, DemoFood, FoodProduct, FoodProfileId, FoodScenario } from '../../src/types/food';
import { addToCart, buildProductRows, cartTotal, normalizeCart, recommendScenarios, recommendationReason } from '../../src/lib/food';
import styles from './food.module.css';

type Intent = 'all' | 'quick' | 'hearty' | 'morning' | 'outdoor' | 'routine';
type View = 'kitchen' | 'products' | 'saved' | 'cart' | 'repurchase';
type Context = {
  cart: CartLine[];
  savedIds: string[];
  selectedProductId: string | null;
  scenarioId: string;
  intent: Intent;
  tab: 'purchases' | 'cart';
};
type Session = { profileId: FoodProfileId; contexts: Record<FoodProfileId, Context> };
const STORAGE_KEY = 'gscene-food-v1';
const sceneLabel = (item: FoodScenario) => ({ meal: '오늘의 한 끼', routine: '일상 챙기기', outing: '외출 준비' }[item.kind]);
const money = (value: number) => `${value.toLocaleString('ko-KR')}원`;
const intents: { id: Intent; label: string }[] = [
  { id: 'all', label: '오늘의 추천' }, { id: 'quick', label: '간단하게' },
  { id: 'hearty', label: '든든한 한 끼' }, { id: 'morning', label: '가벼운 아침' },
  { id: 'outdoor', label: '외출 준비' }, { id: 'routine', label: '일상 챙기기' },
];
const views = new Set<View>(['kitchen', 'products', 'saved', 'cart', 'repurchase']);
const currentView = (): View => {
  const raw = window.location.hash.slice(1).split('/')[0];
  const hash = (raw === 'ingredients' ? 'products' : raw) as View;
  return views.has(hash) ? hash : 'kitchen';
};

function newContext(data: DemoFood, profileId: FoodProfileId): Context {
  const profile = data.profiles.find(item => item.id === profileId)!;
  const cart = profile.cart.map(item => ({ ...item }));
  return {
    cart, savedIds: [], selectedProductId: null,
    scenarioId: recommendScenarios(data, profileId, cart, null, 'all', [])[0]?.id ?? data.scenarios[0].id,
    intent: 'all', tab: profile.purchases.length ? 'purchases' : cart.length ? 'cart' : 'purchases',
  };
}

function restoreSession(data: DemoFood): Session {
  const contexts = Object.fromEntries(data.profiles.map(profile => [profile.id, newContext(data, profile.id)])) as Session['contexts'];
  const initial: Session = { profileId: 'home', contexts };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (![1, 2].includes(saved?.version) || !saved.contexts || typeof saved.contexts !== 'object') return initial;
    for (const profile of data.profiles) {
      const value = saved.contexts[profile.id];
      if (!value || typeof value !== 'object') continue;
      const context = contexts[profile.id];
      context.cart = normalizeCart(data, value.cart);
      context.savedIds = Array.isArray(value.savedIds) ? [...new Set<string>(value.savedIds.filter((id: unknown) => data.scenarios.some(scenario => scenario.id === id)))] : [];
      context.selectedProductId = data.products.some(product => product.id === value.selectedProductId) ? value.selectedProductId : null;
      context.scenarioId = data.scenarios.some(scenario => scenario.id === (value.scenarioId ?? value.recipeId)) ? (value.scenarioId ?? value.recipeId) : context.scenarioId;
      context.intent = intents.some(intent => intent.id === value.intent) ? value.intent : 'all';
      context.tab = value.tab === 'cart' ? 'cart' : 'purchases';
      const visibleIds = context.tab === 'cart' ? context.cart.map(line => line.productId) : profile.purchases.map(purchase => purchase.productId);
      if (context.selectedProductId && !visibleIds.includes(context.selectedProductId)) context.selectedProductId = null;
    }
    initial.profileId = data.profiles.some(profile => profile.id === saved.profileId) ? saved.profileId : 'home';
  } catch { /* Missing or unavailable browser storage starts a fresh local demo. */ }
  return initial;
}

function Icon({ name }: { name: 'back' | 'heart' | 'bag' | 'arrow' | 'undo' | 'check' | 'leaf' }) {
  const paths = {
    back: <path d="m14 6-6 6 6 6" />,
    heart: <path d="M20.4 5.7a5 5 0 0 0-7.1 0L12 7l-1.3-1.3a5 5 0 0 0-7.1 7.1L12 21l8.4-8.2a5 5 0 0 0 0-7.1Z" />,
    bag: <><path d="M5 8h14l1 13H4L5 8Z" /><path d="M8 8V6a4 4 0 0 1 8 0v2" /></>,
    arrow: <><path d="M4 12h16M14 6l6 6-6 6" /></>,
    undo: <><path d="M4 10h9a6 6 0 1 1 0 12" transform="translate(0 -3)" /><path d="m8 3-4 4 4 4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    leaf: <><path d="M20 3C8 2 2 7 5 15s15 5 15-12Z" /><path d="M3 21 15 9" /></>,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function ProductImage({ product }: { product: FoodProduct }) {
  return <img src={product.imageUrl} alt="" width="68" height="78" />;
}

export default function FoodKitchen() {
  const [data, setData] = useState<DemoFood | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState<View>('kitchen');
  const [ownedIds, setOwnedIds] = useState<string[]>([]);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [quantityOverrides, setQuantityOverrides] = useState<Record<string, number>>({});
  const [collectionOpen, setCollectionOpen] = useState(false);
  const collectionRef = useRef<HTMLDialogElement>(null);
  const collectionTriggerRef = useRef<HTMLButtonElement>(null);
  const [message, setMessage] = useState('');
  const [storageNotice, setStorageNotice] = useState(false);
  const [undo, setUndo] = useState<{ scenarioId: string; savedIds: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const adding = useRef(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [swipeHint, setSwipeHint] = useState('');
  const titleRef = useRef<HTMLHeadingElement>(null);
  const scenarioStepsRef = useRef<HTMLDetailsElement>(null);
  const activeScenarioId = session?.contexts[session.profileId].scenarioId;

  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 10000);
    setLoadError(false);
    fetch('/api/demo/food', { signal: abort.signal, cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('Food unavailable'); return response.json(); })
      .then((result: DemoFood) => {
        if (disposed) return;
        if (!Array.isArray(result.products) || !result.scenarios?.length || !result.profiles?.some(profile => profile.id === 'home')) throw new Error('Invalid food data');
        const restored = restoreSession(result);
        const linkedScenario = window.location.hash.split('/')[1];
        if (result.scenarios.some(item => item.id === linkedScenario)) restored.contexts[restored.profileId].scenarioId = linkedScenario;
        setData(result); setSession(restored); setView(currentView());
        const scenario = result.scenarios.find(item => item.id === restored.contexts[restored.profileId].scenarioId)!;
        setExcludedIds(scenario.products.filter(item => item.optional).map(item => item.productId));
      })
      .catch(() => { if (!disposed) setLoadError(true); })
      .finally(() => clearTimeout(timer));
    let disposed = false;
    return () => { disposed = true; abort.abort(); clearTimeout(timer); };
  }, [attempt]);

  useEffect(() => {
    const onHash = () => {
      setView(currentView()); setMessage('');
      const linkedScenario = window.location.hash.split('/')[1];
      if (data?.scenarios.some(item => item.id === linkedScenario)) {
        setSession(previous => previous ? { ...previous, contexts: { ...previous.contexts, [previous.profileId]: { ...previous.contexts[previous.profileId], scenarioId: linkedScenario } } } : previous);
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [data]);

  useEffect(() => {
    if (view !== 'products' || !data) return;
    const activeScenario = data.scenarios.find(item => item.id === activeScenarioId);
    setOwnedIds([]); setQuantityOverrides({});
    setExcludedIds(activeScenario?.products.filter(item => item.optional).map(item => item.productId) ?? []);
  }, [view, data, activeScenarioId]);

  useEffect(() => {
    if (!session) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, ...session })); }
    catch { setStorageNotice(true); }
  }, [session]);

  useEffect(() => {
    const dialog = collectionRef.current;
    if (!collectionOpen || !dialog) return;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close(); document.body.style.overflow = overflow;
      collectionTriggerRef.current?.focus({ preventScroll: true });
    };
  }, [collectionOpen]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 4500);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (data) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      titleRef.current?.focus({ preventScroll: true });
    }
  }, [view, data]);

  if (!data || !session) return <main className={styles.app}>
    <a className={styles.homeLink} href="/"><Icon name="back" /> 내 방으로</a>
    <div className={styles.loading} role={loadError ? 'alert' : 'status'}>
      <Icon name="leaf" /><h1>{loadError ? '주방을 불러오지 못했어요' : '오늘의 주방을 준비하고 있어요'}</h1>
      <p>{loadError ? '연결을 확인한 뒤 다시 시도해 주세요.' : '식품과 어울리는 장면을 찾고 있어요.'}</p>
      {loadError && <button className={styles.primary} onClick={() => setAttempt(value => value + 1)}>다시 불러오기</button>}
    </div>
  </main>;

  const context = session.contexts[session.profileId];
  const profile = data.profiles.find(item => item.id === session.profileId)!;
  const scenario = data.scenarios.find(item => item.id === context.scenarioId) ?? data.scenarios[0];
  const productById = (id: string) => data.products.find(item => item.id === id)!;
  const selected = context.selectedProductId ? productById(context.selectedProductId) : null;
  const candidates = recommendScenarios(data, session.profileId, context.cart, context.selectedProductId, context.intent, context.savedIds);
  const shownScenario = candidates.find(item => item.id === context.scenarioId) ?? candidates[0];
  const cartCount = context.cart.reduce((sum, line) => sum + line.quantity, 0);
  const saved = context.savedIds.includes(scenario.id);
  const rows = buildProductRows(data, scenario.id, ownedIds, context.cart, excludedIds, quantityOverrides);
  const additions = rows.filter(row => row.selected && !row.owned && row.additionalQuantity > 0).map(row => ({ productId: row.product.id, quantity: row.additionalQuantity }));
  const additionalCount = additions.reduce((sum, line) => sum + line.quantity, 0);
  const additionalTotal = cartTotal(data, additions);
  const purchasedProducts = profile.purchases.map(item => productById(item.productId)).filter(Boolean);
  const shelfProducts = context.tab === 'purchases' ? purchasedProducts : context.cart.map(item => productById(item.productId));
  const allOwned = rows.filter(row => !row.optional).every(row => row.owned);
  const representedInCart = rows.filter(row => !row.optional).every(row => row.owned || row.inCart > 0);

  function patch(update: Partial<Context>) {
    setSession(previous => previous ? { ...previous, contexts: { ...previous.contexts, [previous.profileId]: { ...previous.contexts[previous.profileId], ...update } } } : previous);
  }
  function navigate(next: View, scenarioId = context.scenarioId) {
    setView(next); setMessage(''); setSwipeHint('');
    window.location.hash = next === 'kitchen' ? '' : next === 'products' ? `products/${scenarioId}` : next;
  }
  function chooseProduct(product: FoodProduct | null) {
    const nextScenarios = recommendScenarios(data!, session!.profileId, context.cart, product?.id ?? null, 'all', context.savedIds);
    patch({ intent: 'all', selectedProductId: product?.id ?? null, scenarioId: nextScenarios[0]?.id ?? context.scenarioId });
    setCollectionOpen(false); setUndo(null); setMessage(product ? `${product.shortName}에 맞는 장면을 살펴보세요.` : '오늘의 추천으로 돌아왔어요.');
  }
  function changeIntent(intent: Intent) {
    const nextScenarios = recommendScenarios(data!, session!.profileId, context.cart, context.selectedProductId, intent, context.savedIds);
    patch({ intent, scenarioId: nextScenarios[0]?.id ?? context.scenarioId }); setUndo(null);
  }
  function nextScenario() {
    if (candidates.length < 2 || !shownScenario) return;
    const next = candidates[(candidates.findIndex(item => item.id === shownScenario.id) + 1) % candidates.length];
    setUndo({ scenarioId: shownScenario.id, savedIds: [...context.savedIds] });
    patch({ scenarioId: next.id }); setMessage(`${next.name} 장면을 보여드려요.`);
  }
  function toggleSaved(item: FoodScenario) {
    setUndo({ scenarioId: context.scenarioId, savedIds: [...context.savedIds] });
    const exists = context.savedIds.includes(item.id);
    patch({ savedIds: exists ? context.savedIds.filter(id => id !== item.id) : [...context.savedIds, item.id] });
    setMessage(exists ? '저장한 장면에서 해제했어요.' : '관심 장면을 저장했어요. 상품은 담기지 않아요.');
  }
  function openProducts(item: FoodScenario) {
    patch({ scenarioId: item.id }); setOwnedIds([]); setQuantityOverrides({});
    setExcludedIds(item.products.filter(ingredient => ingredient.optional).map(ingredient => ingredient.productId));
    navigate('products', item.id);
  }
  function changeProfile(profileId: FoodProfileId) {
    setSession({ ...session!, profileId }); setOwnedIds([]); setQuantityOverrides({}); setUndo(null); setCollectionOpen(false);
    const nextScenario = data!.scenarios.find(item => item.id === session!.contexts[profileId].scenarioId)!;
    setExcludedIds(nextScenario.products.filter(item => item.optional).map(item => item.productId));
    navigate('kitchen');
  }
  function commitAdditions(lines: CartLine[]) {
    if (adding.current || !lines.length) return;
    adding.current = true; setBusy(true);
    try {
      const nextCart = addToCart(context.cart, lines);
      patch({ cart: nextCart }); setQuantityOverrides({});
      setMessage(`데모 장바구니에 상품 ${lines.reduce((sum, item) => sum + item.quantity, 0)}개를 담았어요.`);
    } catch {
      setMessage('상품을 담지 못했어요. 수량을 확인하고 다시 시도해 주세요.');
    } finally {
      setBusy(false);
      // Lock through the next paint so a rapid double tap cannot submit stale rows.
      requestAnimationFrame(() => { adding.current = false; });
    }
  }
  function repurchase(product: FoodProduct) {
    const next = recommendScenarios(data!, session!.profileId, context.cart, product.id, 'all', context.savedIds)[0];
    patch({ tab: 'purchases', selectedProductId: product.id, intent: 'all', scenarioId: next?.id ?? context.scenarioId });
    navigate('repurchase');
  }
  function browseCartScenarios() {
    const next = recommendScenarios(data!, session!.profileId, context.cart, null, 'all', context.savedIds)[0];
    patch({ tab: 'cart', selectedProductId: null, intent: 'all', scenarioId: next?.id ?? context.scenarioId });
    setUndo(null); navigate('kitchen');
  }
  function updateCart(productId: string, quantity: number) {
    const cart = normalizeCart(data!, context.cart.map(line => line.productId === productId ? { ...line, quantity } : line).filter(line => line.quantity > 0));
    const clearSelection = quantity === 0 && context.tab === 'cart' && context.selectedProductId === productId;
    patch({ cart, ...(clearSelection ? { selectedProductId: null } : {}) });
  }
  function revealSteps() {
    if (scenarioStepsRef.current) { scenarioStepsRef.current.open = true; scenarioStepsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }

  return <main className={styles.app} data-food-view={view}>
    <header className={styles.header}>
      {view === 'kitchen' ? <a className={styles.backLink} href="/" aria-label="내 방으로 돌아가기"><Icon name="back" /><span>내 공간</span></a> : <button className={styles.backLink} onClick={() => navigate('kitchen')} aria-label="내 주방으로 돌아가기"><Icon name="back" /><span>내 주방</span></button>}
      <a className={styles.brand} href="/">G:Scene<span>.</span></a>
      <div className={styles.headerActions}>
        <button className={styles.iconButton} onClick={() => navigate('saved')} aria-label={`저장한 장면 ${context.savedIds.length}개`} aria-current={view === 'saved' ? 'page' : undefined}><Icon name="heart" />{context.savedIds.length > 0 && <span className={styles.badge}>{context.savedIds.length}</span>}</button>
        <button className={styles.iconButton} onClick={() => navigate('cart')} aria-label={`장바구니 ${cartCount}개`} aria-current={view === 'cart' ? 'page' : undefined}><Icon name="bag" />{cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}</button>
      </div>
    </header>

    {view === 'kitchen' && <>
      <section className={styles.intro}>
        <div><span className={styles.eyebrow}>MY LITTLE KITCHEN</span>
          <h1 ref={titleRef} tabIndex={-1}>내 주방<span>.</span></h1>
          <p>내가 고른 식품 곁에, 맛있는 일상.</p></div>
        <span className={styles.person}>{data.user.name}의 일상을 채우는 중</span>
      </section>
      <div className={styles.kitchenLayout}>
        <div className={styles.contextColumn}>
          <section className={styles.collection} aria-label="나의 식품 선반">
            <div className={styles.room}>
              <img className={styles.roomArt} src="/food/kitchen-room.svg" alt="냉장고와 나무 조리대, 팬트리가 있는 아늑한 주방" width="800" height="300" />
              <span className={styles.roomLabel}><i />MY LITTLE KITCHEN</span>
              {purchasedProducts.slice(0, 4).map((product, index) => <button key={product.id} className={styles.roomPin} style={{ left: `${[20, 38, 78, 58][index]}%`, top: `${[47, 65, 41, 45][index]}%` }} aria-label={`${product.name} 기준으로 추천받기`} aria-pressed={selected?.id === product.id} onClick={() => { patch({ tab: 'purchases' }); chooseProduct(product); }}><span>{index + 1}</span><span className={styles.pinName}>{product.name}</span></button>)}
              <span className={styles.roomFootnote}>구매한 식품은 번호로 표시했어요</span>
            </div>
            <div className={styles.inventoryHead}>
              <div className={styles.tabs} role="group" aria-label="추천 기준 상품 목록">
                <button aria-pressed={context.tab === 'purchases'} onClick={() => { patch({ tab: 'purchases' }); chooseProduct(purchasedProducts[0] ?? null); }}>구매한 상품 <span>{purchasedProducts.length}</span></button>
                <button aria-pressed={context.tab === 'cart'} onClick={() => { patch({ tab: 'cart' }); chooseProduct(context.cart[0] ? productById(context.cart[0].productId) : null); }}>장바구니 <span>{context.cart.length}</span></button>
              </div>
              <button ref={collectionTriggerRef} className={styles.collectionMore} onClick={() => setCollectionOpen(true)}>전체 보기 ↗</button>
            </div>
            <div className={styles.inventoryRail}>
              {shelfProducts.map((product, index) => <button key={product.id} className={styles.ownedItem} aria-pressed={selected?.id === product.id} onClick={() => chooseProduct(product)}>
                <span className={styles.ownedPhoto}><ProductImage product={product} />{context.tab === 'purchases' && <span className={styles.itemIndex}>{index + 1}</span>}{selected?.id === product.id && <span className={styles.selectedCheck}><Icon name="check" /></span>}</span><span>{product.name}</span>
              </button>)}
              <button className={`${styles.ownedItem} ${styles.newItem}`} aria-pressed={!selected} onClick={() => chooseProduct(null)}><span className={styles.ownedPhoto}><span>＋</span></span><span>새롭게 둘러보기</span></button>
            </div>
            {!shelfProducts.length && <p className={styles.railEmpty}>{context.tab === 'purchases' ? '구매 기록이 없어도 바로 둘러볼 수 있어요.' : '아직 담아둔 식품이 없어요. 장면부터 골라보세요.'}</p>}
            <div className={styles.anchorCaption}><span>✳</span>{selected ? <p><b>{selected.name}</b>에 어울리는 장면을 찾아요.<small>{context.tab === 'purchases' ? '구매 기록을 참고해요. 현재 보유 여부는 따로 확인해 주세요.' : '장바구니에 담긴 식품이에요. 아직 구매 전이에요.'}</small></p> : <p>가볍게 시작할 수 있는 <b>오늘의 장면</b>을 찾아요.</p>}</div>
          </section>
          {purchasedProducts.length > 0 && <section className={styles.rebuySection}><div className={styles.sectionHeading}><h2>다시 찾는 식품</h2><span>지난 구매를 참고했어요</span></div>{(selected && profile.purchases.some(item => item.productId === selected.id) ? [selected] : purchasedProducts.slice(0, 2)).map(product => <div key={product.id} className={styles.rebuyRow}><ProductImage product={product} /><div><strong>{product.name}</strong><span>{money(product.price)}</span><small>{profile.purchases.find(item => item.productId === product.id)?.purchasedAt} 구매</small></div><button onClick={() => repurchase(product)}>상품 보기</button></div>)}</section>}
        </div>
        <section className={styles.menuSection} aria-label="식품 시나리오 추천">
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>A LITTLE FOOD, A NEW SCENE</span><h2>{selected ? '이 식품과 함께하는 일상' : '오늘은 어떤 장면인가요?'}</h2></div><span className={styles.menuIndex}>{candidates.length ? `${Math.max(0, candidates.findIndex(item => item.id === shownScenario?.id)) + 1} / ${candidates.length}` : ''}</span></div>
          <div className={styles.filters} role="group" aria-label="시나리오 조건">{intents.map(intent => <button key={intent.id} aria-pressed={context.intent === intent.id} onClick={() => changeIntent(intent.id)}>{intent.label}</button>)}</div>
          {shownScenario ? <>
            <article className={styles.mealCard}
              onPointerDown={event => { if (!event.isPrimary || event.button !== 0) return; touch.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }}
              onPointerMove={event => { if (!touch.current) return; const dx = event.clientX - touch.current.x; const dy = event.clientY - touch.current.y; setSwipeHint(Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.5 ? dx > 0 ? context.savedIds.includes(shownScenario.id) ? '이미 저장한 장면이에요' : '관심 장면에 저장' : '다른 장면 보기' : ''); }}
              onPointerCancel={() => { touch.current = null; setSwipeHint(''); }}
              onPointerUp={event => { if (!touch.current) return; const dx = event.clientX - touch.current.x; const dy = event.clientY - touch.current.y; if (Math.abs(dx) >= 80 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) nextScenario(); else if (!context.savedIds.includes(shownScenario.id)) toggleSaved(shownScenario); } touch.current = null; setSwipeHint(''); }}>
              <div className={styles.mealImage}><img src={shownScenario.imageUrl} alt={`${shownScenario.name} 일러스트`} width="800" height="520" draggable={false} />{swipeHint && <span className={styles.swipeHint}>{swipeHint}</span>}<span className={styles.timeLabel}>{sceneLabel(shownScenario)}</span></div>
              <div className={styles.mealCopy}><h3>{shownScenario.name}</h3><p>{shownScenario.description}</p><div className={styles.reason}><Icon name="leaf" /><span>{recommendationReason(data, shownScenario, session.profileId, context.cart, context.selectedProductId, context.intent, context.savedIds)}</span></div></div>
            </article>
            <div className={styles.menuActions}>
              <button className={styles.secondary} onClick={nextScenario} disabled={candidates.length < 2}><Icon name="undo" /> 다른 장면</button>
              <button className={styles.secondary} aria-pressed={context.savedIds.includes(shownScenario.id)} onClick={() => toggleSaved(shownScenario)}><Icon name="heart" />{context.savedIds.includes(shownScenario.id) ? '저장했어요' : '관심 저장'}</button>
            </div>
            <button className={styles.primary} onClick={() => openProducts(shownScenario)}>함께할 상품 보기 <Icon name="arrow" /></button>
            <div className={styles.underCard}><span>옆으로 넘겨 탐색하거나 저장할 수 있어요</span>{undo && <button onClick={() => { patch(undo); setUndo(null); setMessage('이전 장면과 저장 상태로 되돌렸어요.'); }}>되돌리기</button>}</div>
          </> : <div className={styles.emptyState}><Icon name="leaf" /><h3>새로운 장면을 준비하고 있어요</h3><p>다른 조건으로 오늘의 추천을 만나보세요.</p><button className={styles.secondary} onClick={() => { patch({ selectedProductId: null, intent: 'all' }); }}>오늘의 추천 보기</button></div>}
        </section>
      </div>
    </>}

    {view === 'products' && <>
      <div className={styles.pageTitle}><span className={styles.eyebrow}>MAKE IT YOURS</span><h1 ref={titleRef} tabIndex={-1}>함께할 상품 확인</h1><p>이미 있거나 필요 없는 식품은 빼고 골라요.</p></div>
      <section className={styles.recipeSummary}><img src={scenario.imageUrl} alt="" width="100" height="80" /><div><h2>{scenario.name}</h2><span>{sceneLabel(scenario)} · 함께 볼 식품 {rows.length}가지</span><button className={styles.textButton} onClick={() => toggleSaved(scenario)}>{saved ? '♥ 저장한 장면' : '♡ 관심 저장'}</button></div></section>
      <section className={styles.ingredients}><h2>이미 집에 있는 식품</h2><p className={styles.sectionNote}>이번에 구매하지 않을 식품만 표시해 주세요. 구매 기록으로 보유 여부를 정하지 않아요.</p>{rows.map(row => <div className={styles.ingredientRow} key={row.product.id}><ProductImage product={row.product} /><div><strong>{row.product.shortName}{row.optional && <span className={styles.optional}>선택 상품</span>}</strong>{profile.purchases.some(item => item.productId === row.product.id) && <small>{profile.purchases.find(item => item.productId === row.product.id)?.purchasedAt} 구매 기록</small>}</div><button className={styles.ownedButton} aria-label={`${row.product.shortName} ${row.owned ? '구매 제외됨' : '집에 있어요'}`} aria-pressed={row.owned} onClick={() => { setOwnedIds(previous => previous.includes(row.product.id) ? previous.filter(id => id !== row.product.id) : [...previous, row.product.id]); }}>{row.owned && <Icon name="check" />}{row.owned ? '구매 제외' : '집에 있어요'}</button></div>)}</section>
      {rows.some(row => row.inCart > 0) && <section className={styles.existingCart}><h2>장바구니에 이미 담긴 식품</h2>{rows.filter(row => row.inCart > 0).map(row => <div key={row.product.id}><span>{row.product.name}</span><strong>{row.inCart}개 담김</strong></div>)}<p>중복으로 선택하지 않아요. 더 담으려면 장바구니에서 수량을 바꿔주세요.</p><button className={styles.textButton} onClick={() => navigate('cart')}>장바구니에서 수량 확인</button></section>}
      <section className={styles.ingredients}><h2>이번에 추가할 상품</h2><p className={styles.sectionNote}>구매할 상품과 수량을 직접 골라주세요.</p>{rows.filter(row => !row.owned && row.inCart === 0).map(row => <div className={styles.buyRow} key={row.product.id}>
        <label className={styles.buyChoice}><input type="checkbox" checked={row.selected} onChange={event => setExcludedIds(previous => event.target.checked ? previous.filter(id => id !== row.product.id) : [...previous, row.product.id])} /><ProductImage product={row.product} /><span><strong>{row.product.name}</strong><small>{row.optional ? '선택 상품' : row.product.cate3_nm || row.product.cate2_nm}</small><b>{money(row.product.price)}</b></span></label>
        <div className={styles.quantityLine}><span>담을 수량</span><div className={styles.stepper}><button aria-label={`${row.product.shortName} 추가 수량 줄이기`} disabled={row.additionalQuantity <= 1} onClick={() => setQuantityOverrides(previous => ({ ...previous, [row.product.id]: row.additionalQuantity - 1 }))}>−</button><output>{row.additionalQuantity}</output><button aria-label={`${row.product.shortName} 추가 수량 늘리기`} disabled={row.additionalQuantity >= 99} onClick={() => setQuantityOverrides(previous => ({ ...previous, [row.product.id]: row.additionalQuantity + 1 }))}>+</button></div></div>
      </div>)}{rows.every(row => row.owned || row.inCart > 0) && <p className={styles.quietNote}>새로 선택할 상품이 없어요. 표시한 식품과 장바구니를 확인해 주세요.</p>}</section>
      <details className={styles.recipeSteps} ref={scenarioStepsRef}><summary>{scenario.kind === 'meal' ? '이 한 끼, 이렇게 만들어요' : '이 장면, 이렇게 준비해요'}</summary><ol>{scenario.steps.map(step => <li key={step}>{step}</li>)}</ol></details>
      <div className={styles.checkout}><div><span>새로 담을 상품 <strong>{additionalCount}개</strong></span><strong>{money(additionalTotal)}</strong></div><small>예시 상품금액 · 배송비 별도</small>{additionalCount > 0 ? <button className={styles.primary} disabled={busy} onClick={() => commitAdditions(additions)}>선택한 상품 담기 <Icon name="bag" /></button> : <button className={styles.primary} onClick={allOwned ? revealSteps : () => navigate('cart')} disabled={!allOwned && !representedInCart}>{allOwned ? '준비 방법 보기' : representedInCart ? '장바구니에서 확인' : '추가할 상품을 선택해 주세요'}</button>}</div>
    </>}

    {view === 'saved' && <>
      <div className={styles.pageTitle}><span className={styles.eyebrow}>FOR ANOTHER DAY</span><h1 ref={titleRef} tabIndex={-1}>저장한 장면</h1><p>다시 만나고 싶은 일상을 모아뒀어요.</p></div>
      {context.savedIds.length ? <div className={styles.savedList}>{context.savedIds.map(id => data.scenarios.find(item => item.id === id)!).map(item => <article key={item.id}><img src={item.imageUrl} alt={`${item.name} 일러스트`} width="220" height="143" /><div><h2>{item.name}</h2><span>{sceneLabel(item)}</span><button className={styles.secondary} onClick={() => openProducts(item)}>상품 보기 <Icon name="arrow" /></button><button className={styles.textButton} onClick={() => toggleSaved(item)}>저장 해제</button></div></article>)}</div> : <div className={styles.emptyState}><Icon name="heart" /><h2>다시 보고 싶은 장면이 있나요?</h2><p>‘관심 저장’을 눌러 모아보세요.</p><button className={styles.primary} onClick={() => navigate('kitchen')}>장면 둘러보기</button></div>}
    </>}

    {view === 'cart' && <>
      <div className={styles.pageTitle}><span className={styles.eyebrow}>READY FOR YOUR DAY</span><h1 ref={titleRef} tabIndex={-1}>내 장바구니</h1><p>지금 필요한 식품을 모아봤어요.</p></div>
      <div className={styles.demoNote}>체험용 장바구니예요. 실제 주문은 진행되지 않아요.</div>
      {context.cart.length ? <><div className={styles.cartList}>{context.cart.map(line => { const product = productById(line.productId); return <article className={styles.cartRow} key={line.productId}><ProductImage product={product} /><div><h2>{product.name}</h2><p>{money(product.price)}</p><div className={styles.stepper}><button aria-label={`${product.shortName} 수량 줄이기`} disabled={line.quantity <= 1} onClick={() => updateCart(line.productId, line.quantity - 1)}>−</button><output>{line.quantity}</output><button aria-label={`${product.shortName} 수량 늘리기`} disabled={line.quantity >= 99} onClick={() => updateCart(line.productId, line.quantity + 1)}>+</button></div></div><div className={styles.cartEnd}><button onClick={() => updateCart(line.productId, 0)} aria-label={`${product.shortName} 장바구니에서 삭제`}>삭제</button><strong>{money(line.quantity * product.price)}</strong></div></article>; })}</div><div className={styles.cartTotal}><span>상품금액 합계</span><strong>{money(cartTotal(data, context.cart))}</strong><small>예시 가격 · 배송비 별도</small></div><button className={styles.primary} onClick={browseCartScenarios}>담은 식품과 어울리는 장면 보기 <Icon name="arrow" /></button></> : <div className={styles.emptyState}><Icon name="bag" /><h2>아직 담아둔 식품이 없어요</h2><p>마음에 드는 장면에서 함께할 식품을 골라보세요.</p><button className={styles.primary} onClick={() => navigate('kitchen')}>장면 둘러보기</button></div>}
    </>}

    {view === 'repurchase' && <>
      <div className={styles.pageTitle}><span className={styles.eyebrow}>GOOD TO SEE YOU AGAIN</span><h1 ref={titleRef} tabIndex={-1}>다시 찾은 식품</h1><p>상품과 가격을 확인하고 다시 담아요.</p></div>
      {selected ? <section className={styles.repurchase}><div className={styles.largeProduct}><ProductImage product={selected} /></div><h2>{selected.name}</h2><p>이전 구매: {profile.purchases.find(item => item.productId === selected.id)?.purchasedAt ?? '이 프로필에 구매 기록 없음'}</p><div className={styles.optionBox}><span>{selected.cate3_nm || selected.cate2_nm}</span><strong>{selected.brd_mn}</strong><b>{money(selected.price)}</b></div><p className={styles.sectionNote}>장바구니에 {context.cart.find(line => line.productId === selected.id)?.quantity ?? 0}개 담겨 있어요.</p><button className={styles.primary} disabled={busy || (context.cart.find(line => line.productId === selected.id)?.quantity ?? 0) >= 99} onClick={() => commitAdditions([{ productId: selected.id, quantity: 1 }])}>1개 더 담기 <Icon name="bag" /></button><button className={styles.textButton} onClick={() => navigate('cart')}>장바구니 확인</button></section> : <div className={styles.emptyState}><p>다시 구매할 상품을 먼저 골라주세요.</p><button className={styles.primary} onClick={() => navigate('kitchen')}>내 주방으로</button></div>}
    </>}

    {collectionOpen && <dialog className={styles.collectionDialog} ref={collectionRef} aria-labelledby="collection-title" onCancel={() => setCollectionOpen(false)} onClick={event => { if (event.target === event.currentTarget) setCollectionOpen(false); }}>
      <div className={styles.dialogInner}><div className={styles.dialogHead}><h2 id="collection-title">{context.tab === 'purchases' ? '구매한 상품' : '장바구니 상품'}</h2><button className={styles.iconButton} aria-label="전체 상품 닫기" onClick={() => setCollectionOpen(false)}>×</button></div><p className={styles.sectionNote}>{context.tab === 'purchases' ? '구매 기록이에요. 현재 보유 상태와는 다를 수 있어요.' : '상품을 선택해 어울리는 장면을 찾아보세요.'}</p>
        {shelfProducts.length ? shelfProducts.map(product => <button key={product.id} className={styles.dialogItem} onClick={() => chooseProduct(product)}><span><ProductImage product={product} /></span><span><strong>{product.name}</strong><small>{money(product.price)}{context.tab === 'cart' && ` · ${context.cart.find(line => line.productId === product.id)?.quantity}개 담김`}</small></span><Icon name="arrow" /></button>) : <div className={styles.emptyState}><p>아직 표시할 식품이 없어요.</p><button className={styles.secondary} onClick={() => chooseProduct(null)}>새롭게 둘러보기</button></div>}
      </div>
    </dialog>}
    <div className={styles.feedback} role="status" aria-live="polite" aria-atomic="true">{message && <><span>{message}</span>{message.includes('담았어요') && <button onClick={() => navigate('cart')}>장바구니 보기 →</button>}<button onClick={() => setMessage('')} aria-label="안내 닫기">닫기</button></>}</div>
    <footer className={styles.footer}>
      <span>G:Scene · 식품 경험 데모</span><p>상품·가격·시나리오는 예시이며 실제 구매와 연결되지 않아요.</p>
      {storageNotice && <p role="status">이 기기에서 저장할 수 없어 새로고침하면 선택이 사라져요.</p>}
      <details className={styles.demoControls}><summary>다른 사용자 상태로 체험하기</summary><label>시연 상태<select value={session.profileId} onChange={event => changeProfile(event.target.value as FoodProfileId)}>{data.profiles.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><p>시연 상태별 장바구니와 저장한 장면은 따로 보관해요.</p></details>
    </footer>
  </main>;
}
