import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { Booking } from '../data/bookings';

const jsonHeaders = {
  Accept: 'application/json',
};

export class BookingClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseURL: string,
  ) {}

  ping(): Promise<APIResponse> {
    return this.request.get(`${this.baseURL}/ping`);
  }

  authenticate(username: string, password: string): Promise<APIResponse> {
    return this.request.post(`${this.baseURL}/auth`, {
      data: { username, password },
    });
  }

  createBooking(booking: unknown): Promise<APIResponse> {
    return this.request.post(`${this.baseURL}/booking`, {
      headers: jsonHeaders,
      data: booking,
    });
  }

  getBooking(id: number): Promise<APIResponse> {
    return this.request.get(`${this.baseURL}/booking/${id}`, {
      headers: jsonHeaders,
    });
  }

  listBookings(): Promise<APIResponse> {
    return this.request.get(`${this.baseURL}/booking`, {
      headers: jsonHeaders,
    });
  }

  findBookings(firstname: string, lastname: string): Promise<APIResponse> {
    return this.request.get(`${this.baseURL}/booking`, {
      headers: jsonHeaders,
      params: { firstname, lastname },
    });
  }

  replaceBooking(id: number, booking: Booking, token?: string): Promise<APIResponse> {
    return this.request.put(`${this.baseURL}/booking/${id}`, {
      headers: this.authHeaders(token),
      data: booking,
    });
  }

  patchBooking(id: number, patch: Partial<Booking>, token?: string): Promise<APIResponse> {
    return this.request.patch(`${this.baseURL}/booking/${id}`, {
      headers: this.authHeaders(token),
      data: patch,
    });
  }

  deleteBooking(id: number, token?: string): Promise<APIResponse> {
    return this.request.delete(`${this.baseURL}/booking/${id}`, {
      headers: this.authHeaders(token),
    });
  }

  private authHeaders(token?: string): Record<string, string> {
    return token ? { ...jsonHeaders, Cookie: `token=${token}` } : jsonHeaders;
  }
}
