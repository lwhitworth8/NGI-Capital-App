/**
 * Entity Database Service
 * Manages centralized entity data extracted from all documents
 */

import { EntityData } from './documentExtraction';

export class EntityDatabaseService {
  private static STORAGE_KEY = 'entityDatabase';

  /**
   * Get all entity data from the database
   */
  static getAllEntities(): Record<string, Partial<EntityData>> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error loading entity database:', error);
      return {};
    }
  }

  /**
   * Get data for a specific entity
   */
  static getEntityData(entityId: string): Partial<EntityData> {
    const entities = this.getAllEntities();
    return entities[entityId] || {};
  }

  /**
   * Update entity data with new extracted information
   * Merges new data with existing data
   */
  static updateEntityData(entityId: string, newData: Partial<EntityData>): void {
    const entities = this.getAllEntities();
    const existing = entities[entityId] || {};
    
    // Merge new data with existing data
    entities[entityId] = this.mergeEntityData(existing, newData);
    
    // Save to storage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entities));
    
    console.log(`Updated entity database for ${entityId}:`, entities[entityId]);
  }

  /**
   * Merge new entity data with existing data
   * New data takes precedence for non-null values
   */
  private static mergeEntityData(
    existing: Partial<EntityData>,
    newData: Partial<EntityData>
  ): Partial<EntityData> {
    const merged = { ...existing };
    
    // Merge simple fields - new non-null values overwrite existing
    Object.keys(newData).forEach(key => {
      const value = newData[key as keyof EntityData];
      if (value !== undefined && value !== null && value !== '') {
        // For arrays, merge without duplicates
        if (Array.isArray(value) && Array.isArray(merged[key as keyof EntityData])) {
          const existingArray = merged[key as keyof EntityData] as any[];
          const newArray = value as any[];
          merged[key as keyof EntityData] = [...new Set([...existingArray, ...newArray])] as any;
        } 
        // For objects (but not Dates), merge recursively
        else if (
          typeof value === 'object' && 
          !Array.isArray(value) && 
          !(value instanceof Date) &&
          merged[key as keyof EntityData]
        ) {
          merged[key as keyof EntityData] = {
            ...(merged[key as keyof EntityData] as any || {}),
            ...value
          } as any;
        } 
        // For primitives and Dates, overwrite
        else {
          merged[key as keyof EntityData] = value as any;
        }
      }
    });
    
    return merged;
  }

  /**
   * Get specific field value for an entity
   */
  static getEntityField<K extends keyof EntityData>(
    entityId: string,
    field: K
  ): EntityData[K] | undefined {
    const entityData = this.getEntityData(entityId);
    return entityData[field];
  }

  /**
   * Check if entity has required data
   */
  static hasRequiredData(entityId: string): {
    complete: boolean;
    missing: string[];
  } {
    const data = this.getEntityData(entityId);
    const required = ['entityName', 'formationDate', 'ein', 'stateOfFormation'];
    const missing = required.filter(field => !data[field as keyof EntityData]);
    
    return {
      complete: missing.length === 0,
      missing
    };
  }

  /**
   * Clear all entity data (use with caution)
   */
  static clearDatabase(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('Entity database cleared');
  }
}