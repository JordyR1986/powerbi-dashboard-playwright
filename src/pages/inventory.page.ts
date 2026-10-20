import type { Locator, Page } from '@playwright/test';
import { inventoryButtonId } from '../data/catalog';

export type SortOption = 'az' | 'za' | 'lohi' | 'hilo';

export class InventoryPage {
  readonly title: Locator;
  readonly itemNames: Locator;
  readonly cartBadge: Locator;
  readonly sort: Locator;

  constructor(private readonly page: Page) {
    this.title = page.getByTestId('title');
    this.itemNames = page.getByTestId('inventory-item-name');
    this.cartBadge = page.getByTestId('shopping-cart-badge');
    this.sort = page.getByTestId('product-sort-container');
  }

  async waitUntilReady(): Promise<void> {
    await this.page.waitForURL('**/inventory.html');
    await this.itemNames.first().waitFor({ state: 'visible' });
  }

  item(productName: string): Locator {
    return this.page.getByTestId('inventory-item').filter({
      has: this.page.getByTestId('inventory-item-name').getByText(productName, { exact: true }),
    });
  }

  async addToCart(productName: string): Promise<void> {
    await this.page.getByTestId(inventoryButtonId('add-to-cart', productName)).click();
  }

  async sortBy(option: SortOption): Promise<void> {
    await this.sort.selectOption(option);
  }
}
