import { ProjectServicesClient } from "./project-services-client";

export default async function ProjectServicesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectServicesClient projectId={projectId} />;
}
