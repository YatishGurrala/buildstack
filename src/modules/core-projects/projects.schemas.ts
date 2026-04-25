import { z } from "zod";

export const ProjectCreateSchema = z.object({
  displayName: z.string().min(2).max(80),
});

export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>;

export type ProjectSummary = {
  id: string;
  key: string;
  displayName: string;
  role: "owner" | "admin" | "member";
  createdAt: string;
};

export type ProjectService = {
  id: string;
  name: string;
  description: string;
  status: "available" | "coming-soon";
};
