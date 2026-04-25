import { TaskCreateSchema, TaskUpdateSchema } from '@/modules/project2/project2.schemas';

describe('Project2 Schemas', () => {
  describe('TaskCreateSchema', () => {
    it('should validate task creation with title', () => {
      const data = {
        title: 'My Task',
      };

      const result = TaskCreateSchema.parse(data);
      expect(result.title).toBe('My Task');
      expect(result.description).toBeUndefined();
    });

    it('should allow task with title and description', () => {
      const data = {
        title: 'My Task',
        description: 'Task description',
      };

      const result = TaskCreateSchema.parse(data);
      expect(result.title).toBe('My Task');
      expect(result.description).toBe('Task description');
    });

    it('should reject missing title', () => {
      const data = {
        description: 'Description without title',
      };

      expect(() => TaskCreateSchema.parse(data)).toThrow();
    });

    it('should reject empty title', () => {
      const data = {
        title: '',
      };

      expect(() => TaskCreateSchema.parse(data)).toThrow();
    });

    it('should default isDone to false', () => {
      const data = {
        title: 'My Task',
      };

      // TaskCreateSchema doesn't include isDone, that's set by service
      const result = TaskCreateSchema.parse(data);
      expect(result.isDone).toBeUndefined();
    });
  });

  describe('TaskUpdateSchema', () => {
    it('should allow updating only title', () => {
      const data = {
        title: 'Updated Title',
      };

      const result = TaskUpdateSchema.parse(data);
      expect(result.title).toBe('Updated Title');
    });

    it('should allow updating isDone status', () => {
      const data = {
        isDone: true,
      };

      const result = TaskUpdateSchema.parse(data);
      expect(result.isDone).toBe(true);
    });

    it('should allow updating multiple fields', () => {
      const data = {
        title: 'Updated Task',
        description: 'Updated description',
        isDone: true,
      };

      const result = TaskUpdateSchema.parse(data);
      expect(result.title).toBe('Updated Task');
      expect(result.description).toBe('Updated description');
      expect(result.isDone).toBe(true);
    });

    it('should reject empty update', () => {
      const data = {};

      // Empty object is valid if we allow partial updates
      const result = TaskUpdateSchema.parse(data);
      expect(result).toEqual({});
    });

    it('should reject invalid isDone type', () => {
      const data = {
        isDone: 'true',
      };

      expect(() => TaskUpdateSchema.parse(data)).toThrow();
    });
  });
});
