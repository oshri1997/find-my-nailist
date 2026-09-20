import { z } from 'zod'

// Mirrors src/types/index.ts's AnnouncementRichDoc — a small, flat whitelist
// of node/mark types (no nested lists, images, links or arbitrary HTML) so
// the renderer never needs to sanitize anything: it only ever sees shapes
// this schema already validated.
const markSchema = z.object({ type: z.enum(['bold', 'italic']) }).strict()

const textNodeSchema = z.object({
  type: z.literal('text'),
  text: z.string().min(1).max(500),
  marks: z.array(markSchema).max(4).optional(),
}).strict()

const paragraphSchema = z.object({
  type: z.literal('paragraph'),
  content: z.array(textNodeSchema).max(200).optional(),
}).strict()

const headingSchema = z.object({
  type: z.literal('heading'),
  attrs: z.object({ level: z.union([z.literal(2), z.literal(3)]) }).strict(),
  content: z.array(textNodeSchema).max(200).optional(),
}).strict()

const listItemSchema = z.object({
  type: z.literal('listItem'),
  content: z.array(paragraphSchema).min(1).max(20),
}).strict()

const bulletListSchema = z.object({
  type: z.literal('bulletList'),
  content: z.array(listItemSchema).min(1).max(50),
}).strict()

const orderedListSchema = z.object({
  type: z.literal('orderedList'),
  content: z.array(listItemSchema).min(1).max(50),
}).strict()

const blockSchema = z.union([paragraphSchema, headingSchema, bulletListSchema, orderedListSchema])

export const announcementRichBodySchema = z.object({
  type: z.literal('doc'),
  content: z.array(blockSchema).min(1).max(100),
}).strict()

// A plain string is the legacy format — the create route still accepts it
// (a rich-text announcement is not mandatory), and every existing published
// announcement is stored this way.
export const announcementBodySchema = z.union([
  z.string().trim().min(1, 'תוכן נדרש').max(2000),
  announcementRichBodySchema,
])
