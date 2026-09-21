'use client';

import { useEffect, useRef, useState } from 'react';
import type { CartLine, DemoFood, FoodProduct, FoodProfileId, FoodRecipe } from '../../src/types/food';
import { addToCart, buildIngredientRows, cartTotal, normalizeCart, recommendRecipes, recommendationReason } from '../../src/lib/food';
import styles from './food.module.css';

type Intent = 'all' | 'quick' | 'hearty' | 'new';
type View = 'kitchen' | 'ingredients' | 'saved' | 'cart' | 'repurchase';
type Context = {
  cart: CartLine[];
  savedIds: string[];
  selectedProductId: string | null;
  recipeId: string;
  servings: number;
  intent: Intent;
  tab: 'purchases' | 'cart';
};
type Session = { profileId: FoodProfileId; contexts: Record<FoodProfileId, Context> };
const STORAGE_KEY = 'gscene-food-v1';
const money = (value: number) => `${value.toLocaleString('ko-KR')}원`;
const intents: { id: Intent; label: string }[] = [
  { id: 'all', label: '오늘의 추천' }, { id: 'quick', label: '간단하게' },
  { id: 'hearty', label: '든든하게' }, { id: 'new', label: '새로운 메뉴' },
];
const views = new Set<View>(['kitchen', 'ingredients', 'saved', 'cart', 'repurchase']);
const currentView = (): View => {
  const hash = window.location.hash.slice(1).split('/')[0] as View;
  return views.has(hash) ? hash : 'kitchen';
};

function newContext(data: DemoFood, profileId: FoodProfileId): Context {
  const profile = data.profiles.find(item => item.id === profileId)!;
  const cart = profile.cart.map(item => ({ ...item }));
  return {
    cart, savedIds: [], selectedProductId: null,
    recipeId: recommendRecipes(data, profileId, cart, null, 'all', [])[0]?.id ?? data.recipes[0].id,
    servings: 1, intent: 'all', tab: profile.purchases.length ? 'purchases' : cart.length ? 'cart' : 'purchases',
  };
}

