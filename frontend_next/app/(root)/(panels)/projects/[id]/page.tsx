import ProjectDetails from "./ProjectDetails";

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectDetails params={{ id }} />;
}