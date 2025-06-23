// Database abstraction layer - currently uses localStorage but designed for easy migration

import { WorkoutTemplate, WorkoutInstance, TrainingBlock } from "./types";
import { UserResource } from "@clerk/types";
import { v5 as uuidv5 } from "uuid";

const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

// Export the UUID generator function
export const generateUserIdAsUuid = (clerkUserId: string): string => {
  return uuidv5(clerkUserId, NAMESPACE);
};

export interface CalendarAssignment {
  id: string;
  clerk_user_id: string;
  template_id: string;
  assigned_date: string;
  completed: boolean;
  workout_instance_id?: string;
  created_at: string;
}

export interface ExerciseLibraryEntry {
  id: string;
  clerk_user_id: string;
  exercise_name: string;
  equipment?: string;
  category?: string;
  last_used?: string;
  use_count: number;
  created_at: string;
}

// Database interface for future implementations
export interface IDatabase {
  // Training Blocks
  getTrainingBlocks(userId: string): Promise<TrainingBlock[]>;
  getActiveTrainingBlock(userId: string): Promise<TrainingBlock | null>;
  saveTrainingBlock(block: TrainingBlock, user: UserResource): Promise<TrainingBlock>;
  updateTrainingBlock(blockId: string, updates: Partial<TrainingBlock>, user: UserResource): Promise<TrainingBlock>;
  deleteTrainingBlock(blockId: string, user: UserResource): Promise<void>;

  // Workout Templates
  getWorkoutTemplates(userId: string): Promise<WorkoutTemplate[]>;
  getWorkoutTemplate(templateId: string, userId: string): Promise<WorkoutTemplate | null>;
  saveWorkoutTemplate(template: WorkoutTemplate, user: UserResource): Promise<WorkoutTemplate>;
  updateWorkoutTemplate(templateId: string, updates: Partial<WorkoutTemplate>, user: UserResource): Promise<WorkoutTemplate>;
  deleteWorkoutTemplate(templateId: string, user: UserResource): Promise<void>;

  // Workout Instances
  getWorkoutInstances(userId: string, dateRange?: { start: string; end: string }): Promise<WorkoutInstance[]>;
  getWorkoutInstance(instanceId: string, userId: string): Promise<WorkoutInstance | null>;
  saveWorkoutInstance(instance: WorkoutInstance, user: UserResource): Promise<WorkoutInstance>;
  updateWorkoutInstance(instanceId: string, updates: Partial<WorkoutInstance>, user: UserResource): Promise<WorkoutInstance>;
  deleteWorkoutInstance(instanceId: string, user: UserResource): Promise<void>;

  // Calendar
  getCalendarAssignments(userId: string, dateRange?: { start: string; end: string }): Promise<CalendarAssignment[]>;
  saveCalendarAssignment(assignment: CalendarAssignment, user: UserResource): Promise<CalendarAssignment>;
  deleteCalendarAssignment(assignmentId: string, user: UserResource): Promise<void>;
  bulkSaveCalendarAssignments(assignments: CalendarAssignment[], user: UserResource): Promise<CalendarAssignment[]>;

  // Exercise Library
  getExerciseLibrary(userId: string): Promise<ExerciseLibraryEntry[]>;
  updateExerciseUsage(exerciseName: string, user: UserResource): Promise<void>;
}

