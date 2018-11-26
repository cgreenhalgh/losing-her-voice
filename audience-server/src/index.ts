// server...
console.log(`audience-server starting`)

import * as express from 'express'
import * as path from 'path'
import * as http from 'http'
import * as socketio from 'socket.io'
//import * as bodyParser from 'body-parser'
import * as redis from 'redis'
import * as fs from 'fs'

import { MSG_CLIENT_HELLO, CURRENT_VERSION, ClientHello, MSG_OUT_OF_DATE, OutOfDate, MSG_CURRENT_STATE, CurrentState, MSG_CONFIGURATION, Configuration } from './types'

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
}

let configFile = path.join(__dirname, '..', 'data', 'audience-config.json');


// external but watched - empty default
let configuration:Configuration = {
  metadata: {
    title:'empty (builtin)',
    version: '0'
  },
  menuItems:[],
  views:[]
}

function readConfig() {
  fs.readFile(configFile, 'utf8', (err,data) => {
    if (err) {
      console.log(`ERROR reading config file ${configFile}: ${err.message}`, err)
      return
    }
    try {
      let json:any = JSON.parse(data)
      if (json.menuItems && json.views && json.metadata) {
        configuration = json as Configuration
        console.log(`read config ${configFile}: "${configuration.metadata.title}" version ${configuration.metadata.version}`)
        return
      } else {
        console.log(`ERROR reading config file ${configFile}: does not appear to have correct type`)
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
io.on('connection', function (socket) {
  console.log('new socket io connection...')
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
    console.log(`Add new client`,msg)
    socket.emit(MSG_CONFIGURATION, configuration)
    socket.emit(MSG_CURRENT_STATE, currentState)
    socket.join(UPDATE_ROOM)
  });
});

const STATE_POST = "POST"
const STATE_INTERVAL = "INTERVAL"
const STATE_RESET = "RESET"
const SERVER_RELOAD = "RELOAD"

// redis set-up
let redis_host = process.env.REDIS_HOST || '127.0.0.1';
let redis_config = { host: redis_host, port: 6379, auth_pass:null };
if (process.env.REDIS_PASSWORD) {
  redis_config.auth_pass = process.env.REDIS_PASSWORD;
}
console.log('using redis config ' + JSON.stringify(redis_config));

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
  io.to(UPDATE_ROOM).emit(MSG_CURRENT_STATE,currentState)
});
 
redisSub.subscribe("lhva.state");

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port, () => console.log(`API running on localhost:${port}`))
