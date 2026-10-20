export type CatalogItem = {
  name: string;
  price: number;
};

export const catalog = {
  backpack: { name: 'Sauce Labs Backpack', price: 29.99 },
  bikeLight: { name: 'Sauce Labs Bike Light', price: 9.99 },
  boltShirt: { name: 'Sauce Labs Bolt T-Shirt', price: 15.99 },
  fleeceJacket: { name: 'Sauce Labs Fleece Jacket', price: 49.99 },
  onesie: { name: 'Sauce Labs Onesie', price: 7.99 },
  redShirt: { name: 'Test.allTheThings() T-Shirt (Red)', price: 15.99 },
} as const satisfies Record<string, CatalogItem>;

/** Name descending, matching Sauce Demo's localeCompare sort. */
export const productsByNameDesc = [
  catalog.redShirt.name,
  catalog.onesie.name,
  catalog.fleeceJacket.name,
  catalog.boltShirt.name,
  catalog.bikeLight.name,
  catalog.backpack.name,
] as const;

/**
 * Price ascending. Equal prices keep catalog order, so the $15.99 Bolt shirt
 * stays ahead of the $15.99 red shirt.
 */
export const productsByPriceAsc = [
  catalog.onesie.name,
  catalog.bikeLight.name,
  catalog.boltShirt.name,
  catalog.redShirt.name,
  catalog.backpack.name,
  catalog.fleeceJacket.name,
] as const;

/** Sauce Demo builds button ids from `${label}-${product name}`. */
export function inventoryButtonId(action: 'add-to-cart' | 'remove', productName: string): string {
  return `${action}-${productName}`.replace(/\s+/g, '-').toLowerCase();
}
