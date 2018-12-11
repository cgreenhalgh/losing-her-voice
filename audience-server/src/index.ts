// server...
console.log(`audience-server starting`)

import * as express from 'express'
import * as path from 'path'
import * as http from 'http'
import * as socketio from 'socket.io'
//import * as bodyParser from 'body-parser'
import * as redis from 'redis'
import * as fs from 'fs'

import { MSG_CLIENT_HELLO, CURRENT_VERSION, ClientHello, 
  MSG_CLIENT_PING, ClientPing, MSG_OUT_OF_DATE, OutOfDate, 
  MSG_CURRENT_STATE, CurrentState, CurrentStateMsg, 
  MSG_CONFIGURATION, Configuration, ConfigurationMsg, 
  ServerTiming, ClientTiming, MSG_ANNOUNCE_ITEM, 
  AnnounceItem, MSG_FEEDBACK, FeedbackMsg, 
  CONFIGURATION_FILE_VERSION } from './types'
import { REDIS_CHANNEL_ANNOUNCE, Item, REDIS_CHANNEL_FEEDBACK } from './socialtypes'
const app = express()

// Parsers for POST data
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: false }));

// Point static path to dist
app.use(express.static(path.join(__dirname, '..', 'static')));

// Catch all other routes and return the index file
app.get('*', (req, res) => {
  //console.log(`get`)
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
let io = socketio(server)

const UPDATE_ROOM = "room.currentState"
let currentState:CurrentState = {
  allowMenu:true,
  postPerformance:false,
  serverStartTime:(new Date()).getTime(),
  serverSendTime:(new Date()).getTime(),
}

let configFile = path.join(__dirname, '..', 'data', 'audience-config.json');


// external but watched - empty default
let configuration:Configuration = {
  metadata: {
    title:'empty (builtin)',
    version: '0',
    fileVersion: CONFIGURATION_FILE_VERSION
  },
  menuItems:[],
  views:[],
  nameParts:[]
}

function readConfig() {
  fs.readFile(configFile, 'utf8', (err,data) => {
    if (err) {
      console.log(`ERROR reading config file ${configFile}: ${err.message}`, err)
      return
    }
    try {
      let json:any = JSON.parse(data)
      if (json.menuItems && json.views && json.metadata && json.nameParts && json.metadata.fileVersion == CONFIGURATION_FILE_VERSION) {
        configuration = json as Configuration
        console.log(`read config ${configFile}: "${configuration.metadata.title}" version ${configuration.metadata.version}`)
        return
      } else {
        console.log(`ERROR reading config file ${configFile}: does not appear to have correct type (${CONFIGURATION_FILE_VERSION})`)
      }
    }
    catch (err2) {
      console.log(`ERROR parsing config file ${configFile}: ${err2.message}`, err)
    }
  })
}
readConfig()

// will watch work? - didn't seem to work either (after first time)
fs.watch(configFile, {persistent:true}, () => {
  readConfig()
})

// fallback?! - didn't seem to work using docker cp (after first time) or with mount from vagrant/windows (at all)
/*
fs.watchFile(configFile, {persistent:true}, (curr, prev) => {
  if (curr.mtime > prev.mtime)
    readConfig()
})
*/
var sockets = {}

interface ClientInfo {
  version:number
  clientType:string // e.g. web/pwa, ios, android ??
  clientId:string
  timing:ServerTiming
}

// redis set-up
let redis_host = process.env.REDIS_HOST || '127.0.0.1';
let redis_config = { host: redis_host, port: 6379, auth_pass:null };
if (process.env.REDIS_PASSWORD) {
  redis_config.auth_pass = process.env.REDIS_PASSWORD;
}
console.log('using redis config ' + JSON.stringify(redis_config));

let redisPub = redis.createClient(redis_config);
redisPub.on("error", function (err) {
    console.log(`ERROR redisPub error ${err}`, err);
});

io.on('connection', function (socket) {
  console.log(`new socket io connection ${socket.id}...`)
  //socket.emit('news', { hello: 'world' });
  socket.on(MSG_CLIENT_HELLO, (data) => {
    let msg = data as ClientHello
    if (msg.version != CURRENT_VERSION) {
      let err:OutOfDate = {
        serverVersion:CURRENT_VERSION,
        clientVersion:msg.version,
      }
      console.log(`reject client with wrong version ${msg.version} should be ${CURRENT_VERSION}`,msg)
      socket.emit(MSG_OUT_OF_DATE, err)
      return
    }
    console.log(`Add new client type ${msg.clientType} id ${msg.clientId} (version ${msg.version})`,msg)
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
      timing:timing,
    }
    socket.myClientInfo = clientInfo
    if (!msg.configurationVersion || !configuration.metadata || msg.configurationVersion != configuration.metadata.version) {
      console.log(`sending configuration ${configuration.metadata.version} to client with ${msg.configurationVersion}`)
      socket.emit(MSG_CONFIGURATION, {
        configuration:configuration,
        timing: timing,
      })
    }
    currentState.serverSendTime = now
    socket.emit(MSG_CURRENT_STATE, {
      currentState: currentState,
      timing: timing,
    })
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
        let msg = JSON.stringify(fb.feedback)
        console.log(`relay feedback ${msg.substring(0,50)}...`)
        redisPub.publish(REDIS_CHANNEL_FEEDBACK, msg)
      }
    })
    sockets[socket.id] = socket
  });
  socket.on('disconnecting', (reason) => {
    console.log(`socket.io client ${socket.id} disconnecting`)
    delete sockets[socket.id]
  })
  socket.on('error', (err) => {
    console.log(`Warning: socket.io client ${socket.id} error ${err.message}`, err)
  })
});

