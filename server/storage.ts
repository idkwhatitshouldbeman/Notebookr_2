import { type Notebook, type InsertNotebook, type Section, type InsertSection } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Notebooks
  getNotebooks(): Promise<Notebook[]>;
  getNotebook(id: string): Promise<Notebook | undefined>;
  createNotebook(notebook: InsertNotebook): Promise<Notebook>;
  updateNotebook(id: string, notebook: Partial<InsertNotebook>): Promise<Notebook | undefined>;
  deleteNotebook(id: string): Promise<void>;
  
  // Sections
  getSectionsByNotebookId(notebookId: string): Promise<Section[]>;
  createSection(section: InsertSection): Promise<Section>;
  updateSection(id: string, content: string): Promise<Section | undefined>;
  deleteSection(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private notebooks: Map<string, Notebook>;
  private sections: Map<string, Section>;

  constructor() {
    this.notebooks = new Map();
    this.sections = new Map();
  }

  async getNotebooks(): Promise<Notebook[]> {
    return Array.from(this.notebooks.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async getNotebook(id: string): Promise<Notebook | undefined> {
    return this.notebooks.get(id);
  }

  async createNotebook(insertNotebook: InsertNotebook): Promise<Notebook> {
    const id = randomUUID();
    const now = new Date();
    const notebook: Notebook = { 
      ...insertNotebook, 
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.notebooks.set(id, notebook);
    return notebook;
  }

  async updateNotebook(id: string, updates: Partial<InsertNotebook>): Promise<Notebook | undefined> {
    const notebook = this.notebooks.get(id);
    if (!notebook) return undefined;
    
    const updated: Notebook = { 
      ...notebook, 
      ...updates,
      updatedAt: new Date(),
    };
    this.notebooks.set(id, updated);
    return updated;
  }

  async deleteNotebook(id: string): Promise<void> {
    this.notebooks.delete(id);
    // Delete associated sections
    Array.from(this.sections.values())
      .filter(s => s.notebookId === id)
      .forEach(s => this.sections.delete(s.id));
  }

  async getSectionsByNotebookId(notebookId: string): Promise<Section[]> {
    return Array.from(this.sections.values())
      .filter(s => s.notebookId === notebookId)
      .sort((a, b) => a.orderIndex.localeCompare(b.orderIndex));
  }

  async createSection(insertSection: InsertSection): Promise<Section> {
    const id = randomUUID();
    const section: Section = { ...insertSection, id };
    this.sections.set(id, section);
    return section;
  }

  async updateSection(id: string, content: string): Promise<Section | undefined> {
    const section = this.sections.get(id);
    if (!section) return undefined;
    
    const updated: Section = { ...section, content };
    this.sections.set(id, updated);
    
    // Update notebook's updatedAt
    const notebook = this.notebooks.get(section.notebookId);
    if (notebook) {
      this.notebooks.set(notebook.id, { ...notebook, updatedAt: new Date() });
    }
    
    return updated;
  }

  async deleteSection(id: string): Promise<void> {
    this.sections.delete(id);
  }
}

export const storage = new MemStorage();
