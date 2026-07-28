import { MidwayConfig } from '@midwayjs/core';

export default {
  // use for cookie sign key, should change to your own and keep security
  keys: '1734940841578_2032',
  koa: {
    port: 7001,
  },
  bull:{
    defaultQueueOptions:{
      redis: {
        port:6379,
        host:'127.0.0.1',
        password:'EXqiaoa233-'
      }
    }
  }
} as MidwayConfig;
