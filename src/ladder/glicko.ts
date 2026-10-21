// Glicko-2（Glickman 2012），每局视为一个评级周期；以 1000 分为中心
export const GLICKO = {
    center: 1000,
    scale: 173.7178,
    initialRd: 350,
    initialVol: 0.06,
    minRd: 30,
    tau: 0.5,
}

export interface Rating { rating: number; rd: number; vol: number }

const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI))

// 对手为对方全队的合成：分数取平均，RD 取均方根
export function teamOpponent(players: Rating[]): Rating {
    const rating = players.reduce((s, p) => s + p.rating, 0) / players.length
    const rd = Math.sqrt(players.reduce((s, p) => s + p.rd * p.rd, 0) / players.length)
    return { rating, rd, vol: GLICKO.initialVol }
}

export function expectedScore(player: Rating, opponent: Rating): number {
    const mu = (player.rating - GLICKO.center) / GLICKO.scale
    const muJ = (opponent.rating - GLICKO.center) / GLICKO.scale
    return 1 / (1 + Math.exp(-g(opponent.rd / GLICKO.scale) * (mu - muJ)))
}

// 返回赛后的分数、RD、波动率；score: 赢 1 / 输 0
export function glickoUpdate(player: Rating, opponent: Rating, score: number): Rating {
    const { scale, center, tau } = GLICKO
    const mu = (player.rating - center) / scale
    const phi = player.rd / scale
    const muJ = (opponent.rating - center) / scale
    const gJ = g(opponent.rd / scale)
    const e = 1 / (1 + Math.exp(-gJ * (mu - muJ)))
    const v = 1 / (gJ * gJ * e * (1 - e))
    const delta = v * gJ * (score - e)

    // 波动率：Illinois 迭代
    const a = Math.log(player.vol * player.vol)
    const f = (x: number) => {
        const ex = Math.exp(x)
        return (ex * (delta * delta - phi * phi - v - ex)) / (2 * (phi * phi + v + ex) ** 2) - (x - a) / (tau * tau)
    }
    let A = a
    let B: number
    if (delta * delta > phi * phi + v) {
        B = Math.log(delta * delta - phi * phi - v)
    } else {
        let k = 1
        while (f(a - k * tau) < 0) {
            k++
        }
        B = a - k * tau
    }
    let fA = f(A)
    let fB = f(B)
    for (let i = 0; i < 100 && Math.abs(B - A) > 1e-6; i++) {
        const C = A + ((A - B) * fA) / (fB - fA)
        const fC = f(C)
        if (fC * fB <= 0) {
            A = B
            fA = fB
        } else {
            fA = fA / 2
        }
        B = C
        fB = fC
    }
    const vol = Math.exp(A / 2)

    const phiStar = Math.sqrt(phi * phi + vol * vol)
    const phiNew = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v)
    const muNew = mu + phiNew * phiNew * gJ * (score - e)
    return {
        rating: muNew * scale + center,
        rd: Math.min(GLICKO.initialRd, Math.max(GLICKO.minRd, phiNew * scale)),
        vol,
    }
}