const STATE_POST = "POST"
const STATE_INTERVAL = "INTERVAL"
const STATE_RESET = "RESET"
const SERVER_RELOAD = "RELOAD"

let redisSub = redis.createClient(redis_config);
redisSub.on("error", function (err) {
    console.log(`ERROR redis error ${err}`, err);
});
redisSub.on("subscribe", function (channel, count) {
  console.log(`subscribed to redis ${channel} (count ${count})`)
});
 
redisSub.on("message", function (channel, message) {
  console.log("sub channel " + channel + ": " + message);
  if (!message) 
    return;
  let now = (new Date()).getTime()
  if (STATE_RESET == message) {
    console.log('reset state')
    currentState.forceView = null
    currentState.allowMenu = true
    currentState.postPerformance = false
  } else if (STATE_INTERVAL == message) {
    console.log('interval state')
    currentState.forceView = null
    currentState.allowMenu = true
    currentState.postPerformance = false
  } else if (STATE_POST == message) {
    console.log('post state')
    currentState.forceView = null
    currentState.allowMenu = true
    currentState.postPerformance = true
  } else if (SERVER_RELOAD == message) {
    console.log('NOTE: reload configuration!')
    readConfig()
    return
  } else  {
    console.log(`force state ${message}`)
    currentState.forceView = message as string
    currentState.allowMenu = false
    currentState.postPerformance = false
  }
  currentState.serverStartTime = now
  currentState.serverSendTime = now
  for (let socketId in sockets) {
    let socket = sockets[socketId]
    let clientInfo:ClientInfo = socket.myClientInfo
    clientInfo.timing.serverSendTime = now
    let msg:CurrentStateMsg = {
      currentState:currentState,
      timing: clientInfo.timing
    }
    socket.emit(MSG_CURRENT_STATE, msg)
  }
});
 
redisSub.subscribe("lhva.state");

// social media
let redisSub2 = redis.createClient(redis_config);
redisSub.on("error", function (err) {
    console.log(`ERROR redis2 error ${err}`, err);
});
redisSub2.on("subscribe", function (channel, count) {
  console.log(`subscribed to redis2 ${channel} (count ${count})`)
});
 
redisSub2.on("message", function (channel, message) {
  if (!message) 
    return;
  let now = (new Date()).getTime()
  try {
    let item = JSON.parse(message) as Item
    console.log(`announce item ${item.id} (${item.itemType})`);
    for (let socketId in sockets) {
      let socket = sockets[socketId]
      let clientInfo:ClientInfo = socket.myClientInfo
      clientInfo.timing.serverSendTime = now
      let msg:AnnounceItem = {
        item:item,
        timing: clientInfo.timing
      }
      socket.emit(MSG_ANNOUNCE_ITEM, msg)
    }
  } catch (err) {
    console.log(`error parsing incoming item: ${err.message}`)
  }
});
 
redisSub2.subscribe(REDIS_CHANNEL_ANNOUNCE);

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port, () => console.log(`API running on localhost:${port}`))
