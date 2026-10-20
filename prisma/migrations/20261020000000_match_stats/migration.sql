-- CreateTable
CREATE TABLE "match_stats" (
    "id" SERIAL NOT NULL,
    "match_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "match_stats_match_id_key" ON "match_stats"("match_id");

-- AddForeignKey
ALTER TABLE "match_stats" ADD CONSTRAINT "match_stats_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matchs"("match_id") ON DELETE RESTRICT ON UPDATE CASCADE;

