// moderation and that
import * as redis from 'redis'
import { createHash } from 'crypto'

import { SelfieImage, SelfieItem } from './socialtypes'

export type AddImageCallback = (si:SelfieImage, isNew:boolean) => void

const IMAGE_PREFIX = 'image:v1:'

export class SelfieStore {
  store = null
  
  constructor() {
    let redis_host = process.env.STORE_HOST || '127.0.0.1';
    let redis_config = { host: redis_host, port: 6379, auth_pass:null };
    if (process.env.STORE_PASSWORD) {
      redis_config.auth_pass = process.env.STORE_PASSWORD;
    }
    
    console.log('moderation using local store config ' + JSON.stringify(redis_config));
    this.store = redis.createClient(redis_config);
    this.store.on('error', function (err) {
      console.log(`ERROR: image store: ${err.message}`, err)
    })
  }
  
  addImage(si:SelfieImage, cb:AddImageCallback) {
    let hasher = createHash('sha256')
    hasher.update(si.image)
    si.hash = hasher.digest('hex')
    //console.log(`new image hashed to ${si.hash}`)
    this.store.get(IMAGE_PREFIX+si.hash, (err, reply) => {
      //console.log(`get ${IMAGE_PREFIX+si.hash} -> ${reply}`, reply)
      if (err) {
        console.log(`ERROR getting image ${si.hash}: ${err.message}`)        
      }
      if (reply) {
        //console.log(`new image ${si.hash} already stored`)
        try {
          let oldsi = JSON.parse(reply) as SelfieImage
          if (cb) {
            cb(oldsi, false)
          }
          return
        } catch (err) {
          console.log(`ERROR parsing store SelfieImage: ${err.message}`, reply)
        }
      }
      let newsi:SelfieImage = {
        image: si.image,
        hash: si.hash,
        rejected: false,
        approved: false,
        submitted: (new Date()).getTime()
      }
      let json = JSON.stringify(newsi)
      //console.log(`add new image ${newsi.hash}`)
      this.store.set(IMAGE_PREFIX+newsi.hash, json, (err, reply) => {
        if (err) {
          console.log(`ERROR saving image ${si.hash}: ${err.message}`)
          // give up?!
          return
        }
        if (cb)
          cb(newsi, true)
      })
    })
  }
  getImages(cb:AddImageCallback) {
    this.store.keys(IMAGE_PREFIX+'*', (err, reply) => {
      if(err) {
        console.log(`ERROR getting keys for images: ${err.message}`, err)
        return
      }
      console.log(`found ${reply.length} images`)
      for (let key of reply) {
        this.store.get(key, (err, reply) => {
          if(err) {
            console.log(`ERROR getting for image ${key}: ${err.message}`, err)
            return
          }
          if(cb)
            cb(JSON.parse(reply), false)
        })
      }
    })
  }
  update(si:SelfieImage) {
    let newsi:SelfieImage = {
      image: si.image,
      hash: si.hash,
      rejected: si.rejected,
      approved: si.approved,
      moderator: si.moderator,
      submitted: si.submitted
    }
    let json = JSON.stringify(newsi)
    //console.log(`add new image ${newsi.hash}`)
    this.store.set(IMAGE_PREFIX+newsi.hash, json, (err, reply) => {
      if (err) {
        console.log(`ERROR updating image ${si.hash}: ${err.message}`)
      }
    })
  }
}
