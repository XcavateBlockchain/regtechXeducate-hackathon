-- Change ModuleType enum from EMPLOYEE/USER to FCA/SEC frameworks.
-- This uses the "create new enum + cast" approach so we can drop old variants.

-- Drop default before type swap.
ALTER TABLE "Module" ALTER COLUMN "module_type" DROP DEFAULT;

-- New enum with desired variants.
CREATE TYPE "ModuleType_new" AS ENUM (
  'FCA_INVESTMENT',
  'FCA_REGULATED',
  'SEC_FRAMEWORK'
);

-- Remap old values to new ones, then swap the enum type.
ALTER TABLE "Module"
ALTER COLUMN "module_type" TYPE "ModuleType_new"
USING (
  CASE "module_type"::text
    WHEN 'EMPLOYEE' THEN 'FCA_REGULATED'
    WHEN 'USER' THEN 'FCA_INVESTMENT'
    ELSE 'FCA_INVESTMENT'
  END
)::"ModuleType_new";

-- Replace old enum.
DROP TYPE "ModuleType";
ALTER TYPE "ModuleType_new" RENAME TO "ModuleType";

-- Restore default.
ALTER TABLE "Module" ALTER COLUMN "module_type" SET DEFAULT 'FCA_INVESTMENT';

