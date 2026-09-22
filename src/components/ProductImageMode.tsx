'use client';

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import './product-image-mode.css';

type ProductImageMode = {
  showProductPhotos: boolean;
  setShowProductPhotos: Dispatch<SetStateAction<boolean>>;
};

// Other artwork surfaces keep their current appearance outside a category page.
const ProductImageModeContext = createContext<ProductImageMode>({
  showProductPhotos: false,
  setShowProductPhotos: () => {},
});

export function ProductImageModeProvider({ children }: { children: ReactNode }) {
  const [showProductPhotos, setShowProductPhotos] = useState(false);
  return <ProductImageModeContext.Provider value={{ showProductPhotos, setShowProductPhotos }}>
    {children}
  </ProductImageModeContext.Provider>;
}

export function useProductImageMode() {
  return useContext(ProductImageModeContext);
}

export function ProductImageToggle() {
  const { showProductPhotos, setShowProductPhotos } = useProductImageMode();
  return <div className="product-image-mode">
    <button type="button" className="product-image-switch" role="switch" aria-checked={showProductPhotos} aria-label="실제 상품 이미지" onClick={() => setShowProductPhotos(value => !value)}>
      <span>실제 상품 이미지</span>
      <span className="product-image-switch-track" aria-hidden="true"><span /></span>
      <span className="product-image-switch-state" aria-hidden="true">{showProductPhotos ? 'ON' : 'OFF'}</span>
    </button>
  </div>;
}
