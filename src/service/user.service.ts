import { Provide } from '@midwayjs/core';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { IUserAvatarAndNameOption, IUserReq, IUserUpdateOption } from '../controller/user.controller';

const publicUserSelect: Prisma.UserSelect = {
  sid: true,
  lid: true,
  username: true,
  avatar: true,
  score: true,
  record: true,
  winRecords: true,
  createAt: true,
  updateAt: true,
  deletedAt: true,
};

@Provide()
export class UserService {
  async getUser(sid: string) {
    return await prisma.user.findFirst({
      where: {
        sid: sid
      },
      select: publicUserSelect,
    })
  }

  async getUserByName(name: string) {
    return await prisma.user.findMany({
      where: {
        OR: [
          {
            sid: {
              contains: name,
              mode: 'insensitive'
            }
          },
          {
            username: {
              contains: name,
              mode: 'insensitive'
            }
          }
        ]
      },
      orderBy: [
        { record: 'desc' },
        { score: 'desc' }
      ],
      take: 20,
      select: publicUserSelect,
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
      },
      select: publicUserSelect,
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
      },
      select: publicUserSelect,
    })
  }

  async updateUserNameAndAvatar(user: IUserAvatarAndNameOption) {
    return await prisma.user.update({
      where: {
        sid: user.sid
      },
      data: {
        avatar: user.avatar,
        username: user.name,
      },
      select: publicUserSelect,
    })
  }

  async getAllUsers() {
    return await prisma.user.findMany({
      select: publicUserSelect,
    })
  }

  async getRankList() {
    return await prisma.user.findMany({
      where: {
        record: {
          gt: 0
        }
      },
      orderBy: [
        { score: 'desc' },
        { winRecords: 'desc' },
      ],
      select: {
        avatar: true,
        record: true,
        score: true,
        sid: true,
        username: true,
        winRecords: true,
      },
    })
  }

}
