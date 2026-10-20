import { Body, Controller, Get, Inject, Post, Query } from "@midwayjs/core";
import { Context } from "vm";
import { MatchService } from "../service/match.service";
import { UserService } from "../service/user.service";

export interface IMatchReq {
    id: string
    time?: number
    urd?: boolean
    winner?: number
    players: {
        sid: string
        lid: string

        hero: string
        lvl: number
        score: number
        teamnumber: number
        kill: number
        assist: number
        death: number
        tower: number
        items: string[]
        normalSkill: string
        ultimateSkill: string
        doneDamage: number
        takeDamage: number

        target: string
    }[]
    stats?: IMatchStats
}

// 游戏 util/match_stats.lua 上报的局内埋点，结构见该文件 Export()
export interface IMatchStats {
    version: number
    [key: string]: unknown
}

const normalizePagination = (pageInput?: string, pageSizeInput?: string) => {
    const page = Math.max(1, Number.parseInt(pageInput ?? '1', 10) || 1)
    const pageSize = Math.min(50, Math.max(5, Number.parseInt(pageSizeInput ?? '10', 10) || 10))
    return { page, pageSize }
}

@Controller('/api/match')
export class MatchController {
    @Inject()
    ctx: Context

    @Inject()
    matchService: MatchService

    @Inject()
    userService: UserService

    @Post('/')
    async updateMatch(@Body() matchReq: IMatchReq) {
        if (matchReq.winner == undefined) {
            await this.matchService.createMatch(matchReq)
            return { success: true, message: 'OK' }
        } else {
            // 埋点只做收集，保存失败不影响天梯结算
            if (matchReq.stats != undefined) {
                try {
                    await this.matchService.saveMatchStats(matchReq.id, matchReq.stats)
                } catch (err) {
                    this.ctx.logger.error('[match stats] save failed', matchReq.id, err)
                }
            }

            const data = await this.matchService.updateMatch(matchReq)

            for (let v of data.players) {
                let user = await this.userService.getUser(v.sid)
                const record = user.record + 1
                const winRecords = user.winRecords + (matchReq.winner == v.teamnumber ? 1 : 0)
                const score = (user.score * 9 + v.score + winRecords / record * 1000) / 10
                await this.userService.updateUser({
                    sid: v.sid,
                    score: score,
                    winRecords: winRecords,
                    record: record
                })
            }

            return { success: true, message: 'OK', data: data }
        }
    }

    @Get('/record')
    async getMatchRecord(
        @Query('sid') sid: string,
        @Query('page') pageInput?: string,
        @Query('pageSize') pageSizeInput?: string
    ) {
        if (pageInput == undefined && pageSizeInput == undefined) {
            return (await this.matchService.getMatchRecords(sid)).map(v => ({
                ...v,
                win: v.match.winner == v.teamnumber,
                time: v.match.time,
                match: undefined
            }))
        }
        const { page, pageSize } = normalizePagination(pageInput, pageSizeInput)
        const result = await this.matchService.getMatchRecordsPage(sid, page, pageSize)
        return {
            items: result.items.map(v => ({
                ...v,
                win: v.match.winner == v.teamnumber,
                time: v.match.time,
                match: undefined
            })),
            page,
            pageSize,
            total: result.total
        }
    }

    @Get('/all')
    async getAllMatches(
        @Query('page') pageInput?: string,
        @Query('pageSize') pageSizeInput?: string
    ) {
        const { page, pageSize } = normalizePagination(pageInput, pageSizeInput)
        const result = await this.matchService.getAllMatches(page, pageSize)
        return { ...result, page, pageSize }
    }

    @Get('/hero-rate')
    async getHeroRates() {
        return await this.matchService.getHeroRates()
    }

    @Get('/skill-rate')
    async getSkillRates() {
        return await this.matchService.getSkillRates()
    }

    @Get('/stats')
    async getMatchStats(@Query('matchid') matchid: string) {
        return await this.matchService.getMatchStats(matchid)
    }

    @Get('/info')
    async getMatchInfo(@Query('matchid') matchid: string) {
        return await this.matchService.getMatchInfo(matchid)
    }
}
