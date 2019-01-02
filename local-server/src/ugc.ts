// ugc, i.e. reposts and selfies (not images)
import * as redis from 'redis'

import { ShareItem } from './socialtypes'

const REPOSTS_PREFIX = 'lhva:reposts:v1:' // PERFORMANCEID:NAME
const SHARE_ITEMS_PREFIX = 'lhva:share:v1:' // PERFORMANCEID:PADNPOSTS:DATETIME:INDEX

export type AddShareItemCallback = (si:ShareItem) => void

export class UgcStore {
  store = null
  index:number = 0

  constructor() {
    let redis_host = process.env.STORE_HOST || '127.0.0.1';
    let redis_config = { host: redis_host, port: 6379, auth_pass:null };
    if (process.env.STORE_PASSWORD) {
      redis_config.auth_pass = process.env.STORE_PASSWORD;
    }
    
    console.log('ugc using local store config ' + JSON.stringify(redis_config));
    this.store = redis.createClient(redis_config);
    this.store.on('error', function (err) {
      console.log(`ERROR: image store: ${err.message}`, err)
    })
  }
  clearPerformance(performanceid:string) {
    console.log(`Note: clear UGC for performance ${performanceid}`)
    let si_key_prefix = `${SHARE_ITEMS_PREFIX}${performanceid}:`
    this.store.keys(si_key_prefix+'*', (err, reply) => {
      if(err) {
        return
      }
      for (let key of reply) {
        this.store.del(key)
      }
    })
    let reposts_key_prefix = `${REPOSTS_PREFIX}${performanceid}:`
    this.store.keys(reposts_key_prefix+'*', (err, reply) => {
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
        console.log(`ERROR getting keys for ShareItems: ${err.message}`, err)
        return
      }
      console.log(`found ${reply.length} ShareItems`)
      for (let key of reply) {
        this.store.get(key, (err, reply) => {
          if(err) {
            console.log(`ERROR getting for ShareItem ${key}: ${err.message}`, err)
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
            console.log(`error doing incr on ${reposts_key}: ${err.message}`)
            return
        }
        let padno = ("0000"+reposts).slice(-4)
        let now = new Date().getTime()
        let si_key = `${SHARE_ITEMS_PREFIX}${performanceid}:${padno}:${now}:${this.index++}`
        si.key = si_key
        let json = JSON.stringify(si)
        this.store.set(si_key, json, (err) => {
            if (err) {
                console.log(`error storing ShareItem ${json.substring(0, 50)}... as ${si_key}: ${err.message}`)
                return
            }
            console.log(`stored ShareItem ${json.substring(0, 50)}... as ${si_key}`)
            if (cb)
                cb(si)
        })
    })
  }
  deleteShareItem(si:ShareItem) {
    if (!si.key) {
      console.log(`error: cannot remove ShareItem with unspecified key`)
      return
    }
    this.store.del(si.key, (err) => {
      if (err) {
        console.log(`error deleting ShareItem ${si.key}`)
        return
      }
    })
  }
}
