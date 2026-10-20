import { loginErrors, users } from '../../src/data/users';
import { expect, test } from '../../src/fixtures/ui.fixture';

test.describe('Login', { tag: '@ui' }, () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test('signs in a standard shopper and opens the inventory', async ({
    loginPage,
    inventoryPage,
  }) => {
    await loginPage.signIn(users.standard.username, users.standard.password);

    await inventoryPage.waitUntilReady();
    await expect(inventoryPage.title).toHaveText('Products');
    await expect(inventoryPage.itemNames).not.toHaveCount(0);
  });

  test('rejects unknown credentials', async ({ page, loginPage }) => {
    await loginPage.signIn(users.invalid.username, users.invalid.password);

    await expect(loginPage.error).toContainText(loginErrors.mismatch);
    await expect(page).toHaveURL(/\/$/);
    await expect(loginPage.username).toBeVisible();
  });

  test('blocks a locked account', async ({ page, loginPage }) => {
    await loginPage.signIn(users.lockedOut.username, users.lockedOut.password);

    await expect(loginPage.error).toContainText(loginErrors.lockedOut);
    await expect(page).toHaveURL(/\/$/);
  });

  test('requires a username', async ({ loginPage }) => {
    await loginPage.signIn('', users.standard.password);

    await expect(loginPage.error).toContainText(loginErrors.usernameRequired);
  });
});
