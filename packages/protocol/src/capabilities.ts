import { z } from './zod.js'

export const capabilitiesSchema = z.object({}).strict()

export type Capabilities = z.infer<typeof capabilitiesSchema>
