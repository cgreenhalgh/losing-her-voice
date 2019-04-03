// server...
import { log, logInit } from './logging'
logInit('local-server')
//log.info({}, 'hello')

import * as express from 'express'
import * as path from 'path'
import * as http from 'http'
import * as fs from 'fs'
import * as socketio from 'socket.io'
//import * as bodyParser from 'body-parser'
import * as redis from 'redis'
import { OSCBridge } from './osc-bridge'
import { startPing } from './utils'

import { SelfieStore } from './moderation'
import { UgcStore } from './ugc'

import { CONFIGURATION_FILE_VERSION, Configuration, MSG_CLIENT_HELLO, 
  LOCAL_PROTOCOL_VERSION, ClientHello, MSG_OUT_OF_DATE, OutOfDate, 
  MSG_CONFIGURATION, ConfigurationMsg, MSG_ANNOUNCE_ITEMS, 
  AnnounceItems, MSG_ANNOUNCE_ITEM, AnnounceItem, MSG_POST_ITEM, 
  PostItem, MSG_UPDATE_ITEM, UpdateItem, MSG_CLOSE_POLLS,
  VideoState, MSG_VIDEO_STATE, VideoMode, MSG_SELFIE_IMAGE,
  Performance, MSG_ANNOUNCE_PERFORMANCE, AnnouncePerformance,
  MSG_START_PERFORMANCE, StartPerformance, MSG_MAKE_ITEM, MakeItem,
  MSG_ANNOUNCE_SHARE_ITEM, AnnounceShareItem,
  MSG_ANNOUNCE_SHARE_SELFIE, AnnounceShareSelfie, OSC_GO, OSC_RESET, 
  OSC_PLAYHEAD_STAR, MSG_OSC_COMMAND, OscCommand, MSG_EXPORT_SELFIE_IMAGES,
  ExportSelfieImages, MSG_REDIS_STATUS, RedisStatus } from './types';
import { Item, SelfieImage, SimpleItem, SelfieItem, RepostItem, 
  QuizOrPollItem, QuizOption, ItemType, REDIS_CHANNEL_ANNOUNCE,
  REDIS_CHANNEL_FEEDBACK, Feedback, Announce, REDIS_LIST_FEEDBACK,
  ShareItem, ShareSelfie,
} from './socialtypes'


const PING_INTERVAL_MS  = 5000
/** 
 * OSC bridge
 */
let oscBridge = new OSCBridge()

function startRedisPubSub() {
  // redis set-up
  let redis_host = process.env.REDIS_HOST || '127.0.0.1';
  let redis_config = { host: redis_host, port: 6379, auth_pass:null, retry_unfulfilled_commands: true };
  if (process.env.REDIS_PASSWORD) {
    redis_config.auth_pass = process.env.REDIS_PASSWORD;
  }

  log.debug({info:redis_config}, 'redis config');
  log.info({}, `publish announcements on ${REDIS_CHANNEL_ANNOUNCE}`)
  let redisPub = redis.createClient(redis_config);
  redisPub.on("error", function (err) {
    log.error({err:err}, `redis publisher error ${err.message}`);
    publishRedisStatus(false, err.message)
  });
  //startPing(redisPub)
  redisPing(redisPub)
  setInterval(() => { 
    //console.log(`ping ${redisClient}`)
    redisPing(redisPub)
  }, PING_INTERVAL_MS)
  redisPub.on("connect", function() {
    log.debug({}, "redis published connected")
  });
    
  log.info({}, `subscribe to feedback on ${REDIS_CHANNEL_FEEDBACK}`)
  let redisSub = redis.createClient(redis_config);
  redisSub.on("error", function (err) {
    log.error({err:err}, `redis subscriber error ${err.message}`);
  });
  startPing(redisSub)
  redisSub.on("connect", function() {
    log.debug({}, "redis subscriber connected")
  });
  redisSub.subscribe(REDIS_CHANNEL_FEEDBACK)
  redisSub.on("subscribe", function (channel, count) {
    log.info({}, `subscribed to redis ${channel} (count ${count})`)
  });
 
  return [redisPub, redisSub]
}
let [redisPub, redisSub] = startRedisPubSub()

