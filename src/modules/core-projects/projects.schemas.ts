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
  organizationId?: string | null;
  role: "owner" | "admin" | "member" | "viewer";
  createdAt: string;
  usage: {
    storageBytes: number;
  };
};

export type ProjectService = {
  // id is an open string to allow separate products to define their own service
  // entries without modifying this core type.
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
    }
  | {
      service: "logs";
      logs: {
        recentCount: number;
      };
    }
  | {
      service: "usage";
      usage: {
        totalEvents: number;
        totalQuantity: number;
      };
    };
