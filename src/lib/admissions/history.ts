import type { AdmissionStage, Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function recordStageChange(
  tx: Tx,
  input: {
    applicationId: string;
    fromStage: AdmissionStage | null;
    toStage: AdmissionStage;
    changedById?: string | null;
    note?: string | null;
  },
) {
  await tx.admissionStatusHistory.create({
    data: {
      applicationId: input.applicationId,
      fromStage: input.fromStage ?? undefined,
      toStage: input.toStage,
      changedById: input.changedById ?? undefined,
      note: input.note ?? undefined,
    },
  });
}
