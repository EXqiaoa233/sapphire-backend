-- CreateTable
CREATE TABLE "ladder_ratings" (
    "sid" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "rd" DOUBLE PRECISION NOT NULL DEFAULT 350,
    "vol" DOUBLE PRECISION NOT NULL DEFAULT 0.06,
    "core" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "rating_core" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "rating_sup" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "games" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "last_match" TEXT,
    "last_played_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ladder_ratings_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "ladder_history" (
    "id" SERIAL NOT NULL,
    "match_id" TEXT NOT NULL,
    "sid" TEXT NOT NULL,
    "team" INTEGER NOT NULL,
    "win" BOOLEAN NOT NULL,
    "counted" BOOLEAN NOT NULL,
    "reason" TEXT,
    "role_t" DOUBLE PRECISION NOT NULL,
    "core_weight" DOUBLE PRECISION NOT NULL,
    "kill_value" DOUBLE PRECISION NOT NULL,
    "assist_value" DOUBLE PRECISION NOT NULL,
    "perf" DOUBLE PRECISION NOT NULL,
    "base_delta" DOUBLE PRECISION NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "rating_before" DOUBLE PRECISION NOT NULL,
    "rating_after" DOUBLE PRECISION NOT NULL,
    "rd_before" DOUBLE PRECISION NOT NULL,
    "rd_after" DOUBLE PRECISION NOT NULL,
    "core_after" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ladder_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ladder_history_sid_idx" ON "ladder_history"("sid");

-- CreateIndex
CREATE UNIQUE INDEX "ladder_history_match_id_sid_key" ON "ladder_history"("match_id", "sid");