function restoreSession(data: DemoFood): Session {
  const contexts = Object.fromEntries(data.profiles.map(profile => [profile.id, newContext(data, profile.id)])) as Session['contexts'];
  const initial: Session = { profileId: 'home', contexts };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved?.version !== 1 || !saved.contexts || typeof saved.contexts !== 'object') return initial;
    for (const profile of data.profiles) {
      const value = saved.contexts[profile.id];
      if (!value || typeof value !== 'object') continue;
      const context = contexts[profile.id];
      context.cart = normalizeCart(data, value.cart);
      context.savedIds = Array.isArray(value.savedIds) ? [...new Set<string>(value.savedIds.filter((id: unknown) => data.recipes.some(recipe => recipe.id === id)))] : [];
      context.selectedProductId = data.products.some(product => product.id === value.selectedProductId) ? value.selectedProductId : null;
      context.recipeId = data.recipes.some(recipe => recipe.id === value.recipeId) ? value.recipeId : context.recipeId;
      context.servings = Number.isInteger(value.servings) && value.servings >= 1 && value.servings <= 4 ? value.servings : 1;
      context.intent = intents.some(intent => intent.id === value.intent) ? value.intent : 'all';
      context.tab = value.tab === 'cart' ? 'cart' : 'purchases';
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
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [storageNotice, setStorageNotice] = useState(false);
  const [undo, setUndo] = useState<{ recipeId: string; savedIds: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const adding = useRef(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [swipeHint, setSwipeHint] = useState('');
  const titleRef = useRef<HTMLHeadingElement>(null);
  const recipeStepsRef = useRef<HTMLDetailsElement>(null);
  const activeRecipeId = session?.contexts[session.profileId].recipeId;

  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 10000);
    setLoadError(false);
    fetch('/api/demo/food', { signal: abort.signal, cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('Food unavailable'); return response.json(); })
      .then((result: DemoFood) => {
        if (disposed) return;
        if (!Array.isArray(result.products) || !result.recipes?.length || !result.profiles?.some(profile => profile.id === 'home')) throw new Error('Invalid food data');
        const restored = restoreSession(result);
        const linkedRecipe = window.location.hash.split('/')[1];
        if (result.recipes.some(item => item.id === linkedRecipe)) restored.contexts[restored.profileId].recipeId = linkedRecipe;
        setData(result); setSession(restored); setView(currentView());
        const recipe = result.recipes.find(item => item.id === restored.contexts[restored.profileId].recipeId)!;
        setExcludedIds(recipe.ingredients.filter(item => item.optional).map(item => item.productId));
      })
      .catch(() => { if (!disposed) setLoadError(true); })
      .finally(() => clearTimeout(timer));
    let disposed = false;
    return () => { disposed = true; abort.abort(); clearTimeout(timer); };
  }, [attempt]);

  useEffect(() => {
    const onHash = () => {
      setView(currentView()); setMessage('');
      const linkedRecipe = window.location.hash.split('/')[1];
      if (data?.recipes.some(item => item.id === linkedRecipe)) {
        setSession(previous => previous ? { ...previous, contexts: { ...previous.contexts, [previous.profileId]: { ...previous.contexts[previous.profileId], recipeId: linkedRecipe } } } : previous);
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [data]);

  useEffect(() => {
    if (view !== 'ingredients' || !data) return;
    const activeRecipe = data.recipes.find(item => item.id === activeRecipeId);
    setOwnedIds([]); setQuantityOverrides({});
    setExcludedIds(activeRecipe?.ingredients.filter(item => item.optional).map(item => item.productId) ?? []);
  }, [view, data, activeRecipeId]);

  useEffect(() => {
    if (!session) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...session })); }
    catch { setStorageNotice(true); }
  }, [session]);

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
      <Icon name="leaf" /><h1>{loadError ? '주방을 불러오지 못했어요' : '오늘의 한 끼를 준비하고 있어요'}</h1>
      <p>{loadError ? '연결을 확인한 뒤 다시 시도해 주세요.' : '식품과 메뉴를 함께 살펴보는 중이에요.'}</p>
      {loadError && <button className={styles.primary} onClick={() => setAttempt(value => value + 1)}>다시 불러오기</button>}
    </div>
  </main>;

  const context = session.contexts[session.profileId];
  const profile = data.profiles.find(item => item.id === session.profileId)!;
  const recipe = data.recipes.find(item => item.id === context.recipeId) ?? data.recipes[0];
  const productById = (id: string) => data.products.find(item => item.id === id)!;
  const selected = context.selectedProductId ? productById(context.selectedProductId) : null;
  const candidates = recommendRecipes(data, session.profileId, context.cart, context.selectedProductId, context.intent, context.savedIds);
  const shownRecipe = candidates.find(item => item.id === context.recipeId) ?? candidates[0];
  const cartCount = context.cart.reduce((sum, line) => sum + line.quantity, 0);
  const saved = context.savedIds.includes(recipe.id);
  const rows = buildIngredientRows(data, recipe.id, context.servings, ownedIds, context.cart, excludedIds, quantityOverrides);
  const additions = rows.filter(row => row.selected && !row.owned && row.additionalQuantity > 0 && row.product.available).map(row => ({ productId: row.product.id, quantity: row.additionalQuantity }));
  const additionalCount = additions.reduce((sum, line) => sum + line.quantity, 0);
  const additionalTotal = cartTotal(data, additions);
  const purchasedProducts = profile.purchases.map(item => productById(item.productId)).filter(Boolean);
  const shelfProducts = context.tab === 'purchases' ? purchasedProducts : context.cart.map(item => productById(item.productId));
  const allOwned = rows.filter(row => !row.optional).every(row => row.owned);
  const fulfilledByCart = rows.filter(row => !row.optional).every(row => row.owned || row.inCart >= row.requiredPacks);

  function patch(update: Partial<Context>) {
    setSession(previous => previous ? { ...previous, contexts: { ...previous.contexts, [previous.profileId]: { ...previous.contexts[previous.profileId], ...update } } } : previous);
  }
  function navigate(next: View, recipeId = context.recipeId) {
    setView(next); setMessage(''); setSwipeHint('');
    window.location.hash = next === 'kitchen' ? '' : next === 'ingredients' ? `ingredients/${recipeId}` : next;
  }
  function chooseProduct(product: FoodProduct | null) {
    const nextRecipes = recommendRecipes(data!, session!.profileId, context.cart, product?.id ?? null, context.intent, context.savedIds);
    patch({ selectedProductId: product?.id ?? null, recipeId: nextRecipes[0]?.id ?? context.recipeId });
    setUndo(null); setMessage(product ? `${product.shortName}과 연결된 메뉴를 살펴보세요.` : '오늘의 추천으로 돌아왔어요.');
  }
  function changeIntent(intent: Intent) {
    const nextRecipes = recommendRecipes(data!, session!.profileId, context.cart, context.selectedProductId, intent, context.savedIds);
    patch({ intent, recipeId: nextRecipes[0]?.id ?? context.recipeId }); setUndo(null);
  }
  function nextRecipe() {
    if (candidates.length < 2 || !shownRecipe) return;
    const next = candidates[(candidates.findIndex(item => item.id === shownRecipe.id) + 1) % candidates.length];
    setUndo({ recipeId: shownRecipe.id, savedIds: [...context.savedIds] });
    patch({ recipeId: next.id }); setMessage(`${next.name} 메뉴를 보여드려요.`);
  }
  function toggleSaved(item: FoodRecipe) {
    setUndo({ recipeId: context.recipeId, savedIds: [...context.savedIds] });
    const exists = context.savedIds.includes(item.id);
    patch({ savedIds: exists ? context.savedIds.filter(id => id !== item.id) : [...context.savedIds, item.id] });
    setMessage(exists ? '관심 메뉴에서 해제했어요.' : '관심 메뉴에 저장했어요. 상품은 담기지 않아요.');
  }
  function openIngredients(item: FoodRecipe) {
    patch({ recipeId: item.id }); setOwnedIds([]); setQuantityOverrides({});
    setExcludedIds(item.ingredients.filter(ingredient => ingredient.optional).map(ingredient => ingredient.productId));
    navigate('ingredients', item.id);
  }
  function changeProfile(profileId: FoodProfileId) {
    setSession({ ...session!, profileId }); setOwnedIds([]); setQuantityOverrides({}); setUndo(null); setExpanded(false);
    const nextRecipe = data!.recipes.find(item => item.id === session!.contexts[profileId].recipeId)!;
    setExcludedIds(nextRecipe.ingredients.filter(item => item.optional).map(item => item.productId));
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
    patch({ selectedProductId: product.id }); navigate('repurchase');
  }
  function updateCart(productId: string, quantity: number) {
    patch({ cart: normalizeCart(data!, context.cart.map(line => line.productId === productId ? { ...line, quantity } : line).filter(line => line.quantity > 0)) });
  }
  function revealSteps() {
    if (recipeStepsRef.current) { recipeStepsRef.current.open = true; recipeStepsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }

  return <main className={styles.app} data-food-view={view}>
    <header className={styles.header}>
      {view === 'kitchen' ? <a className={styles.iconButton} href="/" aria-label="내 방으로 돌아가기"><Icon name="back" /></a> : <button className={styles.iconButton} onClick={() => navigate('kitchen')} aria-label="내 주방으로 돌아가기"><Icon name="back" /></button>}
      <a className={styles.brand} href="/">G:Scene<span>내 주방</span></a>
      <div className={styles.headerActions}>
        <button className={styles.iconButton} onClick={() => navigate('saved')} aria-label={`저장한 메뉴 ${context.savedIds.length}개`} aria-current={view === 'saved' ? 'page' : undefined}><Icon name="heart" />{context.savedIds.length > 0 && <span className={styles.badge}>{context.savedIds.length}</span>}</button>
        <button className={styles.iconButton} onClick={() => navigate('cart')} aria-label={`장바구니 ${cartCount}개`} aria-current={view === 'cart' ? 'page' : undefined}><Icon name="bag" />{cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}</button>
      </div>
    </header>

    {view === 'kitchen' && <>
      <section className={styles.intro}>
        <span className={styles.eyebrow}>A LITTLE KITCHEN, ALL YOURS</span>
        <h1 ref={titleRef} tabIndex={-1}>{session.profileId === 'home' ? `${data.user.name}의 주방` : '오늘의 작은 주방'}<span>.</span></h1>
        <p>내가 고른 식품에서 시작하는 맛있는 한 끼</p>
      </section>
      <section className={styles.shelfSection} aria-label="나의 식품 선반">
        <div className={styles.tabs} role="group" aria-label="선반에 표시할 식품">
          <button aria-pressed={context.tab === 'purchases'} onClick={() => { patch({ tab: 'purchases' }); setExpanded(false); }}>구매한 식품 <span>{profile.purchases.length}</span></button>
          <button aria-pressed={context.tab === 'cart'} onClick={() => { patch({ tab: 'cart' }); setExpanded(false); }}>장바구니 <span>{cartCount}</span></button>
        </div>
        {shelfProducts.length ? <>
          <div className={styles.shelf}>
            {(expanded ? shelfProducts : shelfProducts.slice(0, 4)).map(product => <button key={product.id} className={styles.shelfItem} aria-pressed={selected?.id === product.id} onClick={() => chooseProduct(selected?.id === product.id ? null : product)}>
              <ProductImage product={product} /><span>{product.shortName}</span>
            </button>)}
          </div>
          <div className={styles.shelfFoot}><span>{context.tab === 'purchases' ? '전에 구매했어요 · 보유 여부는 재료 단계에서 확인' : '담아둔 식품이에요 · 아직 구매 전이에요'}</span>{shelfProducts.length > 4 && <button onClick={() => setExpanded(value => !value)}>{expanded ? '접기' : '전체 보기'}</button>}</div>
        </> : <div className={styles.emptyShelf}><Icon name="leaf" /><p>{context.tab === 'purchases' ? '아직 구매한 식품이 없어요.' : '아직 담아둔 식품이 없어요.'}<span>마음에 드는 메뉴부터 골라보세요.</span></p></div>}
      </section>
      {selected && <div className={styles.selection}><div><strong>{selected.shortName}으로 살펴보는 중</strong><small>{profile.purchases.find(item => item.productId === selected.id)?.purchasedAt ?? '장바구니에서 선택'} · {selected.optionLabel}</small></div><button onClick={() => chooseProduct(null)}>선택 해제</button></div>}
      <section className={styles.menuSection} aria-label="식사 제안">
        <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>ON YOUR TABLE</span><h2>{selected ? '이 식품으로 만드는 한 끼' : '오늘은 뭘 먹을까요?'}</h2></div><span className={styles.menuIndex}>{candidates.length ? `${Math.max(0, candidates.findIndex(item => item.id === shownRecipe?.id)) + 1} / ${candidates.length}` : ''}</span></div>
        <div className={styles.filters} role="group" aria-label="메뉴 조건">{intents.map(intent => <button key={intent.id} aria-pressed={context.intent === intent.id} onClick={() => changeIntent(intent.id)}>{intent.label}</button>)}</div>
        {shownRecipe ? <>
          <article className={styles.mealCard}
            onPointerDown={event => { if (!event.isPrimary || event.button !== 0) return; touch.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }}
            onPointerMove={event => { if (!touch.current) return; const dx = event.clientX - touch.current.x; const dy = event.clientY - touch.current.y; setSwipeHint(Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.5 ? dx > 0 ? context.savedIds.includes(shownRecipe.id) ? '이미 저장한 메뉴예요' : '관심 메뉴에 저장' : '다른 메뉴 보기' : ''); }}
            onPointerCancel={() => { touch.current = null; setSwipeHint(''); }}
            onPointerUp={event => { if (!touch.current) return; const dx = event.clientX - touch.current.x; const dy = event.clientY - touch.current.y; if (Math.abs(dx) >= 80 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) nextRecipe(); else if (!context.savedIds.includes(shownRecipe.id)) toggleSaved(shownRecipe); } touch.current = null; setSwipeHint(''); }}>
            <div className={styles.mealImage}><img src={shownRecipe.imageUrl} alt={`${shownRecipe.name} 메뉴 일러스트`} width="800" height="520" draggable={false} />{swipeHint && <span className={styles.swipeHint}>{swipeHint}</span>}<span className={styles.timeLabel}>{shownRecipe.minutes}분이면 완성</span></div>
            <div className={styles.mealCopy}><h3>{shownRecipe.name}</h3><p>{shownRecipe.description}</p><div className={styles.reason}><Icon name="leaf" /><span>{recommendationReason(data, shownRecipe, session.profileId, context.cart, context.selectedProductId, context.intent, context.savedIds)}</span></div></div>
          </article>
          <div className={styles.menuActions}>
            <button className={styles.secondary} onClick={nextRecipe} disabled={candidates.length < 2}><Icon name="undo" /> 다른 메뉴</button>
            <button className={styles.secondary} aria-pressed={context.savedIds.includes(shownRecipe.id)} onClick={() => toggleSaved(shownRecipe)}><Icon name="heart" />{context.savedIds.includes(shownRecipe.id) ? '저장했어요' : '관심 저장'}</button>
          </div>
          <button className={styles.primary} onClick={() => openIngredients(shownRecipe)}>필요한 재료 보기 <Icon name="arrow" /></button>
          <div className={styles.underCard}><span>옆으로 넘겨 탐색하거나 저장할 수 있어요</span>{undo && <button onClick={() => { patch(undo); setUndo(null); setMessage('이전 메뉴와 저장 상태로 되돌렸어요.'); }}>되돌리기</button>}</div>
        </> : <div className={styles.emptyState}><Icon name="leaf" /><h3>{selected ? '이 조건에 맞는 메뉴를 준비 중이에요' : '이 조건의 메뉴가 아직 없어요'}</h3><p>{selected ? '다른 식품을 고르거나 오늘의 추천을 만나보세요.' : '오늘의 추천에서 다른 한 끼를 골라보세요.'}</p><button className={styles.secondary} onClick={() => { patch({ selectedProductId: null, intent: 'all' }); }}>전체 메뉴 보기</button></div>}
      </section>
      {purchasedProducts.length > 0 && <section className={styles.rebuySection}><div className={styles.sectionHeading}><h2>다시 찾는 식품</h2><span>지난 구매를 참고했어요</span></div>{(selected && profile.purchases.some(item => item.productId === selected.id) ? [selected] : purchasedProducts.slice(0, 2)).map(product => <div key={product.id} className={styles.rebuyRow}><ProductImage product={product} /><div><strong>{product.name}</strong><span>{product.optionLabel} · {money(product.price)}</span><small>{profile.purchases.find(item => item.productId === product.id)?.purchasedAt} 구매</small></div><button onClick={() => repurchase(product)}>옵션 보기</button></div>)}</section>}
    </>}

    {view === 'ingredients' && <>
      <div className={styles.pageTitle}><span className={styles.eyebrow}>MAKE IT YOURS</span><h1 ref={titleRef} tabIndex={-1}>필요한 재료 확인</h1><p>집에 있는 재료는 빼고, 필요한 만큼만 담아요.</p></div>
      <section className={styles.recipeSummary}><img src={recipe.imageUrl} alt="" width="100" height="80" /><div><h2>{recipe.name}</h2><span>{recipe.minutes}분 · {recipe.ingredients.filter(item => !item.optional).length}가지 기본 재료</span><button className={styles.textButton} onClick={() => toggleSaved(recipe)}>{saved ? '♥ 저장한 메뉴' : '♡ 관심 저장'}</button></div></section>
      <div className={styles.servings}><strong>몇 인분을 만들까요?</strong><div role="group" aria-label="인분 선택">{[1, 2, 3, 4].map(number => <button key={number} aria-pressed={context.servings === number} onClick={() => { patch({ servings: number }); setQuantityOverrides({}); setOwnedIds([]); setMessage('인분이 바뀌었어요. 필요한 양을 가지고 있는지 다시 확인해 주세요.'); }}>{number}인</button>)}</div></div>
      <section className={styles.ingredients}><h2>먼저, 집에 있는 재료</h2><p className={styles.sectionNote}>이번 요리에 쓸 만큼 있다면 ‘집에 있어요’를 눌러주세요.</p>{rows.map(row => <div className={styles.ingredientRow} key={row.product.id}><ProductImage product={row.product} /><div><strong>{row.product.shortName}{row.optional && <span className={styles.optional}>선택 재료</span>}</strong><span>필요량 {row.requiredAmount}{row.product.unit}</span>{profile.purchases.some(item => item.productId === row.product.id) && <small>{profile.purchases.find(item => item.productId === row.product.id)?.purchasedAt} 구매 기록</small>}</div><button className={styles.ownedButton} aria-label={`${row.product.shortName} ${row.owned ? '집에 있어요' : '보유 확인'}`} aria-pressed={row.owned} onClick={() => { setOwnedIds(previous => previous.includes(row.product.id) ? previous.filter(id => id !== row.product.id) : [...previous, row.product.id]); setMessage('보유 확인에 맞춰 추가할 상품을 다시 계산했어요.'); }}>{row.owned && <Icon name="check" />}{row.owned ? '집에 있어요' : '보유 확인'}</button></div>)}</section>
      {rows.some(row => row.inCart > 0) && <section className={styles.existingCart}><h2>장바구니에 이미 있어요</h2>{rows.filter(row => row.inCart > 0).map(row => <div key={row.product.id}><span>{row.product.shortName} · {row.product.optionLabel}</span><strong>{row.inCart}개 담김</strong></div>)}<p>이미 담긴 수량을 제외하고 부족한 만큼만 추가해요.</p></section>}
      <section className={styles.ingredients}><h2>이번에 추가할 상품</h2><p className={styles.sectionNote}>판매 포장 단위로 담아요. 선택 재료는 필요할 때 골라주세요.</p>{rows.filter(row => !row.owned && row.requiredPacks > row.inCart).map(row => <div className={styles.buyRow} key={row.product.id}>
        <label className={styles.buyChoice}><input type="checkbox" checked={row.selected} disabled={!row.product.available} onChange={event => setExcludedIds(previous => event.target.checked ? previous.filter(id => id !== row.product.id) : [...previous, row.product.id])} /><ProductImage product={row.product} /><span><strong>{row.product.name}</strong><small>{row.product.optionLabel}{row.optional ? ' · 선택 재료' : ''}</small><b>{money(row.product.price)}</b>{!row.product.available && <small>지금은 품절이에요</small>}</span></label>
        <div className={styles.quantityLine}><span>추가 수량</span><div className={styles.stepper}><button aria-label={`${row.product.shortName} 추가 수량 줄이기`} disabled={row.additionalQuantity <= 1} onClick={() => setQuantityOverrides(previous => ({ ...previous, [row.product.id]: row.additionalQuantity - 1 }))}>−</button><output>{row.additionalQuantity}</output><button aria-label={`${row.product.shortName} 추가 수량 늘리기`} disabled={row.additionalQuantity + row.inCart >= 99} onClick={() => setQuantityOverrides(previous => ({ ...previous, [row.product.id]: row.additionalQuantity + 1 }))}>+</button></div></div>
      </div>)}{rows.every(row => row.owned || row.inCart >= row.requiredPacks) && <p className={styles.quietNote}>추가로 살 상품이 없어요. 보유 재료와 장바구니를 확인해 주세요.</p>}</section>
      <details className={styles.recipeSteps} ref={recipeStepsRef}><summary>이 메뉴, 이렇게 만들어요 <span>{recipe.minutes}분</span></summary><ol>{recipe.steps.map(step => <li key={step}>{step}</li>)}</ol></details>
      <div className={styles.checkout}><div><span>새로 담을 상품 <strong>{additionalCount}개</strong></span><strong>{money(additionalTotal)}</strong></div><small>예시 상품금액 · 배송비 별도</small>{additionalCount > 0 ? <button className={styles.primary} disabled={busy} onClick={() => commitAdditions(additions)}>선택한 상품 담기 <Icon name="bag" /></button> : <button className={styles.primary} onClick={allOwned ? revealSteps : () => navigate('cart')} disabled={!allOwned && !fulfilledByCart}>{allOwned ? '조리 순서 보기' : fulfilledByCart ? '장바구니에서 확인' : '추가할 상품을 선택해 주세요'}</button>}</div>
    </>}

    {view === 'saved' && <>
      <div className={styles.pageTitle}><span className={styles.eyebrow}>FOR ANOTHER DAY</span><h1 ref={titleRef} tabIndex={-1}>저장한 메뉴</h1><p>마음이 가는 한 끼를 모아뒀어요.</p></div>
      {context.savedIds.length ? <div className={styles.savedList}>{context.savedIds.map(id => data.recipes.find(item => item.id === id)!).map(item => <article key={item.id}><img src={item.imageUrl} alt={`${item.name} 일러스트`} width="220" height="143" /><div><h2>{item.name}</h2><span>{item.minutes}분</span><button className={styles.secondary} onClick={() => openIngredients(item)}>재료 보기 <Icon name="arrow" /></button><button className={styles.textButton} onClick={() => toggleSaved(item)}>저장 해제</button></div></article>)}</div> : <div className={styles.emptyState}><Icon name="heart" /><h2>다음에 먹고 싶은 메뉴가 있나요?</h2><p>메뉴의 ‘관심 저장’을 눌러 모아보세요.</p><button className={styles.primary} onClick={() => navigate('kitchen')}>메뉴 둘러보기</button></div>}
    </>}

    {view === 'cart' && <>
      <div className={styles.pageTitle}><span className={styles.eyebrow}>READY FOR YOUR TABLE</span><h1 ref={titleRef} tabIndex={-1}>내 장바구니</h1><p>지금 필요한 식품을 모아봤어요.</p></div>
      <div className={styles.demoNote}>체험용 장바구니예요. 실제 주문은 진행되지 않아요.</div>
      {context.cart.length ? <><div className={styles.cartList}>{context.cart.map(line => { const product = productById(line.productId); return <article className={styles.cartRow} key={line.productId}><ProductImage product={product} /><div><h2>{product.name}</h2><p>{product.optionLabel} · {money(product.price)}</p><div className={styles.stepper}><button aria-label={`${product.shortName} 수량 줄이기`} disabled={line.quantity <= 1} onClick={() => updateCart(line.productId, line.quantity - 1)}>−</button><output>{line.quantity}</output><button aria-label={`${product.shortName} 수량 늘리기`} disabled={line.quantity >= 99} onClick={() => updateCart(line.productId, line.quantity + 1)}>+</button></div></div><div className={styles.cartEnd}><button onClick={() => updateCart(line.productId, 0)} aria-label={`${product.shortName} 장바구니에서 삭제`}>삭제</button><strong>{money(line.quantity * product.price)}</strong></div></article>; })}</div><div className={styles.cartTotal}><span>상품금액 합계</span><strong>{money(cartTotal(data, context.cart))}</strong><small>예시 가격 · 배송비 별도</small></div><button className={styles.primary} onClick={() => { patch({ tab: 'cart', selectedProductId: null }); navigate('kitchen'); }}>담은 식품으로 메뉴 더 보기 <Icon name="arrow" /></button></> : <div className={styles.emptyState}><Icon name="bag" /><h2>아직 담아둔 식품이 없어요</h2><p>마음에 드는 메뉴에서 필요한 재료를 골라보세요.</p><button className={styles.primary} onClick={() => navigate('kitchen')}>메뉴 둘러보기</button></div>}
    </>}

    {view === 'repurchase' && <>
      <div className={styles.pageTitle}><span className={styles.eyebrow}>GOOD TO SEE YOU AGAIN</span><h1 ref={titleRef} tabIndex={-1}>다시 찾은 식품</h1><p>지난번 옵션을 참고해 지금 필요한 만큼 골라요.</p></div>
      {selected ? <section className={styles.repurchase}><div className={styles.largeProduct}><ProductImage product={selected} /></div><h2>{selected.name}</h2><p>이전 구매: {profile.purchases.find(item => item.productId === selected.id)?.purchasedAt ?? '이 프로필에 구매 기록 없음'}</p><div className={styles.optionBox}><span>현재 판매 옵션</span><strong>{selected.optionLabel}</strong><b>{money(selected.price)}</b><small>{selected.available ? '데모 판매 가능 · 1개 단위로 담아요' : '현재 품절'}</small></div><p className={styles.sectionNote}>장바구니에 {context.cart.find(line => line.productId === selected.id)?.quantity ?? 0}개 담겨 있어요.</p><button className={styles.primary} disabled={busy || !selected.available || (context.cart.find(line => line.productId === selected.id)?.quantity ?? 0) >= 99} onClick={() => commitAdditions([{ productId: selected.id, quantity: 1 }])}>1개 더 담기 <Icon name="bag" /></button><button className={styles.textButton} onClick={() => navigate('cart')}>장바구니 확인</button></section> : <div className={styles.emptyState}><p>다시 구매할 상품을 먼저 골라주세요.</p><button className={styles.primary} onClick={() => navigate('kitchen')}>내 주방으로</button></div>}
    </>}

    <div className={styles.feedback} role="status" aria-live="polite" aria-atomic="true">{message && <><span>{message}</span>{message.includes('담았어요') && <button onClick={() => navigate('cart')}>장바구니 보기 →</button>}<button onClick={() => setMessage('')} aria-label="안내 닫기">닫기</button></>}</div>
    <footer className={styles.footer}>
      <span>G:Scene · 식품 경험 데모</span><p>상품·가격·메뉴는 예시이며 실제 구매와 연결되지 않아요.</p>
      {storageNotice && <p role="status">이 기기에서 저장할 수 없어 새로고침하면 선택이 사라져요.</p>}
      <details className={styles.demoControls}><summary>다른 사용자 상태로 체험하기</summary><label>시연 상태<select value={session.profileId} onChange={event => changeProfile(event.target.value as FoodProfileId)}>{data.profiles.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><p>시연 상태별 장바구니와 관심 메뉴는 따로 보관해요.</p></details>
    </footer>
  </main>;
}
