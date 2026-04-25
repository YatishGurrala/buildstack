import { randomUUID } from "node:crypto";

import {
  createProjectRecord,
  deleteProjectRecord,
  getProjectRecordById,
  listProjectRecords,
  updateProjectRecord,
} from "@/core/db/projects";
import { HttpError } from "@/lib/http";

import type {
  ProjectRecord,
  RecordCreateInput,
  RecordListQuery,
  RecordUpdateInput,
} from "./records.schemas";

function mapRecord(item: {
  id: string;
  collection: string;
  owner_id: string | null;
  data: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}): ProjectRecord {
  return {
    id: item.id,
    collection: item.collection,
    ownerId: item.owner_id,
    data: item.data,
    createdAt: item.created_at.toISOString(),
    updatedAt: item.updated_at.toISOString(),
  };
}

export const projectRecordsService = {
  async list(schemaName: string, query: RecordListQuery): Promise<ProjectRecord[]> {
    const records = await listProjectRecords(schemaName, query);
    return records.map(mapRecord);
  },

  async create(schemaName: string, input: RecordCreateInput): Promise<ProjectRecord> {
    const record = await createProjectRecord(schemaName, {
      id: randomUUID(),
      collection: input.collection,
      ownerId: input.ownerId ?? null,
      data: input.data,
    });

    return mapRecord(record);
  },

  async getById(schemaName: string, recordId: string): Promise<ProjectRecord> {
    const record = await getProjectRecordById(schemaName, recordId);
    if (!record) {
      throw new HttpError(404, "Record not found", "RECORD_NOT_FOUND");
    }

    return mapRecord(record);
  },

  async update(schemaName: string, recordId: string, input: RecordUpdateInput): Promise<ProjectRecord> {
    const record = await updateProjectRecord(schemaName, recordId, input);
    if (!record) {
      throw new HttpError(404, "Record not found", "RECORD_NOT_FOUND");
    }

    return mapRecord(record);
  },

  async delete(schemaName: string, recordId: string): Promise<void> {
    const deleted = await deleteProjectRecord(schemaName, recordId);
    if (!deleted) {
      throw new HttpError(404, "Record not found", "RECORD_NOT_FOUND");
    }
  },
};