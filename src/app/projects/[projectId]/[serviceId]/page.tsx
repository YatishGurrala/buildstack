import { notFound } from "next/navigation";

import { ProjectServicesClient } from "../project-services-client";
import { isProjectServiceId } from "../service-config";

export default async function ProjectServicePage({
  params,
}: {
  params: Promise<{ projectId: string; serviceId: string }>;
}) {
  const { projectId, serviceId } = await params;

  if (!isProjectServiceId(serviceId)) {
    notFound();
  }

  return <ProjectServicesClient projectId={projectId} serviceId={serviceId} />;
}