/**
 * @description User-Service parameters
 */
export interface IUserOptions {
  sid: string
  lid:string
  username?:string
  avatar?:string
  score:number
  record:number
  winRecords:number
  createAt:Date
  updateAt:Date
  deleteAt:Date
}

export interface IMatchOptions {
  id: string
  time:number
  urd?:boolean
  winner?:number
  players?:{
    sid:string
    lid:string

    score:number
    teamnumber:number
    kill:number
    assist:number
    death:number
    tower:number
    items:number
    normalSkill:string
    ultimateSkill:string
    doneDamage:number
    takeDamage:number
  }[]
}
