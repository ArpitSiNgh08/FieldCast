-- CreateTable
CREATE TABLE "tournament_pools" (
    "id" SERIAL NOT NULL,
    "tournament_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_pools_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "tournament_teams" ADD COLUMN "pool_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "tournament_pools_tournament_id_name_key" ON "tournament_pools"("tournament_id", "name");

-- CreateIndex
CREATE INDEX "tournament_pools_tournament_id_sort_order_idx" ON "tournament_pools"("tournament_id", "sort_order");

-- CreateIndex
CREATE INDEX "tournament_teams_pool_id_idx" ON "tournament_teams"("pool_id");

-- AddForeignKey
ALTER TABLE "tournament_pools" ADD CONSTRAINT "tournament_pools_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "tournament_pools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
