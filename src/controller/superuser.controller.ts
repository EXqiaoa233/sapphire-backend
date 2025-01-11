import { Body, Controller, Get, Inject, Post, Query } from "@midwayjs/core";
import { Context } from "@midwayjs/koa";
import { SuperuserService } from "../service/superuser.service";
import { UserService } from "../service/user.service";

export interface CreateSuperuserReq {
    account: string
    password: string
    username: string
    linksid: string
}

@Controller('/api/superuser')
export class SuperuserController {
    @Inject()
    ctx: Context

    @Inject()
    superuserService: SuperuserService

    @Inject()
    userService: UserService

    @Post('/')
    async createSuperuser(@Body() superuserReq: CreateSuperuserReq) {
        const { account, password, username, linksid } = superuserReq
        if (await this.superuserService.getSuperuser(superuserReq.account)) {
            return { success: true, message: 'Fail', data: '该账户已存在' };
        }
        const user = await this.userService.getUser(linksid)
        if (user == undefined) {
            return { success: true, message: 'Fail', data: '该SteamID无对局记录' };
        }

        if (user.superuserid != undefined) {
            return { success: true, message: 'Fail', data: '该SteamID已链接, 请联系LXS' };
        }

        const avatar = user.avatar
        const superuser = await this.superuserService.createSuperuser({ account: account, password: password, username: username, avatar: avatar })
        if (superuser == undefined) {
            return { success: true, message: 'Fail', data: '未知错误' };
        } else {
            await this.userService.linkUserToSuperuser(linksid, superuser.account)
            const data = await this.superuserService.getSuperuser(superuser.account)
            return { success: true, message: 'Ok', data: data };
        }
    }

    @Get('/')
    async getSuperuser(@Query('account') account: string) {
        const superuser = await this.superuserService.getSuperuser(account)
        return { success: true, message: 'Ok', data: superuser };
    }

    @Post('/login')
    async login(@Body() loginReq: { account: string, password: string }) {
        const superuser = await this.superuserService.getSuperuser(loginReq.account)
        if (superuser) {
            if (loginReq.password == superuser.password) {
                return { success: true, message: 'Ok', data: { ...superuser, ...{ password: undefined } } };
            } else {
                return { success: true, message: 'Fail', data: '密码错误' };
            }
        } else {
            return { success: true, message: 'Fail', data: '用户不存在' };
        }
    }
}