// 单局表现评分：定位 T、击杀价值、助攻价值、表现分 P
// 输入是游戏 util/match_stats.lua 上报的原始 stats（v1/v2 通用）与比赛记录里的英雄伤害

export interface StatsNw { pid: number; team: number; nw: number }
export interface StatsKill {
    t: number
    victim: number
    killer: number
    deny: boolean
    reincarnate?: boolean
    victimStreak?: number
    nearby: { pid: number; dist: number }[]
    nw: StatsNw[]
}
export interface StatsData {
    version: number
    t: number
    roster: { pid: number; sid: string; team: number; hero: string; bot: boolean }[]
    totals: {
        pid: number; nw: number; k: number; d: number; a: number
        heal: number; stuns: number; buildingDamage: number
    }[]
    kills: StatsKill[]
    laning: { final?: { pid: number; lane: number; neutral: number; ancient: number; roshan: number; summon?: number }[] }
    minutes: { t: number; players: { pid: number; nw: number }[] }[]
    wards: { pid: number; killer?: number; dewarded?: boolean }[]
}

export interface PlayerScore {
    pid: number
    sid: string
    team: number
    roleT: number
    coreWeight: number
    killValue: number
    assistValue: number
    perf: number
}

const ROLE_FROM = 300
const SEMI_Z = 0.5
const SUP_Z = -0.5
const ASSIST_SHARE = 0.5
const SUPPORT_BONUS = 1.5
const IMP_FLOOR = 0.25
const REINCARNATE_MULT = 0.5
const PERF_SCALE = 1.5

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1)
const pstdev = (xs: number[]) => {
    const m = mean(xs)
    return Math.sqrt(mean(xs.map(x => (x - m) ** 2)))
}

// 经济偏差：标准差下限 max(均值 10%, 300)，避免开局经济接近时 z 被放大
export function netWorthZ(values: number[]): number[] {
    const m = mean(values)
    const sd = Math.max(pstdev(values), m * 0.1, 300)
    return values.map(v => (v - m) / sd)
}

// 表现指标的普通 z 值，全场无差异时为 0
function metricZ(values: number[]): number[] {
    const m = mean(values)
    const sd = pstdev(values)
    return values.map(v => (sd > 0 ? (v - m) / sd : 0))
}

function zByPid(entries: StatsNw[]): Map<number, number> {
    const z = netWorthZ(entries.map(e => e.nw))
    return new Map(entries.map((e, i) => [e.pid, z[i]]))
}

export function scoreMatch(stats: StatsData, heroDamage: Map<string, number>): PlayerScore[] {
    const roster = stats.roster
    const team = new Map(roster.map(r => [r.pid, r.team]))

    // 每分钟快照的队内经济 z
    const minuteZ = stats.minutes.map(m => {
        const zm = new Map<number, number>()
        for (const tm of [2, 3]) {
            const side = m.players.filter(p => team.get(p.pid) === tm).map(p => ({ pid: p.pid, team: tm, nw: p.nw }))
            zByPid(side).forEach((z, pid) => zm.set(pid, z))
        }
        return { t: m.t, zm }
    })
    const roleUntil = (pid: number, t: number): number | undefined => {
        let vals = minuteZ.filter(m => m.t >= ROLE_FROM && m.t <= t && m.zm.has(pid)).map(m => m.zm.get(pid)!)
        if (!vals.length) {
            vals = minuteZ.filter(m => m.t <= t && m.zm.has(pid)).map(m => m.zm.get(pid)!)
        }
        return vals.length ? mean(vals) : undefined
    }

    const killValue = new Map<number, number>()
    const assistValue = new Map<number, number>()
    const add = (m: Map<number, number>, pid: number, v: number) => m.set(pid, (m.get(pid) ?? 0) + v)

    for (const k of stats.kills) {
        if (k.deny || k.killer < 0 || !team.has(k.killer) || !team.has(k.victim)) {
            continue
        }
        const zAll = zByPid(k.nw).get(k.victim) ?? 0
        const zTeam = zByPid(k.nw.filter(x => x.team === team.get(k.victim))).get(k.victim) ?? 0
        let killerRole = roleUntil(k.killer, k.t)
        if (killerRole === undefined) {
            killerRole = zByPid(k.nw.filter(x => x.team === team.get(k.killer))).get(k.killer) ?? 0
        }
        // 重要程度 = 1 + ½·队内地位 + ½·全场经济，截断 [-1, 2]，最低 0.25
        const importance = Math.max(IMP_FLOOR, 1 + 0.5 * clamp(zTeam, -1, 2) + 0.5 * clamp(zAll, -1, 2))
        let mult = killerRole <= SUP_Z && zTeam >= SEMI_Z ? SUPPORT_BONUS : 1
        if (k.reincarnate) {
            mult *= REINCARNATE_MULT
        }
        const shutdown = Math.min(0.5, 0.1 * Math.max(0, (k.victimStreak ?? 0) - 2))
        const value = importance * mult + shutdown
        add(killValue, k.killer, value)
        for (const n of k.nearby) {
            add(assistValue, n.pid, value * ASSIST_SHARE)
        }
    }

    const minutes = Math.max(stats.t / 60, 1)
    const totals = new Map(stats.totals.map(t => [t.pid, t]))
    const finalCreeps = new Map((stats.laning.final ?? []).map(c => [c.pid, c]))
    const vision = new Map<number, number>()
    for (const w of stats.wards) {
        add(vision, w.pid, 1)
        if (w.dewarded && w.killer !== undefined && w.killer >= 0) {
            add(vision, w.killer, 2)
        }
    }

    const pids = roster.map(r => r.pid)
    const col = (f: (pid: number) => number) => {
        const z = metricZ(pids.map(f))
        return new Map(pids.map((pid, i) => [pid, z[i]]))
    }
    const zKill = col(p => killValue.get(p) ?? 0)
    const zBuilding = col(p => totals.get(p)?.buildingDamage ?? 0)
    const zLastHits = col(p => {
        const c = finalCreeps.get(p)
        return c ? (c.lane + c.neutral + c.ancient + c.roshan + (c.summon ?? 0)) / minutes : 0
    })
    const zHeroDamage = col(p => heroDamage.get(roster.find(r => r.pid === p)!.sid) ?? 0)
    const zAssist = col(p => assistValue.get(p) ?? 0)
    const zVision = col(p => vision.get(p) ?? 0)
    const zStuns = col(p => totals.get(p)?.stuns ?? 0)
    const zHeal = col(p => totals.get(p)?.heal ?? 0)
    const zDeaths = col(p => totals.get(p)?.d ?? 0)

    return roster.map(r => {
        const z = roleUntil(r.pid, stats.t) ?? 0
        const roleT = 50 + 10 * z
        const w = clamp((roleT - 45) / 15, 0, 1)
        const core = 0.4 * zKill.get(r.pid)! + 0.2 * zBuilding.get(r.pid)! + 0.2 * zLastHits.get(r.pid)! + 0.2 * zHeroDamage.get(r.pid)!
        const support = 0.4 * zAssist.get(r.pid)! + 0.3 * zVision.get(r.pid)! + 0.3 * (zStuns.get(r.pid)! + zHeal.get(r.pid)!) / 2
        const raw = w * core + (1 - w) * support - 0.2 * zDeaths.get(r.pid)!
        return {
            pid: r.pid,
            sid: r.sid,
            team: r.team,
            roleT,
            coreWeight: w,
            killValue: killValue.get(r.pid) ?? 0,
            assistValue: assistValue.get(r.pid) ?? 0,
            perf: clamp(raw / PERF_SCALE, -1, 1),
        }
    })
}
