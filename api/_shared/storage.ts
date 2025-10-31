// Re-export storage from server, but create a new instance without session store
import { DatabaseStorage, type IStorage } from "../../server/storage";

// Create storage instance (sessionStore won't be used in serverless functions)
export const storage: IStorage = new DatabaseStorage();

