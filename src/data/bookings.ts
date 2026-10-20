export type Booking = {
  firstname: string;
  lastname: string;
  totalprice: number;
  depositpaid: boolean;
  bookingdates: {
    checkin: string;
    checkout: string;
  };
  additionalneeds?: string;
};

export function buildBooking(overrides: Partial<Booking> = {}): Booking {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  return {
    firstname: `Riley${suffix}`,
    lastname: 'Quinn',
    totalprice: 150,
    depositpaid: true,
    bookingdates: {
      checkin: '2026-12-01',
      checkout: '2026-12-05',
    },
    additionalneeds: 'Breakfast',
    ...overrides,
  };
}
