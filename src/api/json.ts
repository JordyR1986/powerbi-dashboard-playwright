import type { APIResponse } from '@playwright/test';

export async function readJson(response: APIResponse): Promise<unknown> {
  return (await response.json()) as unknown;
}
