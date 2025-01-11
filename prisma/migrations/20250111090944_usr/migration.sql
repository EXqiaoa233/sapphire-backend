-- AddForeignKey
ALTER TABLE "match_record" ADD CONSTRAINT "match_record_sid_fkey" FOREIGN KEY ("sid") REFERENCES "users"("sid") ON DELETE RESTRICT ON UPDATE CASCADE;
