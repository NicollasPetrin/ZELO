-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "requiresProof" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TaskProof" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT,
    "note" TEXT,
    "objectKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskProof_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskProof_objectKey_key" ON "TaskProof"("objectKey");

-- CreateIndex
CREATE INDEX "TaskProof_taskId_createdAt_idx" ON "TaskProof"("taskId", "createdAt");

-- AddForeignKey
ALTER TABLE "TaskProof" ADD CONSTRAINT "TaskProof_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskProof" ADD CONSTRAINT "TaskProof_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
