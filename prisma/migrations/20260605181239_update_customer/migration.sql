-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_leadId_fkey";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "assignedAgentId" INTEGER,
ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "companyId" DROP NOT NULL,
ALTER COLUMN "leadId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
