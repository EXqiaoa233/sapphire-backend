-- CreateTable
CREATE TABLE "users" (
    "sid" TEXT NOT NULL,
    "lid" TEXT NOT NULL,
    "username" TEXT,
    "avatar" TEXT,
    "score" INTEGER NOT NULL,
    "record" INTEGER NOT NULL,
    "win_record" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "match_record" (
    "id" SERIAL NOT NULL,
    "match_id" TEXT NOT NULL,
    "sid" TEXT NOT NULL,
    "lid" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "teamnumber" INTEGER NOT NULL,
    "kill" INTEGER NOT NULL,
    "assist" INTEGER NOT NULL,
    "death" INTEGER NOT NULL,
    "tower" INTEGER NOT NULL,
    "items" TEXT[],
    "normal_skill" TEXT NOT NULL,
    "ultimate_skill" TEXT NOT NULL,
    "done_damage" INTEGER NOT NULL,
    "take_damage" INTEGER NOT NULL,

    CONSTRAINT "match_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matchs" (
    "match_id" TEXT NOT NULL,
    "time" INTEGER,
    "urd" BOOLEAN NOT NULL,
    "winner" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "matchs_pkey" PRIMARY KEY ("match_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_sid_key" ON "users"("sid");

-- CreateIndex
CREATE UNIQUE INDEX "users_lid_key" ON "users"("lid");

-- CreateIndex
CREATE UNIQUE INDEX "matchs_match_id_key" ON "matchs"("match_id");

-- AddForeignKey
ALTER TABLE "match_record" ADD CONSTRAINT "match_record_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matchs"("match_id") ON DELETE RESTRICT ON UPDATE CASCADE;
