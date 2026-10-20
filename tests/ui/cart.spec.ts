import { catalog } from '../../src/data/catalog';
import { expect, test } from '../../src/fixtures/ui.fixture';

test.describe('Cart', { tag: '@ui' }, () => {
  test('adds two products and removes one', { tag: '@smoke' }, async ({ shopper }) => {
    const selected = [catalog.backpack, catalog.bikeLight];

    for (const item of selected) {
      const card = shopper.inventoryPage.item(item.name);
      await expect(card.getByTestId('inventory-item-price')).toHaveText(
        `$${item.price.toFixed(2)}`,
      );
      await shopper.inventoryPage.addToCart(item.name);
    }

    await expect(shopper.inventoryPage.cartBadge).toHaveText(String(selected.length));

    await shopper.cartPage.open();
    await expect(shopper.cartPage.itemNames).toHaveText(selected.map((item) => item.name));

    for (const item of selected) {
      await expect(shopper.cartPage.item(item.name).getByTestId('inventory-item-price')).toHaveText(
        `$${item.price.toFixed(2)}`,
      );
    }

    await shopper.cartPage.remove(catalog.backpack.name);

    await expect(shopper.cartPage.itemNames).toHaveText([catalog.bikeLight.name]);
    await expect(shopper.cartPage.cartBadge).toHaveText('1');
  });
});
