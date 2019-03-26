// ugc, i.e. reposts and selfies (not images)
import { log } from './logging'
import * as redis from 'redis'

import { ShareItem, ShareSelfie } from './socialtypes'

const REPOSTS_PREFIX = 'lhva:reposts:v1:' // PERFORMANCEID:NAME
const SHARE_ITEMS_PREFIX = 'lhva:share:v1:' // PERFORMANCEID:PADNPOSTS:DATETIME:INDEX
const SHARE_SELFIES_PREFIX = 'lhva:share.selfie:v1:' // PERFORMANCEID:DATETIME:INDEX

export type AddShareItemCallback = (si:ShareItem) => void
export type AddShareSelfieCallback = (ss:ShareSelfie) => void

export class UgcStore {
  store = null
  index:number = 0
  selfieIndex:number = 0

  constructor() {
    let redis_host = process.env.STORE_HOST || '127.0.0.1';
    let redis_config = { host: redis_host, port: 6379, auth_pass:null };
    if (process.env.STORE_PASSWORD) {
      redis_config.auth_pass = process.env.STORE_PASSWORD;
    }
    
    log.debug({redisConfig:redis_config}, 'ugc local store config');
    this.store = redis.createClient(redis_config);
    this.store.on('error', function (err) {
      log.error({err:err}, `image store: ${err.message}`)
    })
  }
  clearPerformance(performanceid:string) {
    log.info({}, `Note: clear UGC for performance ${performanceid}`)
    this.deletePrefix(`${SHARE_ITEMS_PREFIX}${performanceid}:`)
    this.deletePrefix(`${REPOSTS_PREFIX}${performanceid}:`)
    this.deletePrefix(`${SHARE_SELFIES_PREFIX}${performanceid}:`)
  }
  private deletePrefix(prefix:string) {
    this.store.keys(prefix+'*', (err, reply) => {
      if(err) {
        return
      }
      for (let key of reply) {
        this.store.del(key)
      }
    })
  }
  getShareItems(performanceid:string, cb:AddShareItemCallback) {
    let si_key_prefix = `${SHARE_ITEMS_PREFIX}${performanceid}:`
    this.store.keys(si_key_prefix+'*', (err, reply) => {
      if(err) {
        log.error({err:err}, `getting keys for ShareItems: ${err.message}`)
        return
      }
      log.info({}, `found ${reply.length} ShareItems`)
      for (let key of reply) {
        this.store.get(key, (err, reply) => {
          if(err) {
            log.error({err:err}, `getting for ShareItem ${key}: ${err.message}`)
            return
          }
          if(cb && reply)
            cb(JSON.parse(reply))
        })
      }
    })
  }
  addShareItem(si:ShareItem, performanceid:string, cb:AddShareItemCallback) {
    // TODO get & increment user share count
    let reposts_key = `${REPOSTS_PREFIX}${performanceid}:${si.user_name}`
    this.store.incr(reposts_key, (err, reposts) => {
        if (err) {
            log.error({}, `doing incr on ${reposts_key}: ${err.message}`)
            return
        }
        let padno = ("0000"+reposts).slice(-4)
        let now = new Date().getTime()
        let si_key = `${SHARE_ITEMS_PREFIX}${performanceid}:${padno}:${now}:${this.index++}`
        si.key = si_key
        let json = JSON.stringify(si)
        this.store.set(si_key, json, (err) => {
            if (err) {
                log.error({}, `storing ShareItem ${json.substring(0, 50)}... as ${si_key}: ${err.message}`)
                return
            }
            log.info({}, `stored ShareItem ${json.substring(0, 50)}... as ${si_key}`)
            if (cb)
                cb(si)
        })
    })
  }
  deleteShareItem(si:ShareItem) {
    if (!si.key) {
      log.error({shareItem:si}, `cannot remove ShareItem with unspecified key`)
      return
    }
    this.store.del(si.key, (err) => {
      if (err) {
        log.error({}, `deleting ShareItem ${si.key}`)
        return
      }
    })
  }
  getShareSelfies(performanceid:string, cb:AddShareSelfieCallback) {
    let si_key_prefix = `${SHARE_SELFIES_PREFIX}${performanceid}:`
    this.store.keys(si_key_prefix+'*', (err, reply) => {
      if(err) {
        log.error({err:err}, `ERROR getting keys for ShareSelfies: ${err.message}`)
        return
      }
      log.info({}, `found ${reply.length} ShareSelfies`)
      for (let key of reply) {
        this.store.get(key, (err, reply) => {
          if(err) {
            log.error({err:err}, `ERROR getting for ShareSelfie ${key}: ${err.message}`)
            return
          }
          if(cb && reply)
            cb(JSON.parse(reply))
        })
      }
    })
  }
  addShareSelfie(ss:ShareSelfie, performanceid:string, cb:AddShareSelfieCallback) {
    let now = new Date().getTime()
    let ss_key = `${SHARE_SELFIES_PREFIX}${performanceid}:${now}:${this.selfieIndex++}`
    ss.key = ss_key
    let json = JSON.stringify(ss)
    this.store.set(ss_key, json, (err) => {
      if (err) {
        log.error({}, `error storing ShareSelfie ${json.substring(0, 50)}... as ${ss_key}: ${err.message}`)
        return
      }
      log.info({}, `stored ShareSelfie ${json.substring(0, 50)}... as ${ss_key}`)
      if (cb)
        cb(ss)
    })
  }
  deleteShareSelfie(ss:ShareSelfie) {
    if (!ss.key) {
      log.error({shareSelfie:ss}, `cannot remove ShareSelfie with unspecified key`)
      return
    }
    this.store.del(ss.key, (err) => {
      if (err) {
        log.error({}, `error deleting ShareSelfie ${ss.key}`)
        return
      }
    })
  }
}