let performance:Performance = null

function announceItem(item:Item) {
  if (!performance) {
    log.warn({}, `cannot announce item for audience: performance not set`)
    return
  }
  let announce:Announce = {
    performanceid: performance.id,
    item:item
  }
  let msg = JSON.stringify(announce)
  redisPub.publish(REDIS_CHANNEL_ANNOUNCE, msg)
}


const app = express()

// Parsers for POST data
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: false }));

// Point static path to dist
app.use(express.static(path.join(__dirname, '..', 'static')));

// Catch all other routes and return the index file
app.get('*', (req, res) => {
  //log.debug({}, `get`)
  res.sendFile(path.join(__dirname, '..', 'static', 'index.html'));
})

/**
 * Get port from environment and store in Express.
 */
const port = process.env.PORT || '8080'
app.set('port', port)

/**
 * Create HTTP server.
 */
const server = http.createServer(app)
/**
 * add socket.io
 */
let io = socketio(server, {
  pingInterval: 20000,
  // increase timeout because of throttled client thread timers
  pingTimeout: 20000
})

let redisStatus:RedisStatus = {
  datetime: (new Date()).toUTCString(),
  error: 'unknown',
  ok: false
}
function redisPing(redisPub) {
  redisPub.ping(true, (err, reply) => {
    if(err) {
      log.error({err:err}, `ping: ${err.message}`)
      publishRedisStatus(false, err.message)
      return
    }
    publishRedisStatus(true, null)
  })
}

function publishRedisStatus(ok:boolean, error:string) {
  let date = (new Date()).toUTCString()
  let msg:RedisStatus = {
    ok: ok,
    error: error,
    datetime: date
  }
  redisStatus = msg
  io.to(ITEM_ROOM).emit(MSG_REDIS_STATUS, msg)
}

let configFile = path.join(__dirname, '..', 'data', 'local-config.json');
const SCHEDULE_ID_PREFIX = '_schedule_'
let nextScheduleItemId = 1
let selfieExportDir = path.join(__dirname, '..', 'selfies');

// external but watched - empty default
let configuration:Configuration = {
  metadata: {
    title:'empty (builtin)',
    version: '0',
    fileVersion: CONFIGURATION_FILE_VERSION
  },
  performances:[],
  scheduleItems:[],
  selfies:[],
  reposters:[]
}
let nextSelfieIndex = 0

function replaceImageUrl(obj:any, property:string) : string {
  let url = obj[property]
  if (!url)
    return null
  let imageFile = path.join(__dirname, '..', 'static', 'images', url)
  fs.readFile(imageFile, {encoding:'binary'}, (err,data) => {
    if (err) {
      log.warn({}, `reading image file ${url} from ${imageFile}: ${err.message}`)
      return
    }
    let ix = url.lastIndexOf('.')
    let extension = url.substring(ix+1)
    obj[property] = `data:image/${extension};base64,`+(Buffer.from(data, 'binary').toString('base64'))
  })
}
function replaceImageUrls(configuration:Configuration) {
  // to data urls?!
  for (let si of configuration.scheduleItems) {
    if (si.item) {
      if(si.item.user_icon)
        si.item.user_icon = replaceImageUrl(si.item, 'user_icon')
      let anyitem = si.item as any
      if (anyitem.image) {
        anyitem.image = replaceImageUrl(anyitem, 'image')
      }
    }
  }
  for (let s of configuration.selfies) {
    s.user_icon = replaceImageUrl(s, 'user_icon')
    if (s.image)
      s.image = replaceImageUrl(s, 'image')
  }
  for (let s of configuration.reposters) {
    s.user_icon = replaceImageUrl(s, 'user_icon')
  }
}
function readConfig() {
  fs.readFile(configFile, 'utf8', (err,data) => {
    if (err) {
      log.fatal({err:err}, `reading config file ${configFile}: ${err.message}`)
      return
    }
    try {
      let json:any = JSON.parse(data)
      if (json.metadata && json.metadata.fileVersion == CONFIGURATION_FILE_VERSION) {
        configuration = json as Configuration
        log.info({}, `read config ${configFile}: "${configuration.metadata.title}" version ${configuration.metadata.version}`)
        for (let si of configuration.scheduleItems) {
          if (!si.id)
            si.id = SCHEDULE_ID_PREFIX + (nextScheduleItemId++)
        }
        replaceImageUrls(configuration)
        return
      } else {
        log.fatal({}, `config file ${configFile}: does not appear to have correct type (${json.metadata ? json.metadata.fileVersion : "undefined fileVersion"})`)
      }
    }
    catch (err2) {
      log.fatal({err:err2}, `parsing config file ${configFile}: ${err2.message}`)
    }
  })
}
readConfig()

