import { test as base } from '@playwright/test';
import { users } from '../data/users';
import { CartPage } from '../pages/cart.page';
import { CheckoutPage } from '../pages/checkout.page';
import { InventoryPage } from '../pages/inventory.page';
import { LoginPage } from '../pages/login.page';

type Shopper = {
  inventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
};

type UiFixtures = {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  shopper: Shopper;
};

export const test = base.extend<UiFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  shopper: async ({ loginPage, inventoryPage, cartPage, checkoutPage }, use) => {
    await loginPage.open();
    await loginPage.signIn(users.standard.username, users.standard.password);
    await inventoryPage.waitUntilReady();
    await use({ inventoryPage, cartPage, checkoutPage });
  },
});

export { expect } from '@playwright/test';
