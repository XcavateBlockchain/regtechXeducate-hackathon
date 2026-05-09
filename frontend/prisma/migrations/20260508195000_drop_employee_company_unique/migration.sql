-- Employee.companyId was incorrectly marked @unique, which limited each
-- company to a single employee. Drop the unique index. The non-unique
-- "employees_companyId_idx" stays for query performance, and the
-- composite "employees_userId_companyId_key" stays as the dual-membership
-- guard alongside the per-row "employees_userId_key".

DROP INDEX "employees_companyId_key";
