import type { AdmissionStage } from "@prisma/client";
import {
  ADMISSION_TRACK,
  admissionStageLabel,
  isTerminalStage,
  trackerActiveIndex,
  admissionStageTone,
} from "@/lib/admissions/stages";
import { StatusBadge } from "@/components/ui/primitives";

type Props = {
  stage: AdmissionStage;
  /** Last non-terminal track stage (from history) used when freezing for terminals. */
  freezeAtStage?: AdmissionStage | null;
};

/**
 * Horizontal (desktop) / vertical (mobile) stepper.
 * Completed = success green; current = brand blue + shadow; future = gray.
 * Never paints error/warning inside the track — terminal statuses freeze + badge.
 */
export function AdmissionStageTracker({ stage, freezeAtStage = null }: Props) {
  const terminal = isTerminalStage(stage);
  const activeIdx = trackerActiveIndex(stage, freezeAtStage);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[15px] font-medium text-[var(--gray-800)]">Admission progress</p>
        <StatusBadge label={admissionStageLabel(stage)} tone={admissionStageTone(stage)} />
      </div>
      <ol className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-start md:gap-2">
        {ADMISSION_TRACK.map((step, index) => {
          const completed = !terminal && index < activeIdx;
          const current = !terminal && index === activeIdx;
          const frozenComplete = terminal && index <= activeIdx;
          const done = completed || frozenComplete;
          const isCurrent = current;

          return (
            <li
              key={step}
              className={`flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-[13px] md:flex-1 md:min-w-[7rem] md:flex-col md:items-start ${
                isCurrent
                  ? "bg-[var(--brand-50)] text-[var(--brand-700)] shadow-[var(--shadow-sm)]"
                  : done
                    ? "text-[var(--success-700)]"
                    : "text-[var(--gray-400)]"
              }`}
            >
              <span
                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  isCurrent
                    ? "bg-[var(--brand-600)] text-white"
                    : done
                      ? "bg-[var(--success-600)] text-white"
                      : "bg-[var(--gray-200)] text-[var(--gray-500)]"
                }`}
                aria-hidden
              >
                {done && !isCurrent ? "✓" : index + 1}
              </span>
              <span className="font-medium leading-snug">{admissionStageLabel(step)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