let items:Item[] = []
let shareItems:ShareItem[] = []
let shareSelfies:ShareSelfie[] = []

const ITEM_ID_PREFIX = '_server_'
let nextItemId = 1

const ITEM_ROOM = 'items'

const DEFAULT_VIDEO_STATE:VideoState = {
  mode:VideoMode.HIDE
}
let videoState:VideoState = DEFAULT_VIDEO_STATE

let selfieStore = new SelfieStore()
let ugcStore = new UgcStore()

redisSub.on("message", function (channel, message) {
  if (!performance) {
    log.info({}, `Note: delaying feedback while performance not set`)
    return
  }
  log.debug({}, `feedback ping - checking`)
  checkForFeedback()
})
function checkForFeedback() {
  redisPub.lpop(REDIS_LIST_FEEDBACK, (err, message) => {
    if (err) {
      log.error({}, `getting feedback from ${REDIS_LIST_FEEDBACK}: ${err.message}`)
      return
    }
    if (!message) {
      log.debug({}, `no (more) feedback in list ${REDIS_LIST_FEEDBACK}`)
      return
    }
    handleFeedback(message)
    // tail recurse?
    setTimeout(checkForFeedback, 0)
  })
}
function handleFeedback(message:string) {
  log.debug({}, `feedback: ${message.substring(0,50)}...`)
  try {
    let feedback = JSON.parse(message) as Feedback
    if (!feedback.performanceid) {
      log.warn({}, `discarding feedback with no performanceid: ${message.substring(0,50)}...`)
      return
    }
    // selfie handled any time!
    if (feedback.selfieImage) {
      if (!feedback.selfieImage.image) {
        log.warn({}, `ignore selfieImage with no image: ${message.substring(0,50)}...`)
        return
      }
      feedback.selfieImage.performanceid = feedback.performanceid
      //log.info({}`got new selfieItem for performance ${feedback.performanceid}...`)
      selfieStore.addImage(feedback.selfieImage, (newsi, isNew) => {
        // no image
        let logfeedback = {
            performanceid: feedback.performanceid,
            selfieImage: {
                // image
                performanceid: newsi.performanceid,
                hash: newsi.hash,
                rejected: newsi.rejected,
                approved: newsi.approved,
                moderator: newsi.moderator,
                submitted: newsi.submitted, // date
                isNew: isNew,
            },
        }
        log.info({feedback:logfeedback}, `feedback.selfieimage`)
        if (isNew) {
          io.to(ITEM_ROOM).emit(MSG_SELFIE_IMAGE, newsi)
        }
      })
      return
    }
    if (!performance) {
      log.warn({}, `ignoring feedback when performance not set: ${message.substring(0,50)}...`)
      return
    }
    if (performance.id != feedback.performanceid) {
      log.warn({},`ignoring feedback for another performance (${feedback.performanceid} vs ${performance.id}): ${message.substring(0,50)}...`)
      return
    }
    if (feedback.likeItem) {
      // like (simple message)
      if (!feedback.likeItem.likes)
        feedback.likeItem.likes = 1
      let item = items.find((item) => feedback.likeItem.id == item.id)
      if (item && item.itemType == ItemType.SIMPLE) {
        let simple = item as SimpleItem
        if (!simple.likes)
          simple.likes = feedback.likeItem.likes
        else
          simple.likes += feedback.likeItem.likes
        log.info({feedback:feedback}, 'feedback.like')
        let msgui:UpdateItem = {
          item:simple
        }
        log.info({item:getLogItem(simple)}, 'control.updateitem')
        io.to(ITEM_ROOM).emit(MSG_UPDATE_ITEM, msgui)
        items.filter((item) => item.itemType==ItemType.REPOST && (item as RepostItem).item.id == feedback.likeItem.id).forEach((item) => 
          (item as RepostItem).item = simple)
      } else {
        log.warn({}, `could not find liked item ${feedback.likeItem.id}`)
      }
    } else if (feedback.chooseOption) {
      // choose quiz/poll option
      if (!feedback.chooseOption.count)
        feedback.chooseOption.count = 1
      let item = items.find((item) => feedback.chooseOption.itemId == item.id)
      if (item && (item.itemType == ItemType.QUIZ || item.itemType == ItemType.POLL)) {
        let quiz = item as QuizOrPollItem
        if (!quiz.totalCount)
          quiz.totalCount = feedback.chooseOption.count
        else
          quiz.totalCount += feedback.chooseOption.count
        let option = quiz.options[feedback.chooseOption.option]
        if (!option) {
          log.warn({}, `could not find option ${feedback.chooseOption.option} in quiz ${quiz.id} (with ${quiz.options.length} options)`)
        } else {
          if (!option.count)
            option.count = feedback.chooseOption.count
          else
            option.count += feedback.chooseOption.count
          
          log.info({feedback:feedback}, 'feedback.chooseoption')
          if (quiz.updateLive) {
            let msgui:UpdateItem = {
              item:quiz
            }
            log.info({item:getLogItem(quiz)}, 'control.updateitem')
            io.to(ITEM_ROOM).emit(MSG_UPDATE_ITEM, msgui)
          }
        }
      } else {
        log.warn({}, `could not find quiz item ${feedback.chooseOption.itemId}`)
      }
    } else if (feedback.shareItem) {
      log.info({feedback:feedback}, 'feedback.share')
      ugcStore.addShareItem(feedback.shareItem, performance.id, onNewShareItem)
    } else if (feedback.shareSelfie) {
      // check if already moderated
      log.debug({}, `shareSelfie from ${feedback.shareSelfie.user_name} ${feedback.shareSelfie.image.substring(0,50)}...`)
      // TODO delay check until used??
      let si:SelfieImage = {
        image: feedback.shareSelfie.image,
        performanceid: performance.id,
      }
      selfieStore.addImage(si, (newsi, isNew) => {
        // no image
        let logfeedback = {
            performanceid: feedback.performanceid,
            shareSelfie: {
                user_name: feedback.shareSelfie.user_name,
                // image
                hash: newsi.hash,
                rejected: newsi.rejected,
                approved: newsi.approved,
                moderator: newsi.moderator,
                submitted: newsi.submitted, // date
                isNew: isNew,
            },
        }
        log.info({feedback:logfeedback}, `feedback.shareselfie`)
        if (isNew) {
          io.to(ITEM_ROOM).emit(MSG_SELFIE_IMAGE, newsi)
        }
        if (newsi.approved) {
          log.debug({}, `shareSelfie ${newsi.hash} from ${feedback.shareSelfie.user_name}`)
          ugcStore.addShareSelfie(feedback.shareSelfie, performance.id, onNewShareSelfie)
        } else if (newsi.rejected) {
          log.debug({}, `ignore rejected selfie from ${feedback.shareSelfie.user_name}`)
        } else {
          log.warn({}, `ignoring unmoderated selfie from ${feedback.shareSelfie.user_name}`)
        }
      })
    } else {
      log.warn({}, `warning: unhandled feedback ${message.substring(0,50)}...`)
    }
  } catch (err) {
    log.warn({}, `error parsing feedback: ${err.message}`)
  }
}

