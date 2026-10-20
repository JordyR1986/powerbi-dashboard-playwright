import { catalog } from '../../src/data/catalog';
import { customer } from '../../src/data/checkout';
import { expect, test } from '../../src/fixtures/ui.fixture';
import type { Page } from '@playwright/test';

// The footer shows the current year, so it is masked to keep baselines stable over time.
const stable = (page: Page) => ({ fullPage: true, mask: [page.getByTestId('footer-copy')] });

// Screenshot baselines live in __screenshots__ and are generated in the official
// Playwright image only. See docs/visual-testing.md for how to update them.
test.describe('Visual', { tag: ['@visual', '@regression'] }, () => {
  test('login page', async ({ page, loginPage }) => {
    await loginPage.open();

    await expect(page).toHaveScreenshot('login.png', stable(page));
  });

  test('inventory page', async ({ page, shopper }) => {
    await expect(shopper.inventoryPage.title).toHaveText('Products');

    await expect(page).toHaveScreenshot('inventory.png', stable(page));
  });

  test('cart with two products', async ({ page, shopper }) => {
    await shopper.inventoryPage.addToCart(catalog.backpack.name);
    await shopper.inventoryPage.addToCart(catalog.bikeLight.name);
    await shopper.cartPage.open();

    await expect(page).toHaveScreenshot('cart.png', stable(page));
  });

  test('checkout overview', async ({ page, shopper }) => {
    await shopper.inventoryPage.addToCart(catalog.backpack.name);
    await shopper.cartPage.open();
    await shopper.cartPage.checkout();
    await shopper.checkoutPage.submitCustomer(customer);

    await expect(page).toHaveScreenshot('checkout-overview.png', stable(page));
  });
});
