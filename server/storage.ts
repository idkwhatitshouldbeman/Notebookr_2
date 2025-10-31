import { type Notebook, type InsertNotebook, type Section, type InsertSection, type SectionVersion, type User, type InsertUser, type Message, type InsertMessage, type Transaction, type InsertTransaction, notebooks, sections, sectionVersions, users, messages, transactions } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations (required for standalone auth)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserAiModel(userId: string, model: string): Promise<void>;
  
  // Session store
  sessionStore: session.Store;
  
  // Notebooks
  getNotebooks(userId: string): Promise<Notebook[]>;
  getNotebook(id: string): Promise<Notebook | undefined>;
  createNotebook(notebook: InsertNotebook & { userId: string }): Promise<Notebook>;
  updateNotebook(id: string, notebook: Partial<InsertNotebook>): Promise<Notebook | undefined>;
  updateNotebookAiMemory(id: string, aiMemory: any): Promise<Notebook | undefined>;
  deleteNotebook(id: string): Promise<void>;
  
  // Sections
  getSection(id: string): Promise<Section | undefined>;
  getSectionsByNotebookId(notebookId: string): Promise<Section[]>;
  createSection(section: InsertSection): Promise<Section>;
  updateSection(id: string, content: string): Promise<Section | undefined>;
  deleteSection(id: string): Promise<void>;
  
  // Section Versions
  getSectionVersions(sectionId: string): Promise<SectionVersion[]>;
  restoreSectionVersion(sectionId: string, versionId: string): Promise<Section | undefined>;
  
  // Messages
  getMessagesByNotebookId(notebookId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Credits and Transactions
  addCredits(userId: string, credits: number, stripePaymentId: string, description: string): Promise<void>;
  deductCredits(userId: string, credits: number, description: string): Promise<boolean>;
  getUserTransactions(userId: string): Promise<Transaction[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ pool, createTableIfMissing: false, tableName: "sessions" });
  }

  // User operations (required for standalone auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
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

  async createNotebook(insertNotebook: InsertNotebook & { userId: string }): Promise<Notebook> {
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

  async updateNotebookAiMemory(id: string, aiMemory: any): Promise<Notebook | undefined> {
    const result = await db.update(notebooks)
      .set({ aiMemory, updatedAt: new Date() })
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
    // Get current section to save its content as a version
    const currentSection = await this.getSection(id);
    if (currentSection && currentSection.content) {
      // Save current content as a version before updating
      await db.insert(sectionVersions).values({
        sectionId: id,
        content: currentSection.content,
      });
    }
    
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

  // Section Versions
  async getSectionVersions(sectionId: string): Promise<SectionVersion[]> {
    return await db.select()
      .from(sectionVersions)
      .where(eq(sectionVersions.sectionId, sectionId))
      .orderBy(desc(sectionVersions.createdAt));
  }

  async restoreSectionVersion(sectionId: string, versionId: string): Promise<Section | undefined> {
    // Get the version to restore
    const [version] = await db.select()
      .from(sectionVersions)
      .where(eq(sectionVersions.id, versionId));
    
    if (!version) {
      return undefined;
    }

    // Update the section with the version's content (this will also save current content as a new version)
    return await this.updateSection(sectionId, version.content);
  }

  // Messages
  async getMessagesByNotebookId(notebookId: string): Promise<Message[]> {
    return await db.select()
      .from(messages)
      .where(eq(messages.notebookId, notebookId))
      .orderBy(asc(messages.createdAt));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(insertMessage).returning();
    return result[0];
  }

  // Credits and Transactions
  async getUserById(id: string): Promise<User | undefined> {
    return await this.getUser(id);
  }

  async updateUserAiModel(userId: string, model: string): Promise<void> {
    await db.update(users)
      .set({ selectedAiModel: model })
      .where(eq(users.id, userId));
  }

  async addCredits(userId: string, credits: number, stripePaymentId: string, description: string): Promise<void> {
    // Add credits to user
    await db.update(users)
      .set({ credits: sql`${users.credits} + ${credits}` })
      .where(eq(users.id, userId));
    
    // Record transaction
    await db.insert(transactions).values({
      userId,
      type: "purchase",
      amount: credits,
      stripePaymentId,
      description,
    });
  }

  async deductCredits(userId: string, credits: number, description: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user || user.credits < credits) {
      return false;
    }

    // Deduct credits
    await db.update(users)
      .set({ credits: sql`${users.credits} - ${credits}` })
      .where(eq(users.id, userId));
    
    // Record transaction
    await db.insert(transactions).values({
      userId,
      type: "deduction",
      amount: -credits,
      description,
    });

    // If credits hit zero, auto-downgrade to free tier
    const updatedUser = await this.getUserById(userId);
    if (updatedUser && updatedUser.credits <= 0) {
      await this.updateUserAiModel(userId, "free");
    }

    return true;
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return await db.select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }
}

export const storage = new DatabaseStorage();
