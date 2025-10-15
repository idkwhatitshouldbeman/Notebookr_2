import { type Notebook, type InsertNotebook, type Section, type InsertSection, type User, type UpsertUser, notebooks, sections, users } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Notebooks
  getNotebooks(userId: string): Promise<Notebook[]>;
  getNotebook(id: string): Promise<Notebook | undefined>;
  createNotebook(notebook: InsertNotebook): Promise<Notebook>;
  updateNotebook(id: string, notebook: Partial<InsertNotebook>): Promise<Notebook | undefined>;
  deleteNotebook(id: string): Promise<void>;
  
  // Sections
  getSection(id: string): Promise<Section | undefined>;
  getSectionsByNotebookId(notebookId: string): Promise<Section[]>;
  createSection(section: InsertSection): Promise<Section>;
  updateSection(id: string, content: string): Promise<Section | undefined>;
  deleteSection(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Notebooks
  async getNotebooks(userId: string): Promise<Notebook[]> {
    return await db.select().from(notebooks).where(eq(notebooks.userId, userId)).orderBy(desc(notebooks.updatedAt));
  }

  async getNotebook(id: string): Promise<Notebook | undefined> {
    const result = await db.select().from(notebooks).where(eq(notebooks.id, id));
    return result[0];
  }

  async createNotebook(insertNotebook: InsertNotebook): Promise<Notebook> {
    const result = await db.insert(notebooks).values(insertNotebook).returning();
    return result[0];
  }

  async updateNotebook(id: string, updates: Partial<InsertNotebook>): Promise<Notebook | undefined> {
    const result = await db.update(notebooks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(notebooks.id, id))
      .returning();
    return result[0];
  }

  async deleteNotebook(id: string): Promise<void> {
    await db.delete(notebooks).where(eq(notebooks.id, id));
  }

  // Sections
  async getSection(id: string): Promise<Section | undefined> {
    const [section] = await db.select().from(sections).where(eq(sections.id, id));
    return section;
  }

  async getSectionsByNotebookId(notebookId: string): Promise<Section[]> {
    return await db.select()
      .from(sections)
      .where(eq(sections.notebookId, notebookId))
      .orderBy(asc(sections.orderIndex));
  }

  async createSection(insertSection: InsertSection): Promise<Section> {
    const result = await db.insert(sections).values(insertSection).returning();
    return result[0];
  }

  async updateSection(id: string, content: string): Promise<Section | undefined> {
    const result = await db.update(sections)
      .set({ content })
      .where(eq(sections.id, id))
      .returning();
    
    if (result[0]) {
      await db.update(notebooks)
        .set({ updatedAt: new Date() })
        .where(eq(notebooks.id, result[0].notebookId));
    }
    
    return result[0];
  }

  async deleteSection(id: string): Promise<void> {
    await db.delete(sections).where(eq(sections.id, id));
  }
}

export const storage = new DatabaseStorage();
