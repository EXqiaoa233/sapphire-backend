// 试运行天梯维护脚本（需先 npm run build）
//   node scripts/ladder.js replay   补算所有还没处理的比赛
//   node scripts/ladder.js reset    清空试运行数据后从头回放（调参后用）
const { LadderService } = require('../dist/service/ladder.service');
const { prisma } = require('../dist/prisma');

async function main() {
  const cmd = process.argv[2];
  const service = new LadderService();
  let results;
  if (cmd === 'replay') {
    results = await service.replayPending();
  } else if (cmd === 'reset') {
    results = await service.resetAndReplay();
  } else {
    console.log('usage: node scripts/ladder.js replay|reset');
    return;
  }
  for (const r of results) {
    console.log(r.matchId, r.status, r.reason || '');
  }
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
