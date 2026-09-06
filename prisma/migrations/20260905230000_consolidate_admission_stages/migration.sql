-- Consolidate AdmissionStage progression to five steps + three terminals.
-- Remap existing application and history rows; do not truncate tables.

CREATE TYPE "AdmissionStage_new" AS ENUM (
  'INQUIRY',
  'APPLICATION_SUBMITTED',
  'UNDER_REVIEW',
  'ADMITTED',
  'ENROLLED',
  'WAITLISTED',
  'REJECTED',
  'WITHDRAWN'
);

ALTER TABLE "AdmissionApplication" ALTER COLUMN "stage" DROP DEFAULT;

ALTER TABLE "AdmissionApplication"
  ALTER COLUMN "stage" TYPE "AdmissionStage_new"
  USING (
    CASE "stage"::text
      WHEN 'APPLICATION_STARTED' THEN 'APPLICATION_SUBMITTED'
      WHEN 'DOCUMENTS_SUBMITTED' THEN 'APPLICATION_SUBMITTED'
      WHEN 'ENTRANCE_ASSESSMENT_SCHEDULED' THEN 'UNDER_REVIEW'
      WHEN 'ENTRANCE_ASSESSMENT_COMPLETED' THEN 'UNDER_REVIEW'
      WHEN 'INTERVIEW_SCHEDULED' THEN 'UNDER_REVIEW'
      WHEN 'OFFER_ACCEPTED' THEN 'ADMITTED'
      ELSE "stage"::text
    END
  )::"AdmissionStage_new";

ALTER TABLE "AdmissionStatusHistory"
  ALTER COLUMN "fromStage" TYPE "AdmissionStage_new"
  USING (
    CASE
      WHEN "fromStage" IS NULL THEN NULL
      WHEN "fromStage"::text = 'APPLICATION_STARTED' THEN 'APPLICATION_SUBMITTED'
      WHEN "fromStage"::text = 'DOCUMENTS_SUBMITTED' THEN 'APPLICATION_SUBMITTED'
      WHEN "fromStage"::text = 'ENTRANCE_ASSESSMENT_SCHEDULED' THEN 'UNDER_REVIEW'
      WHEN "fromStage"::text = 'ENTRANCE_ASSESSMENT_COMPLETED' THEN 'UNDER_REVIEW'
      WHEN "fromStage"::text = 'INTERVIEW_SCHEDULED' THEN 'UNDER_REVIEW'
      WHEN "fromStage"::text = 'OFFER_ACCEPTED' THEN 'ADMITTED'
      ELSE "fromStage"::text
    END
  )::"AdmissionStage_new";

ALTER TABLE "AdmissionStatusHistory"
  ALTER COLUMN "toStage" TYPE "AdmissionStage_new"
  USING (
    CASE "toStage"::text
      WHEN 'APPLICATION_STARTED' THEN 'APPLICATION_SUBMITTED'
      WHEN 'DOCUMENTS_SUBMITTED' THEN 'APPLICATION_SUBMITTED'
      WHEN 'ENTRANCE_ASSESSMENT_SCHEDULED' THEN 'UNDER_REVIEW'
      WHEN 'ENTRANCE_ASSESSMENT_COMPLETED' THEN 'UNDER_REVIEW'
      WHEN 'INTERVIEW_SCHEDULED' THEN 'UNDER_REVIEW'
      WHEN 'OFFER_ACCEPTED' THEN 'ADMITTED'
      ELSE "toStage"::text
    END
  )::"AdmissionStage_new";

DROP TYPE "AdmissionStage";

ALTER TYPE "AdmissionStage_new" RENAME TO "AdmissionStage";

ALTER TABLE "AdmissionApplication"
  ALTER COLUMN "stage" SET DEFAULT 'INQUIRY'::"AdmissionStage";
