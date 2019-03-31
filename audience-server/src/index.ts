// server...
import { log, logInit } from './logging'
logInit('audience-server')
//log.info({}, 'hello')

import * as express from 'express'
import * as path from 'path'
import * as http from 'http'
import * as socketio from 'socket.io'
import * as bodyParser from 'body-parser'
import * as redis from 'redis'
import * as fs from 'fs'

import { MSG_CLIENT_HELLO, CURRENT_VERSION, ClientHello, 
  MSG_CLIENT_PING, ClientPing, MSG_OUT_OF_DATE, OutOfDate, 
  MSG_CURRENT_STATE, CurrentState, CurrentStateMsg, 
  ServerTiming, ClientTiming, MSG_ANNOUNCE_ITEM, 
  AnnounceItem, MSG_FEEDBACK, FeedbackMsg, FeedbackPost, LogPost,
  LogResponse } from './types'
import { REDIS_CHANNEL_ANNOUNCE, Item, REDIS_CHANNEL_FEEDBACK, Announce,
  REDIS_LIST_FEEDBACK, ItemType, Feedback } from './socialtypes'
import { REDIS_CHANNEL_VIEW_STATE, ViewState } from './statetypes'

const app = express()

// Parsers for POST data
app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: false }));

// Point static path to dist
app.use(express.static(path.join(__dirname, '..', 'static')));

// CORS - only really for debug, though
app.use(function(req, res, next) {
  if (req.path == '/api/feedback'|| req.path=='/api/log') {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    //intercepts OPTIONS method
    if ('OPTIONS' == req.method) {
      //respond with 200
      res.sendStatus(200);
    }
    else {
    //move on
      next();
    }
  } else {
    //log.debug({},`use ${req.path}`)
    next();
  }
});
app.post('/api/feedback', (req, res) => {
  let fb = req.body as FeedbackPost
  if (CURRENT_VERSION != fb.clientVersion) {
    log.error({}, `post feedback, client version ${fb.clientVersion} vs server version ${CURRENT_VERSION}`)
    res.status(400).send(`Client version ${fb.clientVersion} vs server version ${CURRENT_VERSION}`)
    return
  }
  if (!fb.feedback) {
    log.error({fb:fb}, `error: post feedback missing feedback`)
    res.status(400).send(`feedback missing from request`)
    return
  }
  log.debug({}, `post feedback`)
  relayFeedback(fb.feedback, 'http')
  res.status(200).json("true");
})
app.post('/api/log', (req, res) => {
  let lp = req.body as LogPost
  if (CURRENT_VERSION != lp.clientVersion) {
    log.warn({}, `post log, client version ${lp.clientVersion} vs server version ${CURRENT_VERSION}`)
  }
  if (!lp.events) {
    log.error({lp:lp}, `error: post log missing events`)
    res.status(400).send(`events missing from log request`)
    return
  }
  if (!lp.clientId) {
    log.error({lp:lp}, `error: post log missing clientId`)
  }
  log.debug({}, `post log`)
  log.info(lp, 'client.log')
  let lr:LogResponse = {
    serverVersion: CURRENT_VERSION
  }
  res.status(200).json(lr);
})

// Catch all other routes and return the index file
app.get('*', (req, res) => {
  //log.debug({}, `get`)
  res.sendFile(path.join(__dirname, '..', 'static', 'index.html'));
})

/**
 * Get port from environment and store in Express.
 */
const port = process.env.PORT || '8081'
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

const UPDATE_ROOM = "room.currentState"

interface CurrentStates {
    [performanceid:string] : CurrentState
}
let currentStates:CurrentStates = {}
function getCurrentState(performanceid:string): CurrentState {
    if (!performanceid)
        return null
    let currentState = currentStates[performanceid]
    if (!currentState) {
        currentState = {
            allowMenu:true,
            postPerformance:false,
            prePerformance:true,
            inPerformance:false,
            serverStartTime:(new Date()).getTime(),
            serverSendTime:(new Date()).getTime(),
        }
        currentStates[performanceid] = currentState
    }
    return currentState
}
interface CurrentItems {
    [performanceid:string] : Item
}
let currentItems:CurrentItems = {}
function getCurrentItem(performanceid:string): Item {
    if (!performanceid)
        return null
    let currentItem:Item = currentItems[performanceid]
    if (!currentItem) {
        currentItem = {
            itemType:ItemType.BLANK,
            user_name: 'audience-server'
        }
        currentItems[performanceid] = currentItem
    }
    return currentItem
}
let configFile = path.join(__dirname, '..', 'data', 'audience-config.json');


var sockets = {}

interface ClientInfo {
  version:number
  clientType:string // e.g. web/pwa, ios, android ??
  clientId:string
  runId:string
  timing:ServerTiming
  performanceid:string
}

