import type { Locator, Page } from '@playwright/test';

export type CustomerDetails = {
  firstName: string;
  lastName: string;
  postalCode: string;
};

export class CheckoutPage {
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly postalCode: Locator;
  readonly continueButton: Locator;
  readonly finishButton: Locator;
  readonly error: Locator;
  readonly itemNames: Locator;
  readonly subtotal: Locator;
  readonly tax: Locator;
  readonly total: Locator;
  readonly paymentInfo: Locator;
  readonly shippingInfo: Locator;
  readonly completeHeader: Locator;
  readonly completeText: Locator;

  constructor(private readonly page: Page) {
    this.firstName = page.getByTestId('firstName');
    this.lastName = page.getByTestId('lastName');
    this.postalCode = page.getByTestId('postalCode');
    this.continueButton = page.getByTestId('continue');
    this.finishButton = page.getByTestId('finish');
    this.error = page.getByTestId('error');
    this.itemNames = page.getByTestId('cart-list').getByTestId('inventory-item-name');
    this.subtotal = page.getByTestId('subtotal-label');
    this.tax = page.getByTestId('tax-label');
    this.total = page.getByTestId('total-label');
    this.paymentInfo = page.getByTestId('payment-info-value');
    this.shippingInfo = page.getByTestId('shipping-info-value');
    this.completeHeader = page.getByTestId('complete-header');
    this.completeText = page.getByTestId('complete-text');
  }

  async continue(): Promise<void> {
    await this.continueButton.click();
  }

  async submitCustomer(details: CustomerDetails): Promise<void> {
    await this.firstName.fill(details.firstName);
    await this.lastName.fill(details.lastName);
    await this.postalCode.fill(details.postalCode);
    await this.continue();
    await this.page.waitForURL('**/checkout-step-two.html');
  }

  async finish(): Promise<void> {
    await this.finishButton.click();
    await this.page.waitForURL('**/checkout-complete.html');
  }
}
