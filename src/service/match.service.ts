import { Provide } from "@midwayjs/core";
import { IMatchReq } from "../controller/match.controller";
import { prisma } from "../prisma";


@Provide()
export class MatchService {

    async createMatch(match: IMatchReq) {
        return await prisma.match.create({
            data: {
                id: match.id,
                urd: true
            }
        })
    }

    async updateMatch(match: IMatchReq) {
        for (let v of match.players) {
            await prisma.matchRecord.create({
                data: {
                    sid: v.sid,
                    lid: v.lid,
                    score: v.score,
                    teamnumber: v.teamnumber,
                    hero: v.hero,
                    kill: v.kill,
                    assist: v.assist,
                    death: v.death,
                    tower: v.tower,
                    doneDamage: v.doneDamage,
                    takeDamage: v.takeDamage,
                    normalSkill: v.normalSkill,
                    ultimateSkill: v.ultimateSkill,
                    matchId: match.id
                }
            })
        }

        return await prisma.match.update({
            where: {
                id: match.id
            },
            data: {
                time: match.time,
                winner: match.winner,
                urd: match.urd
            },
            include: {
                players: true
            }
        })
    }


}