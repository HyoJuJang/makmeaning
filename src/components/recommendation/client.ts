'use client';

import { useEffect, useState } from 'react';
import type { RecommendationDomain, RecommendationMode, RecommendationRequest, RecommendationResponse } from '@/lib/recommendation/types';

export const DOMAIN_LABELS: Record<RecommendationDomain, string> = { fashion: '패션', living: '리빙', food: '푸드', beauty: '뷰티' };
const USER_KEY = 'gscene-recommendation-user-v1';
const CHANGE_EVENT = 'gscene-recommendation-preference';

export interface RecommendationStatus {
  ready: boolean;
  defaultMode: RecommendationMode;
  builtAt?: string;
  window?: { from: string; to: string };
  summary?: { products?: number; users?: number; domains?: Record<string, number> };
  sampleDomains: RecommendationDomain[];
}

function readPreference(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function saveRecommendationUser(userId: string) {
  try {
    if (userId.trim()) localStorage.setItem(USER_KEY, userId.trim());
    else localStorage.removeItem(USER_KEY);
  } catch { /* A denied storage write must not prevent a recommendation request. */ }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { userId: userId.trim() } }));
}

export function useRecommendationPreferences() {
  const [value, setValue] = useState({ ready: false, userId: '' });
  useEffect(() => {
    const read = () => {
      setValue({ ready: true, userId: readPreference(USER_KEY) || '' });
    };
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      setValue(previous => ({ ...previous, ...detail, ready: true }));
    };
    const storageChanged = (event: StorageEvent) => {
      if (!event.key || event.key === USER_KEY) read();
    };
    read();
    window.addEventListener('storage', storageChanged);
    window.addEventListener(CHANGE_EVENT, changed);
    return () => { window.removeEventListener('storage', storageChanged); window.removeEventListener(CHANGE_EVENT, changed); };
  }, []);
  return value;
}

class RecommendationError extends Error {
  constructor(message: string, public unavailable = false) { super(message); }
}

function errorMessage(payload: unknown) {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = payload.error;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  }
  return '추천을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';
}

export function useRecommendationStatus(retry = 0) {
  const [state, setState] = useState<{ data: RecommendationStatus | null; loading: boolean; error: string | null }>({ data: null, loading: true, error: null });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setState({ data: null, loading: true, error: null });
    fetch('/api/recommendations/status', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const payload = await response.json();
        if (!response.ok && typeof payload.ready !== 'boolean') throw new Error(errorMessage(payload));
        if (typeof payload.ready !== 'boolean' || !Array.isArray(payload.sampleDomains)) throw new Error('추천 데이터 상태를 확인하지 못했어요.');
        if (active) setState({ data: payload as RecommendationStatus, loading: false, error: null });
      })
      .catch(error => { if (active) setState({ data: null, loading: false, error: controller.signal.aborted ? '응답이 늦어지고 있어요. 다시 확인해 주세요.' : error.message }); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [retry]);
  return state;
}

interface ResultState {
  key: string | null;
  result: RecommendationResponse | null;
  loading: boolean;
  error: string | null;
  unavailable: boolean;
}

export function useRecommendationResult(request: RecommendationRequest | null, retry = 0) {
  const key = request ? JSON.stringify(request) : null;
  const [state, setState] = useState<ResultState>({ key: null, result: null, loading: false, error: null, unavailable: false });
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setState({ key, result: null, loading: true, error: null, unavailable: false });
    fetch('/api/recommendations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: key, cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new RecommendationError(errorMessage(payload), response.status === 503);
        if (!Array.isArray(payload.items) || !Array.isArray(payload.anchors)) throw new RecommendationError('추천 결과의 형식을 확인하지 못했어요.');
        if (active) setState({ key, result: payload as RecommendationResponse, loading: false, error: null, unavailable: false });
      })
      .catch(error => {
        if (active) setState({ key, result: null, loading: false, error: controller.signal.aborted ? '추천 응답이 늦어지고 있어요. 다시 시도해 주세요.' : error.message, unavailable: error instanceof RecommendationError && error.unavailable });
      })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [key, retry]);
  return state.key === key ? state : { key, result: null, loading: !!key, error: null, unavailable: false };
}
