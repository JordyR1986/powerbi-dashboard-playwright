import { z } from 'zod';

export const bookingSchema = z.object({
  firstname: z.string().min(1),
  lastname: z.string().min(1),
  totalprice: z.number(),
  depositpaid: z.boolean(),
  bookingdates: z.object({
    checkin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkout: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  additionalneeds: z.string().optional(),
});

export const createdBookingSchema = z.object({
  bookingid: z.number().int().positive(),
  booking: bookingSchema,
});

export const authSuccessSchema = z.object({
  token: z.string().min(1),
});

export const authFailureSchema = z.object({
  reason: z.literal('Bad credentials'),
});

export const bookingIdListSchema = z
  .array(
    z.object({
      bookingid: z.number().int().positive(),
    }),
  )
  .min(1);

export function parseContract<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `${label} did not match the contract:\n${details}\nPayload: ${JSON.stringify(data)}`,
    );
  }
  return parsed.data;
}