// LocalStorage implementation (removed - using Supabase only)
/*
export class LocalStorageDB implements IDatabase {
  private generateUserId(clerkUserId: string): string {
    return uuidv5(clerkUserId, NAMESPACE);
  }

  private getStorageKey(key: string, userId: string): string {
    return `${key}_${userId}`;
  }

  private getFromStorage<T>(key: string, userId: string): T[] {
    const storageKey = this.getStorageKey(key, userId);
    const data = localStorage.getItem(storageKey);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(`Error parsing ${key} from localStorage:`, e);
      return [];
    }
  }

  private saveToStorage<T>(key: string, userId: string, data: T[]): void {
    const storageKey = this.getStorageKey(key, userId);
    localStorage.setItem(storageKey, JSON.stringify(data));
  }

  // Training Blocks
  async getTrainingBlocks(userId: string): Promise<TrainingBlock[]> {
    return this.getFromStorage<TrainingBlock>(STORAGE_KEYS.TRAINING_BLOCKS, userId);
  }

  async getActiveTrainingBlock(userId: string): Promise<TrainingBlock | null> {
    const blocks = await this.getTrainingBlocks(userId);
    return blocks.find(b => b.isActive) || null;
  }

  async saveTrainingBlock(block: TrainingBlock, user: UserResource): Promise<TrainingBlock> {
    const userId = user.id;
    const blocks = await this.getTrainingBlocks(userId);
    
    const blockToSave: TrainingBlock = {
      ...block,
      id: block.id || uuidv5(`${userId}-${block.name}-${Date.now()}`, NAMESPACE),
      isActive: block.isActive ?? true
    };

    // If this is set as active, deactivate others
    if (blockToSave.isActive) {
      blocks.forEach(b => b.isActive = false);
    }

    const existingIndex = blocks.findIndex(b => b.id === blockToSave.id);
    if (existingIndex !== -1) {
      blocks[existingIndex] = blockToSave;
    } else {
      blocks.push(blockToSave);
    }

    this.saveToStorage(STORAGE_KEYS.TRAINING_BLOCKS, userId, blocks);
    return blockToSave;
  }

  async updateTrainingBlock(blockId: string, updates: Partial<TrainingBlock>, user: UserResource): Promise<TrainingBlock> {
    const userId = user.id;
    const blocks = await this.getTrainingBlocks(userId);
    const blockIndex = blocks.findIndex(b => b.id === blockId);
    
    if (blockIndex === -1) {
      throw new Error("Training block not found");
    }

    blocks[blockIndex] = { ...blocks[blockIndex], ...updates };
    this.saveToStorage(STORAGE_KEYS.TRAINING_BLOCKS, userId, blocks);
    return blocks[blockIndex];
  }

  async deleteTrainingBlock(blockId: string, user: UserResource): Promise<void> {
    const userId = user.id;
    const blocks = await this.getTrainingBlocks(userId);
    const filtered = blocks.filter(b => b.id !== blockId);
    this.saveToStorage(STORAGE_KEYS.TRAINING_BLOCKS, userId, filtered);
  }

  // Workout Templates
  async getWorkoutTemplates(userId: string): Promise<WorkoutTemplate[]> {
    return this.getFromStorage<WorkoutTemplate>(STORAGE_KEYS.WORKOUT_TEMPLATES, userId);
  }

  async getWorkoutTemplate(templateId: string, userId: string): Promise<WorkoutTemplate | null> {
    const templates = await this.getWorkoutTemplates(userId);
    return templates.find(t => t.id === templateId) || null;
  }

  async saveWorkoutTemplate(template: WorkoutTemplate, user: UserResource): Promise<WorkoutTemplate> {
    const userId = user.id;
    const templates = await this.getWorkoutTemplates(userId);
    
    const templateToSave: WorkoutTemplate = {
      ...template,
      id: template.id || uuidv5(`${userId}-${template.workout_name}`, NAMESPACE),
      user_id: this.generateUserId(userId),
      clerk_user_id: userId,
      created_at: template.created_at || new Date().toISOString()
    };

    const existingIndex = templates.findIndex(t => t.id === templateToSave.id);
    if (existingIndex !== -1) {
      templates[existingIndex] = templateToSave;
    } else {
      templates.push(templateToSave);
    }

    this.saveToStorage(STORAGE_KEYS.WORKOUT_TEMPLATES, userId, templates);
    return templateToSave;
  }

  async updateWorkoutTemplate(templateId: string, updates: Partial<WorkoutTemplate>, user: UserResource): Promise<WorkoutTemplate> {
    const userId = user.id;
    const templates = await this.getWorkoutTemplates(userId);
    const templateIndex = templates.findIndex(t => t.id === templateId);
    
    if (templateIndex === -1) {
      throw new Error("Workout template not found");
    }

    templates[templateIndex] = { ...templates[templateIndex], ...updates };
    this.saveToStorage(STORAGE_KEYS.WORKOUT_TEMPLATES, userId, templates);
    return templates[templateIndex];
  }

  async deleteWorkoutTemplate(templateId: string, user: UserResource): Promise<void> {
    const userId = user.id;
    const templates = await this.getWorkoutTemplates(userId);
    const filtered = templates.filter(t => t.id !== templateId);
    this.saveToStorage(STORAGE_KEYS.WORKOUT_TEMPLATES, userId, filtered);
  }

  // Workout Instances
  async getWorkoutInstances(userId: string, dateRange?: { start: string; end: string }): Promise<WorkoutInstance[]> {
    const instances = this.getFromStorage<WorkoutInstance>(STORAGE_KEYS.WORKOUT_INSTANCES, userId);
    
    if (!dateRange) return instances;
    
    return instances.filter(instance => {
      const instanceDate = new Date(instance.scheduled_date);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      return instanceDate >= startDate && instanceDate <= endDate;
    });
  }

  async getWorkoutInstance(instanceId: string, userId: string): Promise<WorkoutInstance | null> {
    const instances = await this.getWorkoutInstances(userId);
    return instances.find(i => i.id === instanceId) || null;
  }

  async saveWorkoutInstance(instance: WorkoutInstance, user: UserResource): Promise<WorkoutInstance> {
    const userId = user.id;
    const instances = await this.getWorkoutInstances(userId);
    
    const instanceToSave: WorkoutInstance = {
      ...instance,
      id: instance.id || uuidv5(`${userId}-${instance.workout_name}-${instance.scheduled_date}`, NAMESPACE),
      user_id: this.generateUserId(userId),
      clerk_user_id: userId,
      created_at: instance.created_at || new Date().toISOString()
    };

    const existingIndex = instances.findIndex(i => i.id === instanceToSave.id);
    if (existingIndex !== -1) {
      instances[existingIndex] = instanceToSave;
    } else {
      instances.push(instanceToSave);
    }

    this.saveToStorage(STORAGE_KEYS.WORKOUT_INSTANCES, userId, instances);
    return instanceToSave;
  }

  async updateWorkoutInstance(instanceId: string, updates: Partial<WorkoutInstance>, user: UserResource): Promise<WorkoutInstance> {
    const userId = user.id;
    const instances = await this.getWorkoutInstances(userId);
    const instanceIndex = instances.findIndex(i => i.id === instanceId);
    
    if (instanceIndex === -1) {
      throw new Error("Workout instance not found");
    }

    instances[instanceIndex] = { ...instances[instanceIndex], ...updates };
    this.saveToStorage(STORAGE_KEYS.WORKOUT_INSTANCES, userId, instances);
    return instances[instanceIndex];
  }

  async deleteWorkoutInstance(instanceId: string, user: UserResource): Promise<void> {
    const userId = user.id;
    const instances = await this.getWorkoutInstances(userId);
    const filtered = instances.filter(i => i.id !== instanceId);
    this.saveToStorage(STORAGE_KEYS.WORKOUT_INSTANCES, userId, filtered);
  }

  // Calendar
  async getCalendarAssignments(userId: string, dateRange?: { start: string; end: string }): Promise<CalendarAssignment[]> {
    const assignments = this.getFromStorage<CalendarAssignment>(STORAGE_KEYS.CALENDAR_ASSIGNMENTS, userId);
    
    if (!dateRange) return assignments;
    
    return assignments.filter(assignment => {
      const assignmentDate = new Date(assignment.assigned_date);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      return assignmentDate >= startDate && assignmentDate <= endDate;
    });
  }

  async saveCalendarAssignment(assignment: CalendarAssignment, user: UserResource): Promise<CalendarAssignment> {
    const userId = user.id;
    const assignments = await this.getCalendarAssignments(userId);
    
    const assignmentToSave: CalendarAssignment = {
      ...assignment,
      id: assignment.id || uuidv5(`${userId}-${assignment.template_id}-${assignment.assigned_date}`, NAMESPACE),
      clerk_user_id: userId,
      created_at: assignment.created_at || new Date().toISOString()
    };

    // Remove any existing assignment for the same template and date
    const filtered = assignments.filter(a => 
      !(a.template_id === assignmentToSave.template_id && a.assigned_date === assignmentToSave.assigned_date)
    );
    
    filtered.push(assignmentToSave);
    this.saveToStorage(STORAGE_KEYS.CALENDAR_ASSIGNMENTS, userId, filtered);
    return assignmentToSave;
  }

  async deleteCalendarAssignment(assignmentId: string, user: UserResource): Promise<void> {
    const userId = user.id;
    const assignments = await this.getCalendarAssignments(userId);
    const filtered = assignments.filter(a => a.id !== assignmentId);
    this.saveToStorage(STORAGE_KEYS.CALENDAR_ASSIGNMENTS, userId, filtered);
  }

  async bulkSaveCalendarAssignments(assignments: CalendarAssignment[], user: UserResource): Promise<CalendarAssignment[]> {
    const savedAssignments: CalendarAssignment[] = [];
    for (const assignment of assignments) {
      const saved = await this.saveCalendarAssignment(assignment, user);
      savedAssignments.push(saved);
    }
    return savedAssignments;
  }

  // Exercise Library
  async getExerciseLibrary(userId: string): Promise<ExerciseLibraryEntry[]> {
    return this.getFromStorage<ExerciseLibraryEntry>(STORAGE_KEYS.EXERCISE_LIBRARY, userId);
  }

  async updateExerciseUsage(exerciseName: string, user: UserResource): Promise<void> {
    const userId = user.id;
    const library = await this.getExerciseLibrary(userId);
    
    const existingIndex = library.findIndex(e => e.exercise_name.toLowerCase() === exerciseName.toLowerCase());
    
    if (existingIndex !== -1) {
      library[existingIndex].use_count += 1;
      library[existingIndex].last_used = new Date().toISOString();
    } else {
      library.push({
        id: uuidv5(`${userId}-${exerciseName}`, NAMESPACE),
        clerk_user_id: userId,
        exercise_name: exerciseName,
        use_count: 1,
        last_used: new Date().toISOString(),
        created_at: new Date().toISOString()
      });
    }
    
    this.saveToStorage(STORAGE_KEYS.EXERCISE_LIBRARY, userId, library);
  }
}
*/

