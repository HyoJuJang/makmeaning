export type ProductDomain = 'fashion' | 'food' | 'living' | 'beauty';

/** Shared catalog row. Prices are whole KRW within JavaScript's safe integer range. */
export interface Product {
  prd_id: string;
  view_name: string;
  cate1_nm: string | null;
  cate2_nm: string | null;
  cate3_nm: string | null;
  cate4_nm: string | null;
  brand_name: string | null;
  discprice: number;
  domain: ProductDomain;
  opt1: string | null;
  opt2: string | null;
  opt3: string | null;
  opt4: string | null;
}
