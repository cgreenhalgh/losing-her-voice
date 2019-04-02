// moderation and that
import { log } from './logging'
import * as redis from 'redis'
import * as fs from 'fs'
import * as path from 'path'
import { createHash } from 'crypto'
import { startPing } from './utils'

import { SelfieImage, SelfieItem } from './socialtypes'

export type AddImageCallback = (si:SelfieImage, isNew:boolean) => void

const IMAGE_PREFIX = 'image:v2:'
const IMAGE_FILE_PREFIX = 'img';

export class SelfieStore {
  store = null
  
  constructor() {
    let redis_host = process.env.STORE_HOST || '127.0.0.1';
    let redis_config = { host: redis_host, port: 6379, auth_pass:null, retry_unfulfilled_commands: true };
    if (process.env.STORE_PASSWORD) {
      redis_config.auth_pass = process.env.STORE_PASSWORD;
    }
    
    log.debug({redisConfig:redis_config}, 'moderation local store config');
    this.store = redis.createClient(redis_config);
    this.store.on('error', function (err) {
      log.error({err:err}, `image store: ${err.message}`)
    })
    startPing(this.store)
   }
  
  addImage(si:SelfieImage, cb:AddImageCallback) {
    let hasher = createHash('sha256')
    hasher.update(si.image)
    si.hash = hasher.digest('hex')
    let key = `${IMAGE_PREFIX}${si.performanceid}:${si.hash}`
    //log.debug({}, `new image hashed to ${si.hash}`)
    this.store.get(key, (err, reply) => {
      //log.debug({reply:reply}, `get ${IMAGE_PREFIX+si.hash} -> ${reply}`)
      if (err) {
        log.error({}, `getting image ${key}: ${err.message}`)
      }
      if (reply) {
        //log.debug({}, `new image ${si.hash} already stored`)
        try {
          let oldsi = JSON.parse(reply) as SelfieImage
          if (cb) {
            cb(oldsi, false)
          }
          return
        } catch (err) {
          log.error({reply:reply}, `parsing store SelfieImage: ${err.message}`)
        }
      }
      let newsi:SelfieImage = {
        image: si.image,
        performanceid: si.performanceid,
        hash: si.hash,
        rejected: false,
        approved: false,
        submitted: (new Date()).getTime()
      }
      let json = JSON.stringify(newsi)
      //log.debug({}, `add new image ${newsi.hash}`)
      this.store.set(key, json, (err, reply) => {
        if (err) {
          log.error({}, `ERROR saving image ${key}: ${err.message}`)
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
        log.error({err:err}, `getting keys for images: ${err.message}`)
        return
      }
      log.info({}, `found ${reply.length} images`)
      for (let key of reply) {
        this.store.get(key, (err, reply) => {
          if(err) {
            log.error({err:err}, `getting for image ${key}: ${err.message}`)
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
      performanceid: si.performanceid,
      rejected: si.rejected,
      approved: si.approved,
      moderator: si.moderator,
      submitted: si.submitted
    }
    let json = JSON.stringify(newsi)
    let key = `${IMAGE_PREFIX}${si.performanceid}:${si.hash}`
    //log.debug({}, `add new image ${newsi.hash}`)
    this.store.set(key, json, (err, reply) => {
      if (err) {
        log.error({}, `ERROR updating image ${key}: ${err.message}`)
      }
    })
  }
  exportImages(performanceid:string, directory:string) {
    // TODO: implement
    let prefix = `${IMAGE_PREFIX}${performanceid}:*`
    this.store.keys(prefix, (err, reply) => {
      if(err) {
        log.error({err:err}, `ERROR getting keys for performance ${performanceid} images: ${err.message}`)
        return
      }
      log.info({}, `found ${reply.length} images for performance ${performanceid}`)
      for (let ki=0; ki<reply.length; ki++) {
        let key = reply[ki]
        this.store.get(key, (err, reply) => {
          if(err) {
            log.error({err:err}, `getting for image ${key}: ${err.message}`)
            return
          }
          try {
            let si:SelfieImage = JSON.parse(reply)
            if (!si.approved) {
                log.debug({}, `ignore ${si.rejected ? 'rejected' : 'unapproved'} image ${key}`)
                return
            }
            // e.g. data:image/png;base64,...
            //https://stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata
            if (!si.image) {
              log.warn({}, `no image in selfie image ${key}`)
              return
            }
            if (si.image.substring(0,5)!='data:') {
              log.warn({}, `selfie image ${key} does not seem to be data url: ${si.image.substring(0,50)}...`)
              return
            }
            // separate out the mime component
            let parts = si.image.split(',')
            let mimeString = parts[0].split(':')[1].split(';')[0];
            if (mimeString.substring(0,6)!='image/') {
              log.warn({}, `selfie image ${key} is not image mime type: ${si.image.substring(0,50)}...`)
              return
            }
            let fileExtension = mimeString.substring(6)
            // convert base64/URLEncoded data component to raw binary data held in a string
            let encoding = "binary"
            if (parts[0].indexOf('base64') >= 0)
              encoding = "base64"
            
            let filepath = path.join(directory, IMAGE_FILE_PREFIX+ki+'.'+fileExtension)
            fs.writeFile(filepath, parts[1], encoding, (err) => {
              if (err) {
                log.error({err:err}, `writing image ${key} to file ${filepath}: ${err.message}`)
              } else {
                log.info({}, `wrote image ${key} to file ${filepath}`)
              }
            })
          } catch (err2) {
            log.error({err:err2}, `exporting image ${key}: ${err2.message}`)
          }
        })
      }
    })
  }
}
