import { z } from 'zod';

/** Optional API key used when testing a credentialed source. */
export const sourceTestFormSchema = z.object({
  apiKey: z.string().max(512),
});

export type SourceTestFormValues = z.infer<typeof sourceTestFormSchema>;
