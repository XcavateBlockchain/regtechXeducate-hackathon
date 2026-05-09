-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'EMPLOYEE', 'USER');

-- CreateEnum
CREATE TYPE "EmployeePermission" AS ENUM ('ISSUER', 'REVIEWER', 'AUDITOR');

-- CreateEnum
CREATE TYPE "ModuleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('EMPLOYEE', 'USER');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTI_CHOICE', 'TRUE_FALSE');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('MODULE_CREATED', 'MODULE_PUBLISHED', 'MODULE_ARCHIVED', 'EMPLOYEE_INVITED', 'EMPLOYEE_REMOVED', 'MODULE_ASSIGNED', 'USER_ENROLLED', 'ASSESSMENT_PASSED', 'ASSESSMENT_FAILED', 'CREDENTIAL_ISSUED', 'CREDENTIAL_REVOKED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MODULE_ASSIGNED', 'ASSESSMENT_DUE', 'CREDENTIAL_ISSUED', 'CREDENTIAL_REVOKED', 'INVITATION');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "website" TEXT,
    "description" TEXT,
    "partner_id" TEXT NOT NULL,
    "collection_address" TEXT,
    "attestor" TEXT,
    "pass_threshold" INTEGER NOT NULL DEFAULT 70,
    "cool_down_period" INTEGER NOT NULL DEFAULT 86400,
    "swig_address" TEXT,
    "swig_id" TEXT,
    "tx_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "tx_hash" TEXT,
    "ownerId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "department" TEXT,
    "jobTitle" TEXT,
    "permission" "EmployeePermission" NOT NULL DEFAULT 'REVIEWER',
    "inviteId" TEXT,
    "invitedByUserId" TEXT,
    "invitedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "permission" "EmployeePermission" NOT NULL DEFAULT 'REVIEWER',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "claimedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" TEXT,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'English',
    "completionTime" TEXT NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "module_id_hash" TEXT,
    "moduleCode" TEXT,
    "metadataUri" TEXT,
    "credentialType" TEXT NOT NULL,
    "pass_threshold" INTEGER NOT NULL,
    "cool_down_seconds" INTEGER NOT NULL,
    "expires_in_seconds" INTEGER,
    "maxRecipients" INTEGER NOT NULL,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "status" "ModuleStatus" NOT NULL DEFAULT 'DRAFT',
    "module_type" "ModuleType" NOT NULL DEFAULT 'EMPLOYEE',
    "shareToken" TEXT NOT NULL,
    "tx_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "tx_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleAssignment" (
    "moduleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignedByUserId" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING',
    "onChainEnrollmentAddress" TEXT,
    "reasonCode" INTEGER NOT NULL DEFAULT 0,
    "finalScoreBps" INTEGER,
    "completedAt" TIMESTAMP(3),
    "credentialId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleAssignment_pkey" PRIMARY KEY ("moduleId","employeeId")
);

