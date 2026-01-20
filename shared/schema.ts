import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey(),
  conversationId: text("conversation_id"),
  conversationUrl: text("conversation_url"),
  status: text("status"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;
