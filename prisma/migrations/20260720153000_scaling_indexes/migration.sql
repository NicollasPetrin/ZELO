CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "User_companyId_isActive_name_idx" ON "User"("companyId", "isActive", "name");
CREATE INDEX "User_companyId_role_idx" ON "User"("companyId", "role");
CREATE INDEX "Department_companyId_isActive_name_idx" ON "Department"("companyId", "isActive", "name");
CREATE INDEX "Task_companyId_assigneeId_dueDate_idx" ON "Task"("companyId", "assigneeId", "dueDate");
CREATE INDEX "Task_companyId_status_dueDate_idx" ON "Task"("companyId", "status", "dueDate");
CREATE INDEX "Task_companyId_departmentId_status_idx" ON "Task"("companyId", "departmentId", "status");
CREATE INDEX "Task_title_trgm_idx" ON "Task" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "Task_description_trgm_idx" ON "Task" USING GIN ("description" gin_trgm_ops);
CREATE INDEX "Goal_companyId_status_endDate_idx" ON "Goal"("companyId", "status", "endDate");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
