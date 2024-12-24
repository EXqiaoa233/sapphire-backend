import { Provide } from '@midwayjs/core';
import { prisma } from '../prisma';
import { IUserReq, IUserUpdateOption } from '../controller/user.controller';

@Provide()
export class UserService {
  async getUser(sid: string) {
    return await prisma.user.findFirst({
      where: {
        sid: sid
      }
    })
  }

  async createUser(user: IUserReq) {
    return await prisma.user.create({
      data: {
        sid: user.sid,
        lid: user.lid,
        score: 600,
        record: 0,
        winRecords: 0
      }
    })
  }

  async updateUser(user: IUserUpdateOption) {
    return await prisma.user.update({
      where: {
        sid: user.sid
      },
      data: {
        score: user.score,
        winRecords: user.winRecords,
        record: user.record
      }
    })
  }
}