// Import Supabase implementation
import { SupabaseDB } from './supabaseDatabase';

// Log environment variables for debugging
console.log('Environment variables check:');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_KEY:', import.meta.env.VITE_SUPABASE_KEY ? 'Present' : 'Missing');

// Check for required Supabase environment variables
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_KEY) {
  throw new Error(
    'Missing required Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_KEY'
  );
}

// Always use Supabase - no localStorage fallback
export const db = new SupabaseDB(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

// Log which database is being used
console.log('Using Supabase database');
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_KEY ? 'Set' : 'Not set');
console.log('Build timestamp:', new Date().toISOString());

// Initialize Clerk token for Supabase
export const initializeDatabase = (getToken: () => Promise<string | null>) => {
  db.setClerkTokenGetter(getToken);
};

// Utility functions that don't depend on database

// Calculate next weight based on RIR
export const calculateNextWeight = (
  currentWeight: number,
  _currentReps: number,
  currentRIR: number,
  targetRIR: number = 2
): number => {
  // Basic progressive overload calculation
  // If RIR is higher than target, increase weight
  // If RIR is lower than target, decrease weight
  
  const rirDifference = currentRIR - targetRIR;
  
  // Each RIR roughly equals 2.5-5% of weight
  const percentageChange = rirDifference * 0.025;
  const weightChange = currentWeight * percentageChange;
  
  // Round to nearest 2.5 lbs
  const newWeight = currentWeight + weightChange;
  return Math.round(newWeight / 2.5) * 2.5;
};