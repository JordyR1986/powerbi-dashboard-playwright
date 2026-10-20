import { expect, test as base } from '@playwright/test';
import { BookingClient } from '../api/booking-client';
import { readJson } from '../api/json';
import { authSuccessSchema, createdBookingSchema, parseContract } from '../api/schemas';
import { env } from '../config/env';
import { buildBooking, type Booking } from '../data/bookings';

type CreatedBooking = {
  id: number;
  payload: Booking;
};

type ApiFixtures = {
  bookingClient: BookingClient;
  authToken: string;
  createdBooking: CreatedBooking;
};

export const test = base.extend<ApiFixtures>({
  bookingClient: async ({ request }, use) => {
    await use(new BookingClient(request, env.apiBaseURL));
  },

  authToken: async ({ bookingClient }, use) => {
    const response = await bookingClient.authenticate(env.apiUsername, env.apiPassword);
    expect(response.status()).toBe(200);
    const body = parseContract(authSuccessSchema, await readJson(response), 'Auth token');
    await use(body.token);
  },

  createdBooking: async ({ bookingClient, authToken }, use) => {
    const payload = buildBooking();
    const response = await bookingClient.createBooking(payload);
    expect(response.ok()).toBeTruthy();
    const body = parseContract(createdBookingSchema, await readJson(response), 'Created booking');

    await use({ id: body.bookingid, payload });

    const cleanup = await bookingClient.deleteBooking(body.bookingid, authToken);
    // 201 is a fresh delete. 405 means the test already deleted the booking.
    expect([201, 405]).toContain(cleanup.status());
  },
});

export { expect };
