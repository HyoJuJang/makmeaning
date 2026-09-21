'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { CatalogCategory, CartLine, DemoCatalog, DisplayProduct } from '../../types/catalog';
import { addToCart, cartTotal, normalizeCart, restoreCatalogState } from '../../lib/catalog';
import {readDemoState,consumeOwnedFood,updateDemoState, type DemoState} from '../../../app/demo-state.js';
import RoomAvatar from '../scene/RoomAvatar';
import EatingAvatar from './EatingAvatar';
import {EATING_DURATION,REDUCED_EATING_DURATION} from '../../../app/food-action.js';
import CategoryNav from '../navigation/CategoryNav';
import '../scene/scene.css';
import './catalog.css';

const CONFIG = {
  food: { title: '내 주방', english: 'MY KITCHEN', number: '03', label: '식품', room: '/catalog-art/food-room.svg', roomAlt: '냉장고와 조리대, 팬트리가 있는 픽셀 주방', homeX: 57, targets: [22, 42, 77] },
  beauty: { title: '내 화장대', english: 'MY VANITY', number: '04', label: '뷰티', room: '/catalog-art/beauty-room.svg', roomAlt: '거울과 화장품 선반이 있는 픽셀 화장대', homeX: 25, targets: [47, 72] },
} as const;
type Panel = 'owned' | 'cart' | 'saved' | 'product' | null;
type State = { cart: CartLine[]; savedProductIds: string[] };
const money = (value: number) => `${value.toLocaleString('ko-KR')}원`;

function Icon({ name, size = 20 }: { name: 'back' | 'bag' | 'heart' | 'home' | 'arrow' | 'check' | 'close'; size?: number }) {
  const paths = {
    back: <path d="m14 5-7 7 7 7M7 12h14" />,
    bag: <><path d="M5 7h14l1 14H4L5 7Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
    heart: <path d="M20.5 4.8a5.5 5.5 0 0 0-8.5 1 5.5 5.5 0 0 0-8.5-1C-.5 9 5.5 15 12 20c6.5-5 12.5-11 8.5-15.2Z" />,
    home: <path d="m3 10 9-7 9 7v11h-7v-7h-4v7H3V10Z" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function ProductVisual({ product }: { product: DisplayProduct }) {
  return <img className="sc-product-visual" src={product.imageUrl} alt="" loading="lazy" />;
}
function CatalogDialog({ title, viewKey, onClose, children }: { title: string; viewKey: string; onClose: () => void; children: ReactNode }) {
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
    ref.current.querySelector<HTMLElement>('#catalog-dialog-title')?.focus({ preventScroll: true });
  }, [viewKey]);
  return <dialog ref={ref} className="sc-dialog" aria-labelledby="catalog-dialog-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="sc-dialog-inner"><div className="sc-dialog-head"><h2 id="catalog-dialog-title" tabIndex={-1}>{title}</h2><button className="sc-icon-button" onClick={onClose} aria-label="닫기"><Icon name="close" /></button></div>{children}</div>
  </dialog>;
}

