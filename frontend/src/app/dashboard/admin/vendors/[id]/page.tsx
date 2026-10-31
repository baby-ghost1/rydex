import AdminVendorDetail from "@/components/dashboard/admin-vendor-detail";

export const metadata = { title: "Vendor review" };

export default async function AdminVendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminVendorDetail vendorId={id} />;
}
