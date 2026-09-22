'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { personalStateKey } from '../../../app/demo-state.js';
import type { DisplayProduct } from '../../types/catalog';
import type { RecommendationDomain } from '../../lib/recommendation/types';
import { commerceBaseKey, emptyCommerceState, normalizeCommerceState, realProductId, restoreCommerceState, verifiedCommerceState, type CommerceState } from '../../lib/commerce-state';

type Snapshot = { key: string; state: CommerceState; products: DisplayProduct[]; ready: boolean; loading: boolean; pendingProductId: string | null; error: string; storageError: boolean };
const blank = (key = ''): Snapshot => ({ key, state: emptyCommerceState(), products: [], ready: false, loading: false, pendingProductId: null, error: '', storageError: false });

async function resolveProducts(category: RecommendationDomain, ids: string[], signal: AbortSignal) {
  const products: DisplayProduct[] = [];
  for (let start = 0; start < ids.length; start += 50) {
    const requested = ids.slice(start, start + 50);
    const response = await fetch(`/api/demo/products?${new URLSearchParams({ category, ids: requested.join(',') })}`, { cache: 'no-store', signal });
    if (!response.ok) throw new Error('상품 정보를 확인하지 못했어요. 연결을 확인하고 다시 시도해 주세요.');
    const result = await response.json();
    if (result.category !== category || !Array.isArray(result.products)) throw new Error('상품 정보를 확인하지 못했어요. 다시 시도해 주세요.');
    products.push(...result.products.filter((product: DisplayProduct) => requested.includes(product.id) && product.id === product.prd_id && realProductId(product.id) && product.catalogSource === 'shared-products' && product.domain === category && Number.isFinite(product.price) && product.price >= 0));
  }
  return products;
}

