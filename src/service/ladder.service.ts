import { Provide } from '@midwayjs/core';
import { prisma } from '../prisma';
import { GLICKO, Rating, glickoUpdate, teamOpponent } from '../ladder/glicko';
import { StatsData, scoreMatch } from '../ladder/scoring';

// 试运行天梯规则
export const LADDER = {
    placementGames: 5,
    perfWeight: 0.3,       // 表现修正：赢 × (1 + 0.3P)，输 × (1 - 0.3P)
    coreEma: 0.2,          // 核心倾向滑动平均：c ← 0.8c + 0.2w
    minDuration: 600,      // 非投降对局不足 10 分钟不计分
}

const defaultRating = (sid: string) => ({
    sid,
    rating: GLICKO.center,
    rd: GLICKO.initialRd,
    vol: GLICKO.initialVol,
    core: 0.5,
    ratingCore: GLICKO.center,
    ratingSup: GLICKO.center,
    games: 0,
    wins: 0,
})

@Provide()
export class LadderService {
    // 处理一局：已处理过的直接跳过；不满足计分条件的记 counted=false
    async processMatch(matchId: string) {
        if (await prisma.ladderHistory.findFirst({ where: { matchId } })) {
            return { matchId, status: 'already processed' }
        }
        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: { players: true, stats: true },
        })
        if (!match || !match.stats || match.winner == null) {
            return { matchId, status: 'not ready' }
        }
        const stats = match.stats.data as unknown as StatsData
        const roster = stats.roster ?? []

        const reason = this.uncountedReason(stats, match.time ?? Math.floor(stats.t), match.urd)
        if (reason) {
            await prisma.ladderHistory.createMany({
                data: roster.filter(r => !r.bot).map(r => ({
                    matchId, sid: r.sid, team: r.team, win: r.team === match.winner, counted: false, reason,
                    roleT: 0, coreWeight: 0, killValue: 0, assistValue: 0, perf: 0, baseDelta: 0, delta: 0,
                    ratingBefore: 0, ratingAfter: 0, rdBefore: 0, rdAfter: 0, coreAfter: 0,
                })),
                skipDuplicates: true,
            })
            return { matchId, status: 'not counted', reason }
        }

        const heroDamage = new Map(match.players.map(p => [p.sid, p.doneDamage]))
        const scores = scoreMatch(stats, heroDamage)
        const existing = await prisma.ladderRating.findMany({ where: { sid: { in: scores.map(s => s.sid) } } })
        const before = new Map(scores.map(s => [s.sid, existing.find(e => e.sid === s.sid) ?? defaultRating(s.sid)]))

        // 所有人都用赛前分数结算
        const opponentOf = (team: number): Rating =>
            teamOpponent(scores.filter(s => s.team !== team).map(s => before.get(s.sid)!))

        const updates = scores.map(s => {
            const old = before.get(s.sid)!
            const win = s.team === match.winner
            const next = glickoUpdate(old, opponentOf(s.team), win ? 1 : 0)
            const baseDelta = next.rating - old.rating
            // 赢：表现好多涨；输：表现好少掉。倍率恒为正，输赢方向不变
            const delta = baseDelta * (1 + (win ? 1 : -1) * LADDER.perfWeight * s.perf)
            const w = s.coreWeight
            const rating = {
                sid: s.sid,
                rating: old.rating + delta,
                rd: next.rd,
                vol: next.vol,
                core: (1 - LADDER.coreEma) * old.core + LADDER.coreEma * w,
                ratingCore: old.ratingCore + w * delta,
                ratingSup: old.ratingSup + (1 - w) * delta,
                games: old.games + 1,
                wins: old.wins + (win ? 1 : 0),
                lastMatch: matchId,
            }
            const history = {
                matchId, sid: s.sid, team: s.team, win, counted: true,
                roleT: s.roleT, coreWeight: w, killValue: s.killValue, assistValue: s.assistValue, perf: s.perf,
                baseDelta, delta,
                ratingBefore: old.rating, ratingAfter: rating.rating,
                rdBefore: old.rd, rdAfter: rating.rd, coreAfter: rating.core,
            }
            return { rating, history }
        })

        await prisma.$transaction([
            ...updates.map(u => prisma.ladderRating.upsert({
                where: { sid: u.rating.sid },
                create: u.rating,
                update: u.rating,
            })),
            prisma.ladderHistory.createMany({ data: updates.map(u => u.history) }),
        ])
        return { matchId, status: 'counted' }
    }

    uncountedReason(stats: StatsData, time: number, urd: boolean): string | undefined {
        const roster = stats.roster ?? []
        if (roster.some(r => r.bot)) {
            return 'bot'
        }
        const sizes = [2, 3].map(t => roster.filter(r => r.team === t).length)
        if (sizes[0] !== 5 || sizes[1] !== 5) {
            return 'team size ' + sizes.join('v')
        }
        if (!urd && time < LADDER.minDuration) {
            return 'too short'
        }
        return undefined
    }

    // 按比赛开始时间补处理所有还没处理过的比赛
    async replayPending() {
        const rows = await prisma.matchStats.findMany({
            select: { matchId: true },
            orderBy: { match: { createAt: 'asc' } },
        })
        const results = []
        for (const r of rows) {
            results.push(await this.processMatch(r.matchId))
        }
        return results
    }

    // 调参后重算：清空试运行数据，再从头回放
    async resetAndReplay() {
        await prisma.$transaction([prisma.ladderHistory.deleteMany(), prisma.ladderRating.deleteMany()])
        return await this.replayPending()
    }

    // 排行：定级完成的按保守分（R - 2RD）排序；定级中的单独列出
    async getRankList() {
        const ratings = await prisma.ladderRating.findMany()
        const users = await prisma.user.findMany({
            where: { sid: { in: ratings.map(r => r.sid) } },
            select: { sid: true, username: true, avatar: true },
        })
        const rows = ratings.map(r => {
            const u = users.find(x => x.sid === r.sid)
            return {
                sid: r.sid,
                username: u?.username ?? null,
                avatar: u?.avatar ?? null,
                rating: Math.round(r.rating),
                rd: Math.round(r.rd),
                conservative: Math.round(r.rating - 2 * r.rd),
                core: Math.round(r.core * 100) / 100,
                ratingCore: Math.round(r.ratingCore),
                ratingSup: Math.round(r.ratingSup),
                games: r.games,
                wins: r.wins,
                placement: r.games < LADDER.placementGames,
            }
        })
        return {
            ranked: rows.filter(r => !r.placement).sort((a, b) => b.conservative - a.conservative),
            placement: rows.filter(r => r.placement).sort((a, b) => b.games - a.games || b.rating - a.rating),
        }
    }

    async getHistory(matchId?: string, sid?: string) {
        return await prisma.ladderHistory.findMany({
            where: { ...(matchId ? { matchId } : {}), ...(sid ? { sid } : {}) },
            orderBy: [{ createAt: 'asc' }, { id: 'asc' }],
        })
    }
}
