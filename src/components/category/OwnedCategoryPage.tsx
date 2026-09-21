"use client";

import { useEffect, useState } from 'react';
import type { Purchase } from '../../types/home';
import CategoryNav from '../navigation/CategoryNav';
import styles from './OwnedCategoryPage.module.css';

const details = {
 food: { title: '내 냉장고', subtitle: '내 공간에 채워둔 작은 습관', object: '냉장고와 팬트리' },
 beauty: { title: '내 화장대', subtitle: '오늘도 나를 돌보는 시간', object: '화장대' },
};

// These two tabs reuse the room's owned objects, without introducing recommendation flows.
export default function OwnedCategoryPage({ category }: { category: 'food' | 'beauty' }) {
 const info = details[category];
 const [saved, setSaved] = useState<{ foodQuantity?: Record<string, number>; featuredBeautyId?: string }>({});
 const [products, setProducts] = useState<Purchase[]>([]);
 const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
 const [attempt, setAttempt] = useState(0);
 useEffect(() => {
   let mounted = true;
   const abort = new AbortController();
   const timeout = setTimeout(() => abort.abort(), 10000);
   setLoadState('loading');
   try { setSaved(JSON.parse(localStorage.getItem('gscene-main-v1') || '{}') || {}); } catch {}
   fetch('/api/demo/home', { cache: 'no-store', signal: abort.signal, headers: { Accept: 'application/json' } })
     .then(async response => {
       if (!response.ok) throw new Error('Home unavailable');
       const home = await response.json();
       if (!Array.isArray(home.purchases)) throw new Error('Invalid home');
       if (mounted) { setProducts(home.purchases.filter((product: Purchase) => product.category === category)); setLoadState('ready'); }
     })
     .catch(() => { if (mounted) setLoadState('error'); })
     .finally(() => clearTimeout(timeout));
   return () => { mounted = false; clearTimeout(timeout); abort.abort(); };
 }, [category, attempt]);
 const featuredBeauty = products.some(product => product.id === saved.featuredBeautyId) ? saved.featuredBeautyId : products.find(product => product.state.featured)?.id;
 const quantity = (product: Purchase) => { const value = saved.foodQuantity?.[product.id]; const initial = product.state.quantity ?? 0; return Number.isInteger(value) && value! >= 0 && value! <= initial ? value : initial; };
 return <div className={styles.page}>
   <header className={styles.header}><a href="/" aria-label="내 공간으로 돌아가기">← 내 공간</a><span>G:Scene</span></header>
   <main className={styles.main}>
     <p className={styles.eyebrow}>{category.toUpperCase()} / MY OBJECTS</p>
     <h1>{info.title}</h1><p className={styles.subtitle}>{info.subtitle}</p>
     {loadState === 'loading' ? <p role="status">공간에 있는 물건을 불러오고 있어요.</p> : loadState === 'error' ? <section className={styles.collection}><p role="alert">물건을 불러오지 못했어요.</p><button className={styles.returnLink} onClick={() => setAttempt(value => value + 1)}>다시 불러오기</button></section> : <section className={styles.collection} aria-label={`${info.object}에 있는 구매 상품`}>
       <div className={styles.collectionHeading}><h2>함께하는 물건</h2><span>{products.length}개</span></div>
       {products.map(product => <article className={styles.product} key={product.id}>
         <div className={styles.thumb}><img src={product.imageUrl} alt="" width="72" height="72" /></div>
         <div><h3>{product.name}</h3><p>{product.purchasedAt} 구매</p><p>{category === 'food' ? `남은 수량 ${quantity(product)}개` : featuredBeauty === product.id ? '화장대에 꺼내두었어요' : '화장대에 함께 있어요'}</p></div>
       </article>)}
     </section>}
     <a className={styles.returnLink} href="/">{info.object}로 돌아가기 <span aria-hidden="true">↗</span></a>
   </main>
   <CategoryNav activeCategory={category} />
 </div>;
}