function onNewShareItem(si:ShareItem) {
  if (!si.key) {
      log.warn({shareItem:si}, `ignore ShareItem with no key`)
      return
  }
  shareItems.push(si)
  log.info({}, `new ShareItem: got ${shareItems.length} ShareItems`)
  let msg:AnnounceShareItem = {
    shareItem:si
  }
  io.to(ITEM_ROOM).emit(MSG_ANNOUNCE_SHARE_ITEM, msg)
  shareItems.sort((a,b) => a.key.localeCompare(b.key))
}
function onNewShareSelfie(ss:ShareSelfie) {
  if (!ss.key) {
      log.warn({shareSelfie:ss}, `ignore ShareSelfie with no key`)
      return
  }
  shareSelfies.push(ss)
  log.info({}, `new ShareSelfie: got ${shareSelfies.length} ShareSelfies`)
  let msg:AnnounceShareSelfie = {
    shareSelfie:ss
  }
  io.to(ITEM_ROOM).emit(MSG_ANNOUNCE_SHARE_SELFIE, msg)
  shareSelfies.sort((a,b) => a.key.localeCompare(b.key))
}
function getLogItem(item:Item) :any {
  let rawitem = item as any
  let logitem = {}
  for (let param in rawitem) {
      if ('user_icon' != param && 'image' != param)
        logitem[param] = rawitem[param]
  }
  return logitem
}

