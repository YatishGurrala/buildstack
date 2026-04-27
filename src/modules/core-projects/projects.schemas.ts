import { z } from "zod";

export const ProjectCreateSchema = z.object({
  displayName: z.string().min(2).max(80),
});

export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>;

export type ProjectSummary = {
  id: string;
  key: string;
  schemaName: string;
  displayName: string;
  role: "owner" | "admin" | "member";
  createdAt: string;
  usage: {
    storageBytes: number;
  };
};

export type ProjectService = {
  id: string;
  name: string;
  description: string;
  status: "available" | "coming-soon";
};

export type ProjectServiceDetails =
  | {
      service: "auth";
      auth: {
        totalUsers: number;
        activeSessions: number;
        totalSessions: number;
        recentUsers: Array<{
          id: string;
          email: string;
          createdAt: string;
        }>;
      };
    }
  | {
      service: "database";
      database: {
        totalRecords: number;
        totalCollections: number;
        collections: Array<{
          name: string;
          count: number;
        }>;
      };
    }
  | {
      service: "api";
      api: {
        activeApiKeys: number;
      };
    };
