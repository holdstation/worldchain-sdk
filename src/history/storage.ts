export interface PersistentStorage {
  save(key: string, objectOrPrimitive: any): Promise<void>;
  get(key: string): Promise<string>;
}
