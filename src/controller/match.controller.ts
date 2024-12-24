import { Body, Controller, Inject, Post } from "@midwayjs/core";
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

        hero:string
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
    }[]
}


@Controller('/match')
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

}