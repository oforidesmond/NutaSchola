import { PageHeader } from "@/components/ui/primitives";
import { requirePageAccess } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { StationeryStockClient } from "./StationeryStockClient";

export default async function StationeryStockPage() {
  const { tenant } = await requirePageAccess(ACTIONS.FEES_MANAGE);

  const items = await prisma.stationeryItem.findMany({
    where: { schoolId: tenant.schoolId },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Stationery stock"
        description="Manage stationery items, prices, and stock levels"
      />
      <StationeryStockClient
        items={items.map((i) => ({
          id: i.id,
          name: i.name,
          unitPrice: i.unitPrice.toFixed(2),
          stockQuantity: i.stockQuantity,
          isActive: i.isActive,
        }))}
      />
    </div>
  );
}
