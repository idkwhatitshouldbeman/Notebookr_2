import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const notebooks = pgTable("notebooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  emoji: text("emoji").notNull().default("📝"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sections = pgTable("sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  notebookId: varchar("notebook_id").notNull().references(() => notebooks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  orderIndex: text("order_index").notNull(),
});

export const insertNotebookSchema = createInsertSchema(notebooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSectionSchema = createInsertSchema(sections).omit({
  id: true,
});

export type InsertNotebook = z.infer<typeof insertNotebookSchema>;
export type Notebook = typeof notebooks.$inferSelect;
export type InsertSection = z.infer<typeof insertSectionSchema>;
export type Section = typeof sections.$inferSelect;
