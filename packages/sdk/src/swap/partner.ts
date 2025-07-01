import { logger } from "../logger";

// Global variable to store partner code in memory
let partnerCode: string | null = null;

// Define a type for the storage interface
interface StorageInterface {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// Storage key constant
const PARTNER_CODE_KEY = "holdstation_partner_code";

/**
 * Safely check if we're in an environment with localStorage
 * This approach avoids direct window references that cause TypeScript errors
 * @returns The storage object if available, otherwise null
 */
const getStorage = (): StorageInterface | null => {
  try {
    const getLocalStorageObj = new Function('return typeof localStorage !== "undefined" ? localStorage : null');
    const storageObj = getLocalStorageObj();

    if (
      storageObj &&
      typeof storageObj.getItem === "function" &&
      typeof storageObj.setItem === "function" &&
      typeof storageObj.removeItem === "function"
    ) {
      return storageObj;
    }
  } catch (e) {
    // Access might be blocked or we're in a non-browser environment
    logger.debug("Storage is not accessible:", e);
  }
  return null;
};

/**
 * Sets the partner code for tracking purposes
 * @param {string} code - The partner code to set
 * @returns {boolean} True if the code was successfully set
 */
export const setPartnerCode = (code: string): boolean => {
  if (!code || typeof code !== "string") {
    logger.error("Invalid partner code:", code);
    return false;
  }

  // Save to memory
  partnerCode = code;
  logger.debug("Partner code set:", code);

  // Try to persist to storage if available
  try {
    const storage = getStorage();
    if (storage) {
      storage.setItem(PARTNER_CODE_KEY, code);
      logger.debug("Partner code also saved to persistent storage");
    }
  } catch (e) {
    // Silently fail - persistent storage is optional
    logger.debug("Could not save to persistent storage:", e);
  }

  return true;
};

/**
 * Gets the current partner code
 * @returns {string|null} The partner code or null if not set
 */
export const getPartnerCode = (): string | null => {
  // Return from memory if available
  if (partnerCode) {
    return partnerCode;
  }

  // Try to get from persistent storage if available
  try {
    const storage = getStorage();
    if (storage) {
      const storedCode = storage.getItem(PARTNER_CODE_KEY);
      if (storedCode) {
        // Update memory cache
        partnerCode = storedCode;
        logger.debug("Partner code retrieved from persistent storage:", storedCode);
        return storedCode;
      }
    }
  } catch (e) {
    // Silently fail - persistent storage is optional
    logger.debug("Could not read from persistent storage:", e);
  }

  return null;
};

/**
 * Clears the partner code from memory and persistent storage if available
 * @returns {boolean} True if the code was successfully cleared
 */
export const clearPartnerCode = (): boolean => {
  partnerCode = null;

  // Try to remove from persistent storage if available
  try {
    const storage = getStorage();
    if (storage) {
      storage.removeItem(PARTNER_CODE_KEY);
      logger.debug("Partner code removed from persistent storage");
    }
  } catch (e) {
    // Silently fail - persistent storage is optional
    logger.debug("Could not remove from persistent storage:", e);
  }

  return true;
};
