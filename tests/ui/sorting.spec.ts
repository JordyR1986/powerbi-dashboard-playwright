import { productsByNameDesc, productsByPriceAsc } from '../../src/data/catalog';
import { expect, test } from '../../src/fixtures/ui.fixture';

test.describe('Product sorting', { tag: '@ui' }, () => {
  test('orders products by name from Z to A', { tag: '@regression' }, async ({ shopper }) => {
    await shopper.inventoryPage.sortBy('za');

    await expect(shopper.inventoryPage.itemNames).toHaveText([...productsByNameDesc]);
  });

  test('orders products by price from low to high', { tag: '@regression' }, async ({ shopper }) => {
    await shopper.inventoryPage.sortBy('lohi');

    await expect(shopper.inventoryPage.itemNames).toHaveText([...productsByPriceAsc]);
  });
});
