'use client';

export function CommerceStatus({ loading, error, storageError, retry }: { loading: boolean; error: string; storageError: boolean; retry: () => void }) {
  return <div className="sc-commerce-status" aria-live="polite">
    {loading && <p>담아둔 상품을 확인하고 있어요…</p>}
    {error && <p role="alert">{error} <button className="sc-text-button" onClick={retry}>다시 확인</button></p>}
    {storageError && <p role="status">장바구니를 브라우저에 저장하지 못했어요. 페이지를 떠나면 변경 내용이 사라질 수 있어요.</p>}
  </div>;
}

export function CartQuantity({ name, quantity, disabled = false, onChange }: { name: string; quantity: number; disabled?: boolean; onChange: (quantity: number) => void }) {
  return <div className="sc-cart-quantity" aria-label={`${name} 수량`}>
    <button type="button" aria-label={`${name} 수량 줄이기`} disabled={disabled || quantity <= 1} onClick={() => onChange(quantity - 1)}>−</button>
    <output aria-label={`${name} 선택 수량`}>{quantity}</output>
    <button type="button" aria-label={`${name} 수량 늘리기`} disabled={disabled || quantity >= 99} onClick={() => onChange(quantity + 1)}>＋</button>
  </div>;
}
