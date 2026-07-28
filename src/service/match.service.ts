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
                    lvl: v.lvl,
                    target: v.target,
                    kill: v.kill,
                    assist: v.assist,
                    death: v.death,
                    tower: v.tower,
                    items: v.items,
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

    async getMatchRecords(sid: string) {
        return await prisma.matchRecord.findMany({
            where: {
                sid: sid
            },
            orderBy: {
                createAt: 'desc'
            },
            include: {
                match: true
            }
        })
    }

    async getMatchRecordsPage(sid: string, page: number, pageSize: number) {
        const where = { sid }
        const [items, total] = await prisma.$transaction([
            prisma.matchRecord.findMany({
                where,
                orderBy: [
                    { createAt: 'desc' },
                    { id: 'desc' }
                ],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    match: true
                }
            }),
            prisma.matchRecord.count({ where })
        ])
        return { items, total }
    }

    async getAllMatches(page: number, pageSize: number) {
        const where = {
            winner: {
                not: null
            }
        }
        const [matches, total] = await prisma.$transaction([
            prisma.match.findMany({
                where,
                orderBy: {
                    createAt: 'desc'
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    players: {
                        select: {
                            createAt: true,
                            doneDamage: true,
                            kill: true,
                            score: true
                        }
                    }
                }
            }),
            prisma.match.count({ where })
        ])
        const items = matches.map(match => {
            const endedAt = match.players.reduce<Date | null>((latest, player) => {
                if (!player.createAt) {
                    return latest
                }
                return !latest || player.createAt > latest ? player.createAt : latest
            }, null)
            return { ...match, endedAt }
        })
        return { items, total }
    }

    async getHeroRates() {
        const records = await prisma.matchRecord.findMany({
            where: {
                match: {
                    winner: {
                        not: null
                    }
                }
            },
            select: {
                assist: true,
                death: true,
                hero: true,
                kill: true,
                teamnumber: true,
                match: {
                    select: {
                        winner: true
                    }
                }
            }
        })
        const summaries = new Map<string, {
            assists: number
            deaths: number
            games: number
            hero: string
            kills: number
            wins: number
        }>()
        records.forEach(record => {
            const summary = summaries.get(record.hero) ?? {
                assists: 0,
                deaths: 0,
                games: 0,
                hero: record.hero,
                kills: 0,
                wins: 0
            }
            summary.games += 1
            summary.wins += Number(record.match.winner === record.teamnumber)
            summary.kills += record.kill
            summary.deaths += record.death
            summary.assists += record.assist
            summaries.set(record.hero, summary)
        })
        return Array.from(summaries.values())
            .map(summary => ({
                ...summary,
                kda: (summary.kills + summary.assists) / Math.max(summary.deaths, 1),
                winRate: summary.wins / summary.games
            }))
            .sort((a, b) => b.winRate - a.winRate || b.games - a.games)
    }

    async getSkillRates() {
        const records = await prisma.matchRecord.findMany({
            where: {
                match: {
                    winner: {
                        not: null
                    }
                }
            },
            select: {
                normalSkill: true,
                teamnumber: true,
                ultimateSkill: true,
                match: {
                    select: {
                        winner: true
                    }
                }
            }
        })
        const summaries = new Map<string, {
            games: number
            name: string
            type: 'normal' | 'ultimate'
            wins: number
        }>()
        records.forEach(record => {
            const won = Number(record.match.winner === record.teamnumber)
            const addSkill = (name: string, type: 'normal' | 'ultimate') => {
                if (!name || name === 'none') {
                    return
                }
                const key = `${type}:${name}`
                const summary = summaries.get(key) ?? { games: 0, name, type, wins: 0 }
                summary.games += 1
                summary.wins += won
                summaries.set(key, summary)
            }
            addSkill(record.normalSkill, 'normal')
            addSkill(record.ultimateSkill, 'ultimate')
        })
        return Array.from(summaries.values())
            .map(summary => ({
                ...summary,
                winRate: summary.wins / summary.games
            }))
            .sort((a, b) => b.winRate - a.winRate || b.games - a.games)
    }

    async getMatchInfo(matchid: string) {
        return await prisma.match.findFirst({
            where: {
                id: matchid
            },
            include: {
                players: {
                    include: { user: true }
                }
            }
        })
    }

}
