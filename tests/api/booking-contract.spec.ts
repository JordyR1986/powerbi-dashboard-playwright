import { bookingIdListSchema, parseContract } from '../../src/api/schemas';
import { readJson } from '../../src/api/json';
import { buildBooking } from '../../src/data/bookings';
import { expect, test } from '../../src/fixtures/api.fixture';

test.describe('Booking contract', { tag: '@api' }, () => {
  test('answers the health check', async ({ bookingClient }) => {
    const response = await bookingClient.ping();

    expect(response.status()).toBe(201);
    expect(await response.text()).toBe('Created');
  });

  test('lists booking ids', async ({ bookingClient }) => {
    const response = await bookingClient.listBookings();

    expect(response.ok()).toBeTruthy();
    parseContract(bookingIdListSchema, await readJson(response), 'Booking list');
  });

  test('returns not found for an unknown booking', async ({ bookingClient }) => {
    const response = await bookingClient.getBooking(999_999_999);

    expect(response.status()).toBe(404);
  });

  test('rejects an empty booking payload', async ({ bookingClient }) => {
    // The practice API currently responds with 500 rather than a validation status.
    const response = await bookingClient.createBooking({});

    expect(response.status()).toBe(500);
    expect(await response.text()).toContain('Internal Server Error');
  });

  test('refuses to replace a booking without a token', async ({
    bookingClient,
    createdBooking,
  }) => {
    const response = await bookingClient.replaceBooking(createdBooking.id, buildBooking());

    expect(response.status()).toBe(403);
  });

  test('refuses to delete a booking without a token', async ({ bookingClient, createdBooking }) => {
    const response = await bookingClient.deleteBooking(createdBooking.id);

    expect(response.status()).toBe(403);

    const stillThere = await bookingClient.getBooking(createdBooking.id);
    expect(stillThere.ok()).toBeTruthy();
  });
});
