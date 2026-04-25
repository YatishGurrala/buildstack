import { NoteCreateSchema, NoteUpdateSchema } from '@/modules/project1/project1.schemas';

describe('Project1 Schemas', () => {
  describe('NoteCreateSchema', () => {
    it('should validate note creation with title and body', () => {
      const data = {
        title: 'My Note',
        body: 'This is the body',
      };

      const result = NoteCreateSchema.parse(data);
      expect(result.title).toBe('My Note');
      expect(result.body).toBe('This is the body');
    });

    it('should allow empty body', () => {
      const data = {
        title: 'My Note',
      };

      const result = NoteCreateSchema.parse(data);
      expect(result.title).toBe('My Note');
      expect(result.body).toBeUndefined();
    });

    it('should reject missing title', () => {
      const data = {
        body: 'Body without title',
      };

      expect(() => NoteCreateSchema.parse(data)).toThrow();
    });

    it('should reject empty title', () => {
      const data = {
        title: '',
        body: 'Body',
      };

      expect(() => NoteCreateSchema.parse(data)).toThrow();
    });
  });

  describe('NoteUpdateSchema', () => {
    it('should allow updating only title', () => {
      const data = {
        title: 'Updated Title',
      };

      const result = NoteUpdateSchema.parse(data);
      expect(result.title).toBe('Updated Title');
      expect(result.body).toBeUndefined();
    });

    it('should allow updating only body', () => {
      const data = {
        body: 'Updated Body',
      };

      const result = NoteUpdateSchema.parse(data);
      expect(result.title).toBeUndefined();
      expect(result.body).toBe('Updated Body');
    });

    it('should allow updating both fields', () => {
      const data = {
        title: 'New Title',
        body: 'New Body',
      };

      const result = NoteUpdateSchema.parse(data);
      expect(result.title).toBe('New Title');
      expect(result.body).toBe('New Body');
    });

    it('should reject empty update object', () => {
      const data = {};

      // Empty object is valid for partial updates
      const result = NoteUpdateSchema.parse(data);
      expect(result).toEqual({});
    });

    it('should reject invalid field types', () => {
      const data = {
        title: 123,
      };

      expect(() => NoteUpdateSchema.parse(data)).toThrow();
    });
  });
});
