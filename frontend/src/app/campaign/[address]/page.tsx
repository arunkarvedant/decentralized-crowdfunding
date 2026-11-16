import { CampaignDetailView } from "@/components/CampaignDetailView";

interface CampaignPageProps {
  params: Promise<{ address: string }>;
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { address } = await params;
  return <CampaignDetailView campaignAddress={address} />;
}