function addItem(item:Item) {
  // no user_icon or image(s)?
  log.info({item: getLogItem(item)}, 'control.additem')

  items.push(item);
  let msgai:AnnounceItem = { item: item }
  io.to(ITEM_ROOM).emit(MSG_ANNOUNCE_ITEM, msgai)
  if (item.toAudience) {
    announceItem(item)
  }
  if (item.itemType == ItemType.RESET) {
    log.info({}, "RESET items")
    items = []
  }
}

io.on('connection', function (socket) {
    log.debug({}, 'new socket io connection...')
    //socket.emit('news', { hello: 'world' });
    socket.on(MSG_CLIENT_HELLO, (data) => {
        let msg = data as ClientHello
        log.debug({msg:msg}, 'new client hello');
        if (LOCAL_PROTOCOL_VERSION != msg.version) { 
          log.error({}, `reject client - wrong protocol ${msg.version} vs ${LOCAL_PROTOCOL_VERSION}`)
          let ood:OutOfDate = {
            serverVersion:LOCAL_PROTOCOL_VERSION,
            clientVersion:msg.version
          }
          socket.emit(MSG_OUT_OF_DATE, ood)
          return
        }
        let msgconfig:ConfigurationMsg = { configuration: configuration }
        socket.emit(MSG_CONFIGURATION, msgconfig)
        if (performance) {
          let msgp:AnnouncePerformance = { performance: performance }
          socket.emit(MSG_ANNOUNCE_PERFORMANCE, msgp)
          let msgis:AnnounceItems = { items: items }
          socket.emit(MSG_ANNOUNCE_ITEMS, msgis)
          socket.emit(MSG_VIDEO_STATE, videoState)
        }
        selfieStore.getImages((si:SelfieImage, isNew:boolean) => {
          socket.emit(MSG_SELFIE_IMAGE, si)
        })
        socket.join(ITEM_ROOM)
        socket.emit(MSG_REDIS_STATUS, msg)
    });
    socket.on(MSG_START_PERFORMANCE, (data) => {
        let msg = data as StartPerformance
        if (!msg.performance) {
            log.error({msg:msg}, 'start performance with no performance')
            return
        }
        log.info({performance:msg.performance}, `control.startperformance`)
        performance = msg.performance
        oscBridge.setPerformanceid(performance.id)
        let msgp :AnnouncePerformance = { performance: msg.performance }
        io.to(ITEM_ROOM).emit(MSG_ANNOUNCE_PERFORMANCE, msgp)
        items = []
        shareItems = []
        shareSelfies = []
        ugcStore.clearPerformance(performance.id)
        configuration.scheduleItems.forEach((si) => si.postCount = 0)
        let msgconfig:ConfigurationMsg = { configuration: configuration }
        io.to(ITEM_ROOM).emit(MSG_CONFIGURATION, msgconfig)
        videoState = DEFAULT_VIDEO_STATE
        io.to(ITEM_ROOM).emit(MSG_VIDEO_STATE, videoState)
        // if persistent
        //ugcStore.getShareItems(performance.id, onNewShareItem)
        //ugcStore.getShareSelfies(performance.id, onNewShareSelfie)
        checkForFeedback()
    })
    socket.on(MSG_POST_ITEM, (data) => {
        let msg = data as PostItem
        if (!msg.item) {
            log.error({msg:msg}, 'Error: post item with no controlItem')
            return
        }
        if (!msg.item.id) {
            msg.item.id = ITEM_ID_PREFIX + (nextItemId++)
            log.debug({}, `post item without id -> ${msg.item.id}`)
        }
        if (msg.scheduleId) {
          let si = configuration.scheduleItems.find((si) => msg.scheduleId == si.id)
          if (!si) {
            log.warn({}, `Warning: could not find posted schedule item ${msg.scheduleId}`)
          } else if (!si.postCount){
            si.postCount = 1;
          } else {
            si.postCount = 1+si.postCount;
          }
        }
        log.debug({}, `post item ${msg.item.id}`)
        addItem(msg.item)
    })
    socket.on(MSG_MAKE_ITEM, (data) => {
        let msg = data as MakeItem
        if (!msg.itemType) {
            log.error({msg:msg}, 'make item with no itemType')
            return
        }
        if (msg.scheduleId) {
          let si = configuration.scheduleItems.find((si) => msg.scheduleId == si.id)
          if (!si) {
            log.warn({}, `could not find posted schedule item ${msg.scheduleId}`)
          } else if (!si.postCount){
            si.postCount = 1;
          } else {
            si.postCount = 1+si.postCount;
          }
        }
        log.debug({}, `make item ${msg.itemType}`)
        if (ItemType.REPOST == msg.itemType) {
          while (shareItems.length>0) {
            let shareItem = shareItems.splice(0, 1)[0]
            ugcStore.deleteShareItem(shareItem)
            let originalItem = items.find((i) => i.id == shareItem.id)
            if (!originalItem) {
                log.error({}, `cannot find original item ${shareItem.id} to share`)
                continue
            }
            let item:RepostItem = {
              id: ITEM_ID_PREFIX + (nextItemId++),
              itemType:ItemType.REPOST,
              user_name:shareItem.user_name,
              user_icon:originalItem.user_icon,
              item:originalItem,
              toAudience:originalItem.toAudience,
            }
            log.debug({}, `posted repost from ${shareItem.user_name} (${shareItem.key})`)
            addItem(item)
            return
          }
          if (configuration && configuration.reposters && configuration.reposters.length>0) {
            let simplePosts = items.filter((si) => (si.itemType==ItemType.SIMPLE && si.toAudience))
            if (simplePosts.length>0) {
              let ix = Math.floor(Math.random()*simplePosts.length)
              let post = simplePosts[ix] as SimpleItem
              let rix = Math.floor(Math.random()*configuration.reposters.length)
              if (configuration.reposters[rix].user_name == post.user_name)
                rix = (rix+1) % configuration.reposters.length
              let reposter = configuration.reposters[rix]
              let repost:RepostItem = {
                id: ITEM_ID_PREFIX + (nextItemId++),
                user_name: reposter.user_name,
                user_icon: reposter.user_icon,
                itemType: ItemType.REPOST,
                toAudience: post.toAudience,
                item: post
              }
              log.debug({}, `created new repost from reposter ${reposter.user_name}`)
              addItem(repost)
            } else {
              log.warn({}, `warning: no posted items to repost`)
            } 
          } else {
            log.warn({}, `no reposters defined`)
          }
        } else if (ItemType.SELFIE == msg.itemType) {
          while (shareSelfies.length>0) {
            let shareSelfie = shareSelfies.splice(0, 1)[0]
            ugcStore.deleteShareSelfie(shareSelfie)
            // Note, currently moderation checked before adding to shareSelfies
            let item:SelfieItem = {
              id: ITEM_ID_PREFIX + (nextItemId++),
              itemType:ItemType.SELFIE,
              user_name:shareSelfie.user_name,
              user_icon:shareSelfie.image,
              image:shareSelfie.image,
              toAudience:false,
            }
            log.debug({}, `posted selfie from ${shareSelfie.user_name} (${shareSelfie.key})`)
            addItem(item)
            return
          }
          if (configuration && configuration.selfies && configuration.selfies.length>0) {
            let six = (nextSelfieIndex++) % configuration.selfies.length
            let selfie = configuration.selfies[six]
            let item:SelfieItem = {
              id: ITEM_ID_PREFIX + (nextItemId++),
              itemType:ItemType.SELFIE,
              user_name:selfie.user_name,
              user_icon:selfie.user_icon,
              image:selfie.image,
              toAudience:false,
            }
            addItem(item)
          } else {
            log.warn({}, `no selfies available`)
          }
        } else {
          log.warn({}, `ignoring make item request for type ${msg.itemType}`)
        }
    })
    socket.on(MSG_CLOSE_POLLS, (data) => {
        let openPolls:QuizOrPollItem[] = items.filter((i) => (i.itemType==ItemType.POLL || i.itemType==ItemType.QUIZ) && !(i as QuizOrPollItem).closed) as QuizOrPollItem[]
        for (let openPoll of openPolls) {
            log.info({}, `close ${openPoll.itemType} ${openPoll.id}`)
            openPoll.closed = true
            if (openPoll.itemType==ItemType.POLL) {
                // most popular => 'correct'
                let maxCount = openPoll.options.map((option) => option.count ? option.count : 0).reduce((acc, x) => Math.max(acc, x), 0)
                openPoll.options.forEach((option) => option.correct = option.count && option.count >= maxCount)
            }
            let msgui:UpdateItem = {
              item:openPoll
            }
            log.info({item:getLogItem(openPoll)}, 'control.updateitem')
            io.to(ITEM_ROOM).emit(MSG_UPDATE_ITEM, msgui)
            if (msgui.item.toAudience) {
              announceItem(msgui.item)
            }
        }
    })
    socket.on(MSG_VIDEO_STATE, (data) => {
        let msg = data as VideoState
        if (!msg.mode) {
            log.error({msg:msg}, 'video state with no mode')
            return
        }
        videoState = msg
        log.info({}, `video state updated to ${videoState.mode} mode`)
        io.to(ITEM_ROOM).emit(MSG_VIDEO_STATE, videoState)
    })
    socket.on(MSG_SELFIE_IMAGE, (data) => {
        let msg = data as SelfieImage
        if (!msg.hash) {
            log.error({msg:msg}, 'selfie image with no hash')
            return
        }
        selfieStore.update(msg)
        log.info({}, `selfie ${msg.hash} updated, approved=${msg.approved}, rejected=${msg.rejected}, moderator=${msg.moderator}`)
    })
    socket.on(MSG_EXPORT_SELFIE_IMAGES, (data) => {
        let msg = data as ExportSelfieImages
        if (!msg.performance || !msg.performance.id) {
            log.error({msg:msg}, 'export selfie images with no performance id')
            return
        }
        log.info({}, `export selfies for performance ${msg.performance.id} to ${selfieExportDir}...`)
        selfieStore.exportImages(msg.performance.id, selfieExportDir)
    })
});

function relayOsc(command:string, args:any[]) {
  log.debug({}, `relay OSC command to UI: ${command}`)
  io.to(ITEM_ROOM).emit(MSG_OSC_COMMAND, { command: command })
}
oscBridge.addCommand(OSC_GO, relayOsc)
oscBridge.addCommand(OSC_RESET, relayOsc)
oscBridge.addCommand(OSC_PLAYHEAD_STAR, relayOsc)


/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port, () => log.warn({}, `API running on localhost:${port}`))