/** One ID-only cart for every category, isolated by the active persona. */
export function useRealCart(category: RecommendationDomain, userId?: string) {
  const key = userId ? personalStateKey(commerceBaseKey(category), userId) : '';
  const [snapshot, setSnapshot] = useState<Snapshot>(() => blank());
  const current = useRef(snapshot);
  const activeKey = useRef(key);
  activeKey.current = key;
  const sequence = useRef(0);
  const request = useRef<AbortController | null>(null);
  const lastStored = useRef<string | null | undefined>(undefined);
  const storageFailed = useRef(false);
  const publish = useCallback((next: Snapshot) => { current.current = next; setSnapshot(next); }, []);
  const persist = useCallback((next: Snapshot) => {
    if (!next.key || activeKey.current !== next.key) return;
    try {
      const raw = JSON.stringify(next.state);
      localStorage.setItem(next.key, raw);
      lastStored.current = raw;
      storageFailed.current = false;
      next = { ...next, storageError: false };
    } catch { storageFailed.current = true; next = { ...next, storageError: true }; }
    publish(next);
  }, [publish]);

  const restore = useCallback(async (force = false) => {
    if (!key || !userId) return;
    let raw: string | null = null;
    let candidate = emptyCommerceState();
    let inaccessible = false;
    try {
      raw = localStorage.getItem(key);
      if (!force && current.current.key === key && current.current.ready && (raw === lastStored.current || storageFailed.current)) return;
      const legacyKey = personalStateKey(`gscene-${category === 'fashion' || category === 'living' ? 'scene' : 'catalog'}-${category}-v1`, userId);
      const legacy = localStorage.getItem(legacyKey);
      const oldFood = category === 'food' && userId === 'demo-user' ? localStorage.getItem('gscene-food-v1') : null;
      candidate = storageFailed.current && current.current.key === key && current.current.ready ? current.current.state : restoreCommerceState(raw, legacy, oldFood);
      // Sanitize legacy snapshots as well so fake aliases can never resurface.
      if (legacy !== null) {
        const sanitized = normalizeCommerceState(legacy);
        localStorage.setItem(legacyKey, JSON.stringify(category === 'fashion' || category === 'living' ? { cartIds: sanitized.cart.map(line => line.productId), savedIds: sanitized.savedProductIds } : { version: 1, cart: sanitized.cart, savedProductIds: sanitized.savedProductIds }));
      }
    } catch {
      inaccessible = true;
      if (current.current.key === key && current.current.ready) candidate = current.current.state;
    }
    const version = ++sequence.current;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    const previous = current.current.key === key ? current.current : blank(key);
    publish({ ...previous, loading: true, error: '', pendingProductId: null, storageError: inaccessible || previous.storageError });
    try {
      const ids = [...new Set([...candidate.cart.map(line => line.productId), ...candidate.savedProductIds])];
      const products = await resolveProducts(category, ids, controller.signal);
      if (activeKey.current !== key || version !== sequence.current) return;
      persist({ ...blank(key), state: verifiedCommerceState(candidate, products), products, ready: true, storageError: inaccessible });
    } catch (error) {
      if (activeKey.current !== key || version !== sequence.current) return;
      publish({ ...current.current, ready: false, loading: false, error: error instanceof Error && error.name !== 'AbortError' ? error.message : '상품 확인 시간이 길어지고 있어요. 다시 시도해 주세요.' });
    } finally { clearTimeout(timeout); }
  }, [category, key, userId, publish, persist]);

  useEffect(() => {
    sequence.current++; request.current?.abort();
    lastStored.current = undefined; storageFailed.current = false;
    publish(blank(key));
    void restore(true);
    const refresh = () => { if (!current.current.pendingProductId) void restore(); };
    const storage = (event: StorageEvent) => {
      if (event.key !== key && event.key !== null) return;
      // A reset or another tab's cart change cancels any outstanding addition.
      sequence.current++; request.current?.abort(); storageFailed.current = false;
      void restore(true);
    };
    window.addEventListener('storage', storage); window.addEventListener('pageshow', refresh); window.addEventListener('focus', refresh);
    return () => { sequence.current++; request.current?.abort(); window.removeEventListener('storage', storage); window.removeEventListener('pageshow', refresh); window.removeEventListener('focus', refresh); };
  }, [key, restore, publish]);

  async function addVerified(productId: string, target: 'cart' | 'saved') {
    const before = current.current;
    if (!key || before.key !== key || !before.ready || before.loading || before.pendingProductId || !realProductId(productId)) return false;
    if (target === 'cart' && before.state.cart.some(line => line.productId === productId)) return true;
    if ((target === 'cart' ? before.state.cart.length : before.state.savedProductIds.length) >= 50) { publish({ ...before, error: '한 카테고리에 최대 50개 상품을 보관할 수 있어요.' }); return false; }
    const version = ++sequence.current;
    const controller = new AbortController(); request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    publish({ ...before, pendingProductId: productId, error: '' });
    try {
      const [product] = await resolveProducts(category, [productId], controller.signal);
      if (activeKey.current !== key || sequence.current !== version) return false;
      if (!product) throw new Error('이 카테고리에서 확인할 수 없는 상품이에요. 다른 상품을 골라 주세요.');
      const latest = current.current;
      const next = { ...latest, pendingProductId: null, products: [...latest.products.filter(item => item.id !== productId), product], state: { ...latest.state, ...(target === 'cart' ? { cart: [...latest.state.cart, { productId, quantity: 1 }] } : { savedProductIds: [...latest.state.savedProductIds, productId] }) } };
      persist(next);
      return true;
    } catch (error) {
      if (activeKey.current === key && sequence.current === version) publish({ ...current.current, pendingProductId: null, error: error instanceof Error && error.name !== 'AbortError' ? error.message : '상품 확인 시간이 길어지고 있어요. 다시 시도해 주세요.' });
      return false;
    } finally { clearTimeout(timeout); }
  }
  function updateQuantity(productId: string, quantity: number) {
    const latest = current.current;
    if (latest.key !== key || !latest.ready || latest.loading || !Number.isInteger(quantity) || quantity < 0 || quantity > 99) return;
    persist({ ...latest, state: { ...latest.state, cart: latest.state.cart.map(line => line.productId === productId ? { ...line, quantity } : line).filter(line => line.quantity > 0) } });
  }
  async function toggleSaved(productId: string) {
    const latest = current.current;
    if (latest.key !== key || !latest.ready || latest.loading) return false;
    if (latest.state.savedProductIds.includes(productId)) {
      persist({ ...latest, state: { ...latest.state, savedProductIds: latest.state.savedProductIds.filter(id => id !== productId) } });
      return true;
    }
    return addVerified(productId, 'saved');
  }
  const visible = snapshot.key === key ? snapshot : blank(key);
  const cartProducts = visible.state.cart.flatMap(line => visible.products.find(product => product.id === line.productId) ?? []);
  const savedProducts = visible.state.savedProductIds.flatMap(id => visible.products.find(product => product.id === id) ?? []);
  return { ...visible, cartProducts, savedProducts, cartIds: visible.state.cart.map(line => line.productId), count: visible.state.cart.reduce((total, line) => total + line.quantity, 0), total: visible.state.cart.reduce((total, line) => total + (visible.products.find(product => product.id === line.productId)?.price ?? 0) * line.quantity, 0), addCart: (id: string) => addVerified(id, 'cart'), updateQuantity, toggleSaved, retry: () => void restore(true) };
}
