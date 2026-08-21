-- AlterTable
ALTER TABLE "matches"
ADD COLUMN "stage_type" TEXT,
ADD COLUMN "pool_id" INTEGER,
ADD COLUMN "knockout_stage" TEXT;

-- CreateIndex
CREATE INDEX "matches_pool_id_idx" ON "matches"("pool_id");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "tournament_pools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
