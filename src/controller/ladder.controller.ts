import { Controller, Get, Inject, Query } from '@midwayjs/core';
import { LadderService } from '../service/ladder.service';

// 试运行天梯（只读）；回放、重算走 scripts/ladder.js，不开放接口
@Controller('/api/ladder')
export class LadderController {
    @Inject()
    ladderService: LadderService

    @Get('/ranklist')
    async getRankList() {
        return await this.ladderService.getRankList()
    }

    @Get('/history')
    async getHistory(@Query('matchid') matchid?: string, @Query('sid') sid?: string) {
        return await this.ladderService.getHistory(matchid, sid)
    }
}
