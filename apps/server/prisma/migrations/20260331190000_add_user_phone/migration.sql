-- AlterTable
ALTER TABLE "users" ADD COLUMN "phone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");
