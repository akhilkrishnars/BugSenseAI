import BugDetails from "./BugDetails";

export default async function BugDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BugDetails id={id} />;
}