// redis set-up
let redis_host = process.env.REDIS_HOST || '127.0.0.1';
let redis_config = { host: redis_host, port: 6379, auth_pass:null };
if (process.env.REDIS_PASSWORD) {
  redis_config.auth_pass = process.env.REDIS_PASSWORD;
}
log.debug({redisConfig: redis_config}, 'redis config');

let redisPub = redis.createClient(redis_config);
redisPub.on("error", function (err) {
    log.error({err:err}, `redisPub error: ${err.message}`);
});

io.on('connection', function (socket) {
  log.debug({}, `new socket io connection ${socket.id}...`)
  //socket.emit('news', { hello: 'world' });
  socket.on(MSG_CLIENT_HELLO, (data) => {
    let msg = data as ClientHello
    if (msg.version != CURRENT_VERSION) {
      let err:OutOfDate = {
        serverVersion:CURRENT_VERSION,
        clientVersion:msg.version,
      }
      log.warn({msg:msg}, `reject client with wrong version ${msg.version} should be ${CURRENT_VERSION}`)
      socket.emit(MSG_OUT_OF_DATE, err)
      return
    }
    if (!msg.performanceid) {
      let err:OutOfDate = {
        serverVersion:CURRENT_VERSION,
        clientVersion:msg.version,
      }
      log.warn({msg:msg}, `reject client without performanceid`)
      socket.emit(MSG_OUT_OF_DATE, err)
      return
    }
    log.info({clientHello: msg},`client.hello`)
    //log.debug({}, `Add new client type ${msg.clientType} id ${msg.clientId} performance ${msg.performanceid} (version ${msg.version})`)
    let currentState = getCurrentState(msg.performanceid)
    // update client state / timing
    let now = (new Date()).getTime()
    let timing:ServerTiming = {
      lastClientSendTime: msg.clientSendTime,
      lastServerRecvTime: now,
      serverSendTime: now // immediate response(s)
    }
    // init client state
    let clientInfo:ClientInfo = {
      version:msg.version,
      clientType:msg.clientType,
      clientId:msg.clientId,
      runId:msg.runId,
      timing:timing,
      performanceid:msg.performanceid,
    }
    socket.myClientInfo = clientInfo
    currentState.serverSendTime = now
    socket.emit(MSG_CURRENT_STATE, {
      currentState: currentState,
      timing: timing,
    })
    let currentItem = getCurrentItem(msg.performanceid)
    if (currentItem) {
      let imsg:AnnounceItem = {
        item:currentItem,
        timing: timing
      }
      socket.emit(MSG_ANNOUNCE_ITEM, imsg)
    }
    socket.on(MSG_CLIENT_PING, (data2) => {
      let ping:ClientPing = data2 as ClientPing
      let now = (new Date()).getTime()
      if (ping.timing) {
        clientInfo.timing.lastClientSendTime = ping.timing.clientSendTime
        clientInfo.timing.lastServerRecvTime = now
      }
    })
    socket.on(MSG_FEEDBACK, (data2) => {
      let fb:FeedbackMsg = data2 as FeedbackMsg
      let now = (new Date()).getTime()
      if (fb.timing) {
        clientInfo.timing.lastClientSendTime = fb.timing.clientSendTime
        clientInfo.timing.lastServerRecvTime = now
      }
      if (fb.feedback) {
        fb.feedback.performanceid = clientInfo.performanceid
        relayFeedback(fb.feedback,'socket.io')
      }
    })
    sockets[socket.id] = socket
  });
  socket.on('disconnecting', (reason) => {
    if (socket.myClientInfo)
      log.info({clientInfo: socket.myClientInfo}, `client.disconnect`)
    else
      log.debug({}, `socket.io client ${socket.id} disconnecting`)
    delete sockets[socket.id]
  })
  socket.on('error', (err) => {
    log.warn({err:err}, `Warning: socket.io client ${socket.id} error ${err.message}`)
  })
});
function getLogItem(item:Item) :any {
  let rawitem = item as any
  let logitem = {}
  for (let param in rawitem) {
      if ('user_icon' != param && 'image' != param)
        logitem[param] = rawitem[param]
  }
  return logitem
}
function relayFeedback(feedback:Feedback, method:string) {
  let logFeedback = {
    // TODO clientId ?!
    performanceid: feedback.performanceid,
    likeItem: feedback.likeItem,
    shareItem:feedback.shareItem,
    chooseOption:feedback.chooseOption,
    // hash probably isn't set; no images in logs!
    selfieImage: feedback.selfieImage ? { performanceid: feedback.selfieImage.performanceid, hash: feedback.selfieImage.hash } : undefined,
    // hash probably isn't set; no image in logs!
    shareSelfie: feedback.shareSelfie ? { user_name: feedback.shareSelfie.user_name, hash: feedback.shareSelfie.hash } : undefined,
  }
  log.info({feedback:logFeedback, method:method}, `feedback.relay`)
  let msg = JSON.stringify(feedback)
  redisPub.rpush(REDIS_LIST_FEEDBACK, msg, (err, reply) => {
    if (err) {
      log.error({}, `ERROR saving feedback ${msg.substring(0,50)}...: ${err.message}`)
      // give up?!
      return
    }
    redisPub.publish(REDIS_CHANNEL_FEEDBACK, '')
  })
}

const STATE_POST = "POST"
const STATE_INTERVAL = "INTERVAL"
const STATE_RESET = "RESET"
const SERVER_RELOAD = "RELOAD"

let redisSub = redis.createClient(redis_config);
redisSub.on("error", function (err) {
    log.error({err:err}, `ERROR redis error ${err.message}`);
});
redisSub.on("subscribe", function (channel, count) {
  log.debug({}, `subscribed to redis ${channel} (count ${count})`)
});
 
redisSub.on("message", function (channel, message) {
  log.trace({}, "sub channel " + channel + ": " + message);
  if (!message) 
    return;
  try {
      let vs = JSON.parse(message) as ViewState
      if (!vs.performanceid) {
          log.warn({}, `ignore redis message without performanceid: ${message}`)
          return
      }
      let currentState = getCurrentState(vs.performanceid)
      let state = vs.state
      let now = (new Date()).getTime()
      if (STATE_RESET == state) {
        log.debug({}, `${vs.performanceid}: reset state`)
        currentState.forceView = null
        currentState.allowMenu = true
        currentState.postPerformance = false
        currentState.prePerformance = true
        currentState.inPerformance = false
      } else if (STATE_INTERVAL == state) {
        log.debug({}, `${vs.performanceid}: interval state`)
        currentState.forceView = null
        currentState.allowMenu = true
        currentState.postPerformance = false
        currentState.prePerformance = false
        currentState.inPerformance = true
      } else if (STATE_POST == state) {
        log.debug({}, `${vs.performanceid}: post state`)
        currentState.forceView = null
        currentState.allowMenu = true
        currentState.postPerformance = true
        currentState.prePerformance = false
        currentState.inPerformance = false
      } else  {
        log.debug({}, `${vs.performanceid}: force state ${state}`)
        currentState.forceView = state as string
        currentState.allowMenu = false
        currentState.postPerformance = false
        currentState.prePerformance = false
        currentState.inPerformance = false
      }
      currentState.serverStartTime = now
      currentState.serverSendTime = now
      log.info({performanceid: vs.performanceid, state: state, currentState: currentState}, 'announce.state')
      for (let socketId in sockets) {
        let socket = sockets[socketId]
        let clientInfo:ClientInfo = socket.myClientInfo
        if (clientInfo.performanceid != vs.performanceid)
          continue
        clientInfo.timing.serverSendTime = now
        let msg:CurrentStateMsg = {
          currentState:currentState,
          timing: clientInfo.timing
        }
        socket.emit(MSG_CURRENT_STATE, msg)
      }
   } catch (err) {
      log.error({err:err}, `Error parsing/handling state event ${err.message}`)
   }
});
 
redisSub.subscribe(REDIS_CHANNEL_VIEW_STATE);

// social media
let redisSub2 = redis.createClient(redis_config);
redisSub2.on("error", function (err) {
    log.error({err:err}, `redis2 error ${err.message}`);
});
redisSub2.on("subscribe", function (channel, count) {
  log.debug({}, `subscribed to redis2 ${channel} (count ${count})`)
});
 
redisSub2.on("message", function (channel, message) {
  if (!message) 
    return;
  let now = (new Date()).getTime()
  try {
    let announce = JSON.parse(message) as Announce
    if (!announce.performanceid || !announce.item) {
        log.warn({}, `ignore ill-formed announce ${message.substring(0, 50)}...`)
        return
    }
    log.info({performanceid:announce.performanceid, item: getLogItem(announce.item)}, `announce.item`);
    currentItems[announce.performanceid] = announce.item
    for (let socketId in sockets) {
      let socket = sockets[socketId]
      let clientInfo:ClientInfo = socket.myClientInfo
      if (clientInfo.performanceid != announce.performanceid)
        continue
      clientInfo.timing.serverSendTime = now
      let msg:AnnounceItem = {
        item:announce.item,
        timing: clientInfo.timing
      }
      socket.emit(MSG_ANNOUNCE_ITEM, msg)
    }
  } catch (err) {
    log.error({}, `parsing incoming item: ${err.message}`)
  }
});
 
redisSub2.subscribe(REDIS_CHANNEL_ANNOUNCE);

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port, () => log.warn({}, `API running on localhost:${port}`))