-- CreateTable
CREATE TABLE "ModuleEnrollment" (
    "moduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING',
    "onChainEnrollmentAddress" TEXT,
    "reasonCode" INTEGER NOT NULL DEFAULT 0,
    "finalScoreBps" INTEGER,
    "completedAt" TIMESTAMP(3),
    "credentialId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleEnrollment_pkey" PRIMARY KEY ("moduleId","userId")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "timeLimit" INTEGER,
    "randomise" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionBatch" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAttempt" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "batchId" TEXT,
    "employeeId" TEXT,
    "userId" TEXT,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "score" INTEGER,
    "passed" BOOLEAN,
    "onChainAttemptAddress" TEXT,
    "onChainScoreBps" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptions" TEXT[],
    "isCorrect" BOOLEAN,

    CONSTRAINT "AttemptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "issuingCompanyId" TEXT NOT NULL,
    "issuedByUserId" TEXT NOT NULL,
    "moduleId" TEXT,
    "onChainPartnerId" TEXT NOT NULL,
    "moduleIdHash" TEXT NOT NULL,
    "credentialType" TEXT NOT NULL,
    "metadataUri" TEXT NOT NULL,
    "scoreBps" INTEGER,
    "onChainAddress" TEXT NOT NULL,
    "txSignature" TEXT NOT NULL,
    "credentialAsset" TEXT,
    "status" "CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,
    "revocationReason" TEXT,
    "revocationTxSig" TEXT,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredentialRevocationLog" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "revokedByUserId" TEXT NOT NULL,
    "reason" TEXT,
    "txSignature" TEXT,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CredentialRevocationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_userId_key" ON "users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_walletAddress_key" ON "users"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_walletAddress_idx" ON "users"("walletAddress");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "companies_partner_id_key" ON "companies"("partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_ownerId_key" ON "companies"("ownerId");

-- CreateIndex
CREATE INDEX "companies_slug_idx" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "companies_ownerId_idx" ON "companies"("ownerId");

-- CreateIndex
CREATE INDEX "companies_partner_id_idx" ON "companies"("partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_userId_key" ON "employees"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_companyId_key" ON "employees"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_inviteId_key" ON "employees"("inviteId");

-- CreateIndex
CREATE INDEX "employees_companyId_idx" ON "employees"("companyId");

-- CreateIndex
CREATE INDEX "employees_permission_idx" ON "employees"("permission");

-- CreateIndex
CREATE UNIQUE INDEX "employees_userId_companyId_key" ON "employees"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "invites_token_key" ON "invites"("token");

-- CreateIndex
CREATE INDEX "invites_companyId_idx" ON "invites"("companyId");

-- CreateIndex
CREATE INDEX "invites_token_idx" ON "invites"("token");

-- CreateIndex
CREATE INDEX "invites_email_idx" ON "invites"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Module_module_id_hash_key" ON "Module"("module_id_hash");

-- CreateIndex
CREATE UNIQUE INDEX "Module_shareToken_key" ON "Module"("shareToken");

-- CreateIndex
CREATE INDEX "Module_companyId_idx" ON "Module"("companyId");

-- CreateIndex
CREATE INDEX "Module_status_idx" ON "Module"("status");

-- CreateIndex
CREATE INDEX "Module_shareToken_idx" ON "Module"("shareToken");

-- CreateIndex
CREATE INDEX "Module_module_id_hash_idx" ON "Module"("module_id_hash");

-- CreateIndex
CREATE INDEX "Module_credentialType_idx" ON "Module"("credentialType");

-- CreateIndex
CREATE INDEX "files_moduleId_idx" ON "files"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleAssignment_credentialId_key" ON "ModuleAssignment"("credentialId");

-- CreateIndex
CREATE INDEX "ModuleAssignment_employeeId_idx" ON "ModuleAssignment"("employeeId");

-- CreateIndex
CREATE INDEX "ModuleAssignment_status_idx" ON "ModuleAssignment"("status");

-- CreateIndex
CREATE INDEX "ModuleAssignment_onChainEnrollmentAddress_idx" ON "ModuleAssignment"("onChainEnrollmentAddress");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleEnrollment_credentialId_key" ON "ModuleEnrollment"("credentialId");

-- CreateIndex
CREATE INDEX "ModuleEnrollment_userId_idx" ON "ModuleEnrollment"("userId");

-- CreateIndex
CREATE INDEX "ModuleEnrollment_status_idx" ON "ModuleEnrollment"("status");

-- CreateIndex
CREATE INDEX "ModuleEnrollment_onChainEnrollmentAddress_idx" ON "ModuleEnrollment"("onChainEnrollmentAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_moduleId_key" ON "Assessment"("moduleId");

-- CreateIndex
CREATE INDEX "QuestionBatch_assessmentId_idx" ON "QuestionBatch"("assessmentId");

-- CreateIndex
CREATE INDEX "Question_batchId_idx" ON "Question"("batchId");

-- CreateIndex
CREATE INDEX "QuestionOption_questionId_idx" ON "QuestionOption"("questionId");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_assessmentId_idx" ON "AssessmentAttempt"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_batchId_idx" ON "AssessmentAttempt"("batchId");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_employeeId_idx" ON "AssessmentAttempt"("employeeId");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_userId_idx" ON "AssessmentAttempt"("userId");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_onChainAttemptAddress_idx" ON "AssessmentAttempt"("onChainAttemptAddress");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentAttempt_assessmentId_employeeId_attemptNumber_key" ON "AssessmentAttempt"("assessmentId", "employeeId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentAttempt_assessmentId_userId_attemptNumber_key" ON "AssessmentAttempt"("assessmentId", "userId", "attemptNumber");

-- CreateIndex
CREATE INDEX "AttemptAnswer_attemptId_idx" ON "AttemptAnswer"("attemptId");

-- CreateIndex
CREATE INDEX "AttemptAnswer_questionId_idx" ON "AttemptAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_onChainAddress_key" ON "Credential"("onChainAddress");

-- CreateIndex
CREATE INDEX "Credential_recipientId_idx" ON "Credential"("recipientId");

-- CreateIndex
CREATE INDEX "Credential_issuingCompanyId_idx" ON "Credential"("issuingCompanyId");

-- CreateIndex
CREATE INDEX "Credential_onChainPartnerId_idx" ON "Credential"("onChainPartnerId");

-- CreateIndex
CREATE INDEX "Credential_moduleIdHash_idx" ON "Credential"("moduleIdHash");

-- CreateIndex
CREATE INDEX "Credential_credentialType_idx" ON "Credential"("credentialType");

-- CreateIndex
CREATE INDEX "Credential_status_idx" ON "Credential"("status");

-- CreateIndex
CREATE INDEX "Credential_onChainAddress_idx" ON "Credential"("onChainAddress");

-- CreateIndex
CREATE INDEX "CredentialRevocationLog_credentialId_idx" ON "CredentialRevocationLog"("credentialId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_companyId_idx" ON "ActivityLog"("companyId");

-- CreateIndex
CREATE INDEX "ActivityLog_actorId_idx" ON "ActivityLog"("actorId");

-- CreateIndex
CREATE INDEX "ActivityLog_type_idx" ON "ActivityLog"("type");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "invites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleAssignment" ADD CONSTRAINT "ModuleAssignment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleAssignment" ADD CONSTRAINT "ModuleAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleAssignment" ADD CONSTRAINT "ModuleAssignment_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleEnrollment" ADD CONSTRAINT "ModuleEnrollment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleEnrollment" ADD CONSTRAINT "ModuleEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleEnrollment" ADD CONSTRAINT "ModuleEnrollment_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionBatch" ADD CONSTRAINT "QuestionBatch_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "QuestionBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "QuestionBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_issuingCompanyId_fkey" FOREIGN KEY ("issuingCompanyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialRevocationLog" ADD CONSTRAINT "CredentialRevocationLog_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
