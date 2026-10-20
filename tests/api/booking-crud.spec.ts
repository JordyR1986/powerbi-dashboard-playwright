import {
  bookingIdListSchema,
  bookingSchema,
  createdBookingSchema,
  parseContract,
} from '../../src/api/schemas';
import { readJson } from '../../src/api/json';
import { buildBooking } from '../../src/data/bookings';
import { expect, test } from '../../src/fixtures/api.fixture';

test.describe('Booking CRUD', { tag: '@api' }, () => {
  test('creates, reads, updates, patches, and deletes a booking', async ({
    bookingClient,
    authToken,
  }) => {
    const createdPayload = buildBooking();
    const createdResponse = await bookingClient.createBooking(createdPayload);
    expect(createdResponse.status()).toBe(200);
    const created = parseContract(
      createdBookingSchema,
      await readJson(createdResponse),
      'Create booking',
    );
    expect(created.booking).toMatchObject(createdPayload);

    const bookingId = created.bookingid;

    try {
      await test.step('read the booking back', async () => {
        const response = await bookingClient.getBooking(bookingId);
        expect(response.status()).toBe(200);
        const body = parseContract(bookingSchema, await readJson(response), 'Get booking');
        expect(body).toMatchObject(createdPayload);
      });

      const replacement = buildBooking({
        firstname: `${createdPayload.firstname}Updated`,
        totalprice: 240,
        depositpaid: false,
        additionalneeds: 'Lunch',
      });

      await test.step('replace the booking', async () => {
        const response = await bookingClient.replaceBooking(bookingId, replacement, authToken);
        expect(response.status()).toBe(200);
        const body = parseContract(bookingSchema, await readJson(response), 'Replace booking');
        expect(body).toMatchObject(replacement);
      });

      const patchedName = `${createdPayload.firstname}Patched`;

      await test.step('patch the first name', async () => {
        const response = await bookingClient.patchBooking(
          bookingId,
          { firstname: patchedName },
          authToken,
        );
        expect(response.status()).toBe(200);
        const body = parseContract(bookingSchema, await readJson(response), 'Patch booking');
        expect(body.firstname).toBe(patchedName);
        expect(body.lastname).toBe(replacement.lastname);
        expect(body.totalprice).toBe(replacement.totalprice);
        expect(body.depositpaid).toBe(replacement.depositpaid);
      });

      await test.step('find the booking by name', async () => {
        const response = await bookingClient.findBookings(patchedName, replacement.lastname);
        expect(response.status()).toBe(200);
        const matches = parseContract(
          bookingIdListSchema,
          await readJson(response),
          'Booking search',
        );
        expect(matches).toContainEqual({ bookingid: bookingId });
      });

      await test.step('delete the booking', async () => {
        const response = await bookingClient.deleteBooking(bookingId, authToken);
        expect(response.status()).toBe(201);
        expect(await response.text()).toBe('Created');

        const missing = await bookingClient.getBooking(bookingId);
        expect(missing.status()).toBe(404);
      });
    } finally {
      await bookingClient.deleteBooking(bookingId, authToken);
    }
  });
});
