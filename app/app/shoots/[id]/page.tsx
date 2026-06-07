import { ShootDetailPage } from "@/components/ClientApp";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ShootDetailPage id={id} />;
}
