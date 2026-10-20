import { authFailureSchema, authSuccessSchema, parseContract } from '../../src/api/schemas';
import { readJson } from '../../src/api/json';
import { env } from '../../src/config/env';
import { expect, test } from '../../src/fixtures/api.fixture';

test.describe('Auth token', { tag: '@api' }, () => {
  test('issues a token for valid credentials', async ({ bookingClient }) => {
    const response = await bookingClient.authenticate(env.apiUsername, env.apiPassword);

    expect(response.status()).toBe(200);
    const body = parseContract(authSuccessSchema, await readJson(response), 'Auth success');
    expect(body.token.length).toBeGreaterThan(0);
  });

  test('returns the published failure contract for bad credentials', async ({ bookingClient }) => {
    // Restful Booker answers a failed login with HTTP 200 and a reason field.
    const response = await bookingClient.authenticate(env.apiUsername, 'wrong-password');

    expect(response.status()).toBe(200);
    parseContract(authFailureSchema, await readJson(response), 'Auth failure');
  });
});
