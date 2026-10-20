import { catalog } from '../../src/data/catalog';
import { checkoutCopy, customer } from '../../src/data/checkout';
import { expect, test } from '../../src/fixtures/ui.fixture';
import { sauceTotals } from '../../src/support/money';

test.describe('Checkout', { tag: '@ui' }, () => {
  test('requires a first name before continuing', async ({ shopper }) => {
    await shopper.inventoryPage.addToCart(catalog.backpack.name);
    await shopper.cartPage.open();
    await shopper.cartPage.checkout();

    await shopper.checkoutPage.continue();

    await expect(shopper.checkoutPage.error).toContainText(checkoutCopy.firstNameRequired);
    await expect(shopper.checkoutPage.firstName).toBeVisible();
  });

  test('purchases two products and shows the taxed total', async ({ shopper }) => {
    const selected = [catalog.backpack, catalog.bikeLight];
    const totals = sauceTotals(selected.map((item) => item.price));

    for (const item of selected) {
      await shopper.inventoryPage.addToCart(item.name);
    }

    await shopper.cartPage.open();
    await shopper.cartPage.checkout();
    await shopper.checkoutPage.submitCustomer(customer);

    await expect(shopper.checkoutPage.itemNames).toHaveText(selected.map((item) => item.name));
    await expect(shopper.checkoutPage.paymentInfo).toHaveText(checkoutCopy.payment);
    await expect(shopper.checkoutPage.shippingInfo).toHaveText(checkoutCopy.shipping);
    await expect(shopper.checkoutPage.subtotal).toHaveText(`Item total: $${totals.subtotal}`);
    await expect(shopper.checkoutPage.tax).toHaveText(`Tax: $${totals.tax}`);
    await expect(shopper.checkoutPage.total).toHaveText(`Total: $${totals.total}`);

    await shopper.checkoutPage.finish();

    await expect(shopper.checkoutPage.completeHeader).toHaveText(checkoutCopy.completeHeader);
    await expect(shopper.checkoutPage.completeText).toHaveText(checkoutCopy.completeText);
  });
});
