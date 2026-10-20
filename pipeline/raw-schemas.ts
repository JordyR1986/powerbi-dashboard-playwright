import { z } from 'zod';

/** run-meta.json, written by the "Merge reports" job in CI. */
export const runMetaSchema = z.object({
  run_id: z.string().regex(/^\d+$/),
  run_attempt: z.string().default('1'),
  run_number: z.string().optional(),
  event: z.string(),
  ref: z.string(),
  sha: z.string().regex(/^[0-9a-f]{7,40}$/),
  run_url: z.url(),
  result: z.string().optional(),
  playwright: z.string().optional(),
  image: z.string().optional(),
  merged_at: z.string().optional(),
  shard_count: z.number().int().positive().optional(),
});
export type RunMeta = z.infer<typeof runMetaSchema>;

/** The parts of Playwright's JSON reporter output the pipeline relies on. */
const errorSchema = z.object({ message: z.string().optional() }).loose();

const attemptSchema = z.object({
  retry: z.number().int().nonnegative(),
  status: z.string(),
  duration: z.number(),
  startTime: z.string(),
  errors: z.array(errorSchema).default([]),
  error: errorSchema.optional(),
});
export type Attempt = z.infer<typeof attemptSchema>;

const testSchema = z.object({
  projectName: z.string(),
  expectedStatus: z.string(),
  status: z.enum(['expected', 'unexpected', 'flaky', 'skipped']),
  results: z.array(attemptSchema),
});

const specSchema = z.object({
  title: z.string(),
  file: z.string(),
  tags: z.array(z.string()).default([]),
  tests: z.array(testSchema),
});
export type Spec = z.infer<typeof specSchema>;

export type Suite = {
  title: string;
  file?: string;
  specs?: Spec[];
  suites?: Suite[];
};

const suiteSchema: z.ZodType<Suite> = z.lazy(() =>
  z.object({
    title: z.string(),
    file: z.string().optional(),
    specs: z.array(specSchema).optional(),
    suites: z.array(suiteSchema).optional(),
  }),
);

export const playwrightReportSchema = z.object({
  suites: z.array(suiteSchema),
  stats: z.object({
    startTime: z.string(),
    duration: z.number(),
    expected: z.number(),
    unexpected: z.number(),
    flaky: z.number(),
    skipped: z.number(),
  }),
});
export type PlaywrightReport = z.infer<typeof playwrightReportSchema>;