/** Food and beauty share the upstream room presentation, with no scenario or recommendation engine. */
export default function CatalogScenePage({ category }: { category: CatalogCategory }) {
  const config = CONFIG[category];
  const storageKey = `gscene-catalog-${category}-v1`;
  const [data, setData] = useState<DemoCatalog | null>(null);
  const [confirmed, setConfirmed] = useState<DemoState | null>(null);
  const [state, setState] = useState<State>({ cart: [], savedProductIds: [] });
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [storageNotice, setStorageNotice] = useState(false);
  const [tab, setTab] = useState<'owned' | 'cart'>('owned');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [sort, setSort] = useState('catalog');
  const [notice, setNotice] = useState('');
  const [interaction, setInteraction] = useState({ x: config.homeX as number, key: 0 });
  const [eating,setEating] = useState<{id:string;progress:number;reduced:boolean}|null>(null);
  const eatingLock=useRef<string|null>(null);
  const roomRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const closeFocus = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let mounted = true;
    setError(false);
    fetch(`/api/demo/${category}`, { signal: controller.signal, cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('Catalog unavailable'); return response.json(); })
      .then((catalog: DemoCatalog) => {
        if (!mounted) return;
        if (catalog.category !== category || !Array.isArray(catalog.products) || !Array.isArray(catalog.purchases) || !catalog.user?.id) throw new Error('Invalid catalog');
        let stored: unknown = null, legacy: unknown = null;
        try {
          stored = localStorage.getItem(storageKey);
          if (category === 'food') legacy = localStorage.getItem('gscene-food-v1');
        } catch { /* The validated default catalog remains usable. */ }
        setState(restoreCatalogState(catalog, stored, legacy));
        setData(catalog); setConfirmed(readDemoState(catalog.home));
      }).catch(() => { if (mounted) setError(true); })
      .finally(() => clearTimeout(timer));
    return () => { mounted = false; controller.abort(); clearTimeout(timer); };
  }, [category, storageKey, attempt]);

  useEffect(() => {
    if (!data) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, ...state })); }
    catch { setStorageNotice(true); }
  }, [data, state, storageKey]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (panel || !closeFocus.current) return;
    closeFocus.current = false;
    const frame = requestAnimationFrame(() => {
      const target = returnFocusRef.current;
      if (target?.isConnected) target.focus({ preventScroll: true });
      else roomRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [panel]);

  useEffect(() => {
    if (!data) return;
    const restore = () => {
      cancelEating();
      setConfirmed(readDemoState(data.home));
      try {
        const next = restoreCatalogState(data, localStorage.getItem(storageKey));
        setState(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
      } catch { /* Keep this visit's choices when storage is unavailable. */ }
    };
    const storage = (event: StorageEvent) => { if (event.key === 'gscene-main-v1' || event.key === storageKey || event.key === null) restore(); };
    window.addEventListener('pageshow', restore); window.addEventListener('storage', storage);
    return () => { window.removeEventListener('pageshow', restore); window.removeEventListener('storage', storage); };
  }, [data, storageKey]);
  useEffect(()=>{if(confirmed){const image=new Image();image.src=`/assets/avatars/${confirmed.avatarId}-eating-states.png`;}},[confirmed?.avatarId]);
  function cancelEating(){eatingLock.current=null;setEating(null);}
  useEffect(()=>{
    if(!eating||!data||!confirmed)return;
    const id=eating.id,duration=eating.reduced?REDUCED_EATING_DURATION:EATING_DURATION;
    let frame=0,start:number|null=null,alive=true;
    const cancel=()=>{alive=false;cancelAnimationFrame(frame);cancelEating();};
    const hide=()=>{if(document.hidden)cancel();};
    const step=(time:number)=>{
      if(!alive||eatingLock.current!==id||document.hidden)return;
      if(start===null)start=time;
      const progress=Math.min(1,(time-start)/duration);
      if(progress<1){setEating({id,progress,reduced:eating.reduced});frame=requestAnimationFrame(step);return;}
      eatingLock.current=null;
      const result=updateDemoState(data.home,confirmed,current=>consumeOwnedFood(data.home,current,id));
      setConfirmed(result.state);if(!result.saved)setStorageNotice(true);
      setEating(null);setNotice(`잘 먹었어요 · ${result.state.foodQuantity[id]}회 남았어요`);
    };
    frame=requestAnimationFrame(step);
    window.addEventListener('blur',cancel);window.addEventListener('pagehide',cancel);document.addEventListener('visibilitychange',hide);
    return()=>{alive=false;cancelAnimationFrame(frame);window.removeEventListener('blur',cancel);window.removeEventListener('pagehide',cancel);document.removeEventListener('visibilitychange',hide);};
  // A progress update must not restart the eating transaction.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[eating?.id,data]);
  function eat(id:string){
    if(category!=='food'||!data||!confirmed||eatingLock.current)return;
    const latest=confirmed,product=data.home.purchases.find(p=>p.id===id&&p.category==='food');
    if(!product||latest.foodQuantity[id]<=0)return;
    setConfirmed(latest);eatingLock.current=id;
    if(panel){returnFocusRef.current=roomRef.current;closePanel();}
    const index=purchases.findIndex(p=>p.id===id);moveTo(config.targets[index%config.targets.length]);
    setEating({id,progress:0,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches});
    roomRef.current?.scrollIntoView({block:'start',behavior:'instant'});
  }
  function eatButton(id:string){
    if(category!=='food'||!data?.home.purchases.some(p=>p.id===id&&p.category==='food'))return null;
    const quantity=confirmed?.foodQuantity[id]??0;
    return <button className="catalog-eat-button" data-eat-product={id} disabled={!!eating||quantity<=0} onClick={()=>eat(id)}>{eating?.id===id?'먹는 중…':quantity>0?'먹기':'다 먹었어요'}</button>;
  }

  function ownedStatus(id: string) {
    if (!data?.home.purchases.some(item => item.id === id)) return '';
    return category === 'food' ? `데모 잔량 ${confirmed?.foodQuantity[id] ?? data.home.purchases.find(item => item.id === id)?.state.quantity ?? 0}회` : confirmed?.featuredBeautyId === id ? '화장대에 꺼내두었어요' : '화장대에 함께 있어요';
  }

  const purchases = data?.purchases.flatMap(purchase => {
    const product = data.products.find(item => item.id === purchase.productId);
    return product ? [product] : [];
  }) ?? [];
  const cartProducts = state.cart.flatMap(line => {
    const product = data?.products.find(item => item.id === line.productId);
    return product ? [product] : [];
  });
  const saved = data?.products.filter(product => state.savedProductIds.includes(product.id)) ?? [];
  const rail = tab === 'owned' ? purchases : cartProducts;
  const anchor = rail.find(product => product.id === selectedId);
  const detail = data?.products.find(product => product.id === detailId);
  const cartCount = state.cart.reduce((total, line) => total + line.quantity, 0);
  const products = [...(data?.products ?? [])];
  if (sort === 'price-low') products.sort((a, b) => a.price - b.price);

  function openPanel(next: Panel, productId?: string) {
    cancelEating();
    if (!panel) returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (productId) setDetailId(productId);
    setPanel(next);
  }
  function closePanel() { closeFocus.current = true; setPanel(null); }
  function moveTo(x: number) { setInteraction(previous => ({ x, key: previous.key + 1 })); }
  function choose(product: DisplayProduct, source: 'owned' | 'cart') {
    cancelEating();
    setTab(source); setSelectedId(product.id);
    const index = purchases.findIndex(item => item.id === product.id);
    // Only purchase markers represent a place in the room. Cart selection never implies possession.
    moveTo(source === 'owned' && index >= 0 ? config.targets[index % config.targets.length] : config.homeX);
    if (panel) { returnFocusRef.current = roomRef.current; closePanel(); }
  }
  function clearSelection() { cancelEating(); setSelectedId(null); moveTo(config.homeX); }
  function changeTab(next: 'owned' | 'cart') { setTab(next); clearSelection(); }
  function addCart(product: DisplayProduct) {
    if (state.cart.some(line => line.productId === product.id)) { openPanel('cart'); return; }
    setState(previous => previous.cart.some(line => line.productId === product.id) ? previous : { ...previous, cart: addToCart(previous.cart, [{ productId: product.id, quantity: 1 }]) });
    setNotice('장바구니에 담았어요.');
  }
  function updateQuantity(productId: string, quantity: number) {
    if (!data) return;
    setState(previous => ({ ...previous, cart: normalizeCart(data, previous.cart.map(line => line.productId === productId ? { ...line, quantity } : line).filter(line => line.quantity > 0)) }));
    if (quantity === 0 && tab === 'cart' && selectedId === productId) clearSelection();
  }
  function toggleSaved(productId: string) {
    setState(previous => ({ ...previous, savedProductIds: previous.savedProductIds.includes(productId) ? previous.savedProductIds.filter(id => id !== productId) : [...previous.savedProductIds, productId] }));
  }
  function focusDialogTitle() { requestAnimationFrame(() => document.getElementById('catalog-dialog-title')?.focus({ preventScroll: true })); }

  return <main className={`sc-page sc-${category} catalog-page`}>
    <header className="sc-header"><a href="/" className="sc-back" aria-label="내 공간으로 돌아가기"><Icon name="back" /><span>내 공간</span></a><a href="/" className="sc-brand">G:Scene<span>.</span></a><div className="sc-header-actions"><button className="sc-icon-button" aria-label={`찜한 상품 ${saved.length}개`} onClick={() => openPanel('saved')}><Icon name="heart" /></button><button className="sc-icon-button sc-bag" aria-label={`장바구니 ${cartCount}개`} onClick={() => openPanel('cart')}><Icon name="bag" /><span>{cartCount}</span></button></div></header>
    {!data ? <section className="sc-load" role={error ? 'alert' : 'status'}><span className="sc-kicker">{config.english}</span><h1>{error ? '공간을 불러오지 못했어요' : '나의 공간을 준비하고 있어요'}</h1><p>{error ? '연결을 확인한 뒤 다시 시도해 주세요.' : '구매한 상품을 살펴보는 중이에요.'}</p>{error && <button className="sc-primary" onClick={() => setAttempt(value => value + 1)}>다시 불러오기</button>}</section> : <>
      <div className="sc-heading"><div><span className="sc-room-number">{config.number}</span><h1>{config.title}</h1></div><span className="sc-person">{data.user.name}의 작은 취향 공간</span></div>
      <section ref={roomRef} tabIndex={-1} className="sc-collection" aria-label={`${config.title}의 구매 상품`}>
        <div className="sc-room-hud"><span><i />{config.english}</span><div className="sc-room-controls"><button onClick={clearSelection} aria-label="캐릭터 제자리로">↶ 제자리로</button></div></div>
        <div className="sc-room catalog-room" style={{ '--catalog-avatar-x': interaction.x, '--catalog-avatar-bottom': 4 } as CSSProperties}>
          <img className="sc-room-art" src={config.room} alt={config.roomAlt} width="900" height="300" />
          {eating&&confirmed?<EatingAvatar home={data.home} confirmed={confirmed} productId={eating.id} progress={eating.progress} x={interaction.x} reduced={eating.reduced}/>:<RoomAvatar home={data.home} confirmedState={confirmed ?? undefined} fallbackAvatarId={data.user.avatarId} fallbackOutfitId={data.initialOutfitId} category="living" seated={false} interactionKey={interaction.key} />}
          {!eating&&purchases.map((product, index) => <button key={product.id} className="sc-room-pin" style={{ left: `${config.targets[index % config.targets.length]}%`, top: '46%' }} aria-label={`${product.name} 살펴보기`} aria-pressed={selectedId === product.id && tab === 'owned'} onClick={() => choose(product, 'owned')}><span>{index + 1}</span></button>)}
          <span className="sc-room-footnote">{eating?'맛있게 먹는 중 · 완료 후 잔량이 줄어요':'구매 상품을 눌러 살펴보세요'}</span>
        </div>
        <div className="sc-inventory-head"><div className="sc-tabs" role="group" aria-label="내 상품 목록"><button aria-pressed={tab === 'owned'} onClick={() => changeTab('owned')}>구매한 상품 <span>{purchases.length}</span></button><button aria-pressed={tab === 'cart'} onClick={() => changeTab('cart')}>장바구니 <span>{cartProducts.length}</span></button></div><button className="sc-text-button" onClick={() => openPanel(tab)}>전체 보기 ↗</button></div>
        <div className="sc-inventory-rail">{rail.map((product, index) => <button key={product.id} className="sc-owned-item" title={product.name} aria-pressed={selectedId === product.id} onClick={() => choose(product, tab)}><span className="sc-owned-photo"><ProductVisual product={product} />{tab === 'owned' && <span className="sc-item-index">{index + 1}</span>}{selectedId === product.id && <span className="sc-selected-check"><Icon name="check" size={12} /></span>}</span><span className="sc-owned-name">{product.name}</span>{tab === 'owned' && <small className="catalog-owned-status">{ownedStatus(product.id)}</small>}</button>)}<button className="sc-owned-item sc-new-item" aria-pressed={!anchor} onClick={clearSelection}><span className="sc-owned-photo"><span>＋</span></span><span>새롭게 둘러보기</span></button></div>
        <div className="sc-anchor-caption" aria-live="polite"><span className="sc-small-star" aria-hidden="true">＋</span>{anchor ? <p><b>{anchor.name}</b><small>{tab === 'owned' ? `가상 보유 · ${ownedStatus(anchor.id)}` : '장바구니 상품 · 아직 구매 전이에요'}</small></p> : <p>{rail.length ? '상품을 골라 자세히 살펴보세요.' : tab === 'owned' ? '구매 기록이 없어도 상품을 둘러볼 수 있어요.' : '아직 장바구니에 담긴 상품이 없어요.'}</p>}{anchor&&tab==='owned'&&eatButton(anchor.id)}{anchor && <button className="sc-text-button" onClick={() => openPanel('product', anchor.id)}>상품 보기 ↗</button>}</div>
        {eating&&<div className="catalog-eating-status" role="status"><span>잠깐의 식사 시간 · 이동하면 취소돼요</span><button className="sc-text-button" onClick={cancelEating}>먹기 취소</button></div>}
      </section>
      <p className="sc-demo-note catalog-state-note">가상 보유 상태는 내 공간과 연결돼요. 그림은 실제 상품 외형이 아닌 공간용 예시예요.{category === 'food' && <><br />데모 잔량은 사용 횟수이며 상품의 포장 수량·재고와 달라요.</>}</p>
      <section className="sc-results" aria-labelledby="catalog-products-title"><div className="sc-results-heading"><h2 id="catalog-products-title"><span className="sc-pixel-spark" aria-hidden="true">✳</span>{config.label} 둘러보기 <span className="sc-result-count">{products.length}</span></h2><label className="sc-sort"><span className="sr-only">상품 정렬</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="catalog">기본순</option><option value="price-low">낮은 가격순</option></select></label></div>
        <div className="sc-product-grid">{products.map(product => {
          const inCart = state.cart.some(line => line.productId === product.id);
          return <article className="sc-card" key={product.id}><div className="sc-card-image"><button className="sc-card-open" aria-label={`${product.name} 상세 보기`} onClick={() => openPanel('product', product.id)}><ProductVisual product={product} /></button><button className="sc-heart" aria-label={`${product.name} 찜`} aria-pressed={state.savedProductIds.includes(product.id)} onClick={() => toggleSaved(product.id)}><Icon name="heart" size={18} /></button></div><div className="sc-card-copy"><span className="sc-product-kind">{product.cate3_nm || product.cate2_nm}</span><button className="sc-card-name" onClick={() => openPanel('product', product.id)}>{product.name}</button><small className="catalog-source">{product.catalogSource === 'shared-products' ? '실상품 · 카탈로그 참고가' : '가상 예시 상품 · 예시 가격'}</small><strong className="sc-price">{money(product.price)}</strong><button className={`sc-cart-button ${inCart ? 'is-added' : ''}`} onClick={() => addCart(product)}><Icon name={inCart ? 'check' : 'bag'} size={15} />{inCart ? '담은 상품 보기' : '장바구니에 담기'}</button></div></article>;
        })}</div>
        {products.length === 0 && <div className="sc-empty"><p>표시할 상품이 아직 없어요.</p></div>}
      </section>
      <p className="sc-demo-note">가상 고객의 구매·보유를 실상품에 연결한 데모예요.<br />추가 탐색 상품은 별도 표시한 가상 예시이며 실제 주문은 진행되지 않아요.</p>
      {storageNotice && <p className="sc-demo-note" role="status">이 브라우저에서는 저장할 수 없어 이번 방문 동안만 유지돼요.</p>}
    </>}
    <CategoryNav activeCategory={category} />
    {notice && !panel && <div className="sc-toast" role="status">{notice}</div>}
    {panel && data && <CatalogDialog title={panel === 'owned' ? `구매한 상품 ${purchases.length}` : panel === 'cart' ? `장바구니 ${cartCount}` : panel === 'saved' ? `찜한 상품 ${saved.length}` : '상품 자세히 보기'} viewKey={`${panel}:${detailId}`} onClose={closePanel}>
      {notice && <p className="catalog-dialog-notice" role="status">{notice}</p>}
      {panel === 'product' && detail ? <><div className="sc-detail-image"><ProductVisual product={detail} /></div><div className="sc-detail-copy"><span className="sc-product-kind">{[detail.brd_mn, detail.cate3_nm || detail.cate2_nm].filter(Boolean).join(' · ')}</span><h3>{detail.name}</h3><strong className="sc-detail-price">{money(detail.price)}</strong>{data.purchases.some(item => item.productId === detail.id) && <p>{data.purchases.find(item => item.productId === detail.id)?.purchasedAt} 가상 구매 기록</p>}<p className="sc-demo-note">{detail.catalogSource === 'shared-products' ? '실상품 카탈로그 참고가 · 가상 구매·보유' : '실제 판매 상품이 아닌 가상 예시'}<br />그림은 실제 외형·가상 피팅을 재현하지 않아요.</p>{ownedStatus(detail.id) && <p className="catalog-owned-status">{ownedStatus(detail.id)}</p>}{eatButton(detail.id)}<button className="sc-primary" onClick={() => addCart(detail)}><span>{state.cart.some(line => line.productId === detail.id) ? '담은 상품 보기' : '장바구니에 담기'}</span><Icon name="bag" /></button><button className="sc-outline catalog-save" aria-pressed={state.savedProductIds.includes(detail.id)} onClick={() => toggleSaved(detail.id)}>{state.savedProductIds.includes(detail.id) ? '찜 해제' : '상품 찜하기'}</button></div></> : panel === 'product' ? <p>상품 정보를 찾을 수 없어요.</p> : <>
        <p className="sc-dialog-description">{panel === 'owned' ? '실상품에 연결한 가상 구매·보유예요. 상품을 선택하면 공간에서 살펴볼 수 있어요.' : panel === 'saved' ? '찜한 상품이에요. 장바구니와는 따로 보관해요.' : '담아둔 상품이에요. 수량을 직접 바꿀 수 있어요.'}</p>
        <div className="sc-dialog-list">{(panel === 'owned' ? purchases : panel === 'cart' ? cartProducts : saved).map(product => <article className="sc-dialog-item" key={product.id}><button className="sc-dialog-thumb" aria-label={`${product.name} ${panel === 'owned' ? '공간에서 살펴보기' : '상세 보기'}`} onClick={() => panel === 'owned' ? choose(product, 'owned') : openPanel('product', product.id)}><ProductVisual product={product} /></button><div><h3>{product.name}</h3><p>{money(product.price)}</p>{panel === 'cart' ? <div className="catalog-quantity"><button aria-label={`${product.shortName} 수량 줄이기`} disabled={(state.cart.find(line => line.productId === product.id)?.quantity ?? 1) <= 1} onClick={() => updateQuantity(product.id, (state.cart.find(line => line.productId === product.id)?.quantity ?? 1) - 1)}>−</button><output>{state.cart.find(line => line.productId === product.id)?.quantity}</output><button aria-label={`${product.shortName} 수량 늘리기`} disabled={(state.cart.find(line => line.productId === product.id)?.quantity ?? 1) >= 99} onClick={() => updateQuantity(product.id, (state.cart.find(line => line.productId === product.id)?.quantity ?? 1) + 1)}>＋</button></div> : <button className="sc-text-button" onClick={() => panel === 'owned' ? choose(product, 'owned') : openPanel('product', product.id)}>{panel === 'owned' ? '공간에서 살펴보기' : '상품 보기'} ↗</button>}</div>{panel !== 'owned' && <button className="sc-icon-button" aria-label={`${product.shortName} ${panel === 'cart' ? '장바구니에서 삭제' : '찜 해제'}`} onClick={() => { if (panel === 'cart') updateQuantity(product.id, 0); else toggleSaved(product.id); focusDialogTitle(); }}><Icon name="close" size={16} /></button>}</article>)}</div>
        {(panel === 'owned' ? purchases : panel === 'cart' ? cartProducts : saved).length === 0 && <div className="sc-empty"><p>{panel === 'cart' ? '아직 담긴 상품이 없어요.' : panel === 'saved' ? '아직 찜한 상품이 없어요.' : '구매 기록이 아직 없어요.'}</p><button className="sc-outline" onClick={closePanel}>상품 둘러보기</button></div>}
        {panel === 'cart' && <div className="sc-cart-total"><span>상품금액 합계</span><strong>{money(cartTotal(data, state.cart))}</strong><small>예시 가격 · 배송비 별도 · 실제 주문은 진행되지 않아요.</small></div>}
      </>}
    </CatalogDialog>}
  </main>;
}
