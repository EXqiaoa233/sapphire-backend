
import { Inject, Controller, Get, Query, Post, Body } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { UserService } from '../service/user.service';

export interface IUserReq {
  sid: string
  lid: string
}

export interface IUserUpdateOption {
  sid: string
  score: number
  record: number
  winRecords: number
}

export interface IUserAvatarAndNameOption {
  sid: string
  avatar: string
  name: string
}

@Controller('/user')
export class APIController {
  @Inject()
  ctx: Context;

  @Inject()
  userService: UserService;

  @Get('/')
  async getUser(@Query('sid') sid?: string, @Query('name') name?: string) {
    if (sid != undefined) {
      const user = await this.userService.getUser(sid);
      if (user != undefined) {
        return { success: true, message: 'OK', data: user };
      } else {
        const user = await this.userService.getUserByName(name)
        return { success: true, message: 'OK', data: user };
      }
    }
    if (name != undefined) {
      const user = await this.userService.getUserByName(name)
      return { success: true, message: 'OK', data: user };
    }
  }

  @Post('/')
  async gameGetUser(@Body() userReq: IUserReq) {
    let user = await this.userService.getUser(userReq.sid);
    if (user == undefined) {
      user = await this.userService.createUser({
        sid: userReq.sid,
        lid: userReq.lid,
      })
    }

    return { success: true, message: 'OK', data: user }
  }
}
