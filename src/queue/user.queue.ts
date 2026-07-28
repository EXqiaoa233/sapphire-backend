import { IProcessor, Processor } from "@midwayjs/bull";
import { FORMAT, Inject, makeHttpRequest } from "@midwayjs/core";
import { UserService } from "../service/user.service";


@Processor('user', { repeat: { cron: FORMAT.CRONTAB.EVERY_PER_30_MINUTE } })
export class UserProcessor implements IProcessor {
    @Inject()
    userService: UserService;

    async execute() {
        const users = await this.userService.getAllUsers()
        const count = Math.ceil(users.length / 5)
        for (let i = 0; i < count; i++) {
            const qUsers = users.filter((v, idx) => idx >= i * 5 && idx < (i + 1) * 5)
            const result = await makeHttpRequest(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=9F6FC5D2536627F4155B92500CED669B&steamids=${qUsers.reduce((a, b) => a + `${b.lid},`, '')}`, { dataType: 'json', timeout: 5000 })
            //@ts-ignore
            await Promise.all(result.data.response.players.map(v => {
                return this.userService.updateUserNameAndAvatar({
                    sid: users.find(us => us.lid == v.steamid).sid,
                    avatar: v.avatarfull,
                    name: v.personaname
                })
            }))
        }

    }
}
