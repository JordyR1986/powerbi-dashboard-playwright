import type { Locator, Page } from '@playwright/test';
import { inventoryButtonId } from '../data/catalog';

export class CartPage {
  readonly itemNames: Locator;
  readonly cartBadge: Locator;

  constructor(private readonly page: Page) {
    this.itemNames = page.getByTestId('cart-list').getByTestId('inventory-item-name');
    this.cartBadge = page.getByTestId('shopping-cart-badge');
  }

  item(productName: string): Locator {
    return this.page
      .getByTestId('cart-list')
      .getByTestId('inventory-item')
      .filter({
        has: this.page.getByTestId('inventory-item-name').getByText(productName, { exact: true }),
      });
  }

  async open(): Promise<void> {
    await this.page.getByTestId('shopping-cart-link').click();
    await this.page.waitForURL('**/cart.html');
  }

  async remove(productName: string): Promise<void> {
    await this.page.getByTestId(inventoryButtonId('remove', productName)).click();
  }

  async checkout(): Promise<void> {
    await this.page.getByTestId('checkout').click();
    await this.page.waitForURL('**/checkout-step-one.html');
  }
}
