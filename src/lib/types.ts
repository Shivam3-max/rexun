export type Variant = {
  sku: string;
  attrs: Record<string, string>;
  mrp: number;
  price: number;
  image: string | null;
  stock: number;
  inStock: boolean;
};

export type Option = {
  key: string;
  label: string;
  values: string[];
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  dept: string;
  deptName: string;
  category: string;
  categorySlug: string;
  rooms: string[];
  tagline: string;
  description: string;
  specs: Record<string, string>;
  highlights: string[];
  options: Option[];
  variants: Variant[];
  price: number;
  priceMax: number;
  mrp: number;
  mrpMax: number;
  estimatedPrice: boolean;
  images: string[];
  wattage: number | null;
  sweep: number | null;
  warranty: string | null;
  skuCount: number;
  inStock: boolean;
  own: boolean;
  featured: boolean;
};

export type Taxonomy = {
  departments: { slug: string; name: string; blurb: string; image: string | null; count: number }[];
  categories: { slug: string; name: string; dept: string; image: string | null; count: number }[];
  brands: { slug: string; name: string; count: number }[];
  rooms: { slug: string; name: string; image: string | null; count: number }[];
};

/**
 * Cart lines carry their own copy of name, price and image so the cart works
 * without the catalogue in the browser. The server re-prices every line from
 * the database before an order is created, so a stale localStorage cart can
 * never set the price that gets charged.
 */
export type CartLine = {
  slug: string;
  sku: string;
  name: string;
  brand: string;
  attrs: Record<string, string>;
  image: string | null;
  price: number;
  mrp: number;
  qty: number;
};
