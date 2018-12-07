// server...
console.log(`hello`)

import * as express from 'express'
import * as path from 'path'
import * as http from 'http'
import * as fs from 'fs'
import * as socketio from 'socket.io'
//import * as bodyParser from 'body-parser'
import * as redis from 'redis'
import { startOSCBridge } from './osc-bridge'

import { CONFIGURATION_FILE_VERSION, Configuration, MSG_CLIENT_HELLO, 
  LOCAL_PROTOCOL_VERSION, ClientHello, MSG_OUT_OF_DATE, OutOfDate, 
  MSG_CONFIGURATION, ConfigurationMsg, MSG_ANNOUNCE_ITEMS, 
  AnnounceItems, MSG_ANNOUNCE_ITEM, AnnounceItem, MSG_POST_ITEM, 
  PostItem, MSG_UPDATE_ITEM, UpdateItem } from './types';
import { Item, SelfieImage, SimpleItem, SelfieItem, RepostItem, 
  QuizOrPollItem, QuizOption, ItemType, REDIS_CHANNEL_ANNOUNCE,
  REDIS_CHANNEL_FEEDBACK, Feedback
} from './socialtypes'

function startRedisPubSub() {
  // redis set-up
  let redis_host = process.env.REDIS_HOST || '127.0.0.1';
  let redis_config = { host: redis_host, port: 6379, auth_pass:null };
  if (process.env.REDIS_PASSWORD) {
    redis_config.auth_pass = process.env.REDIS_PASSWORD;
  }

  console.log('using redis config ' + JSON.stringify(redis_config));
  console.log(`publish announcements on ${REDIS_CHANNEL_ANNOUNCE}`)
  let redisPub = redis.createClient(redis_config);
  redisPub.on("error", function (err) {
    console.log(`ERROR redis error ${err}`, err);
  });
    
  console.log(`subscribe to feedback on ${REDIS_CHANNEL_FEEDBACK}`)
  let redisSub = redis.createClient(redis_config);
  redisSub.on("error", function (err) {
    console.log(`ERROR redis sub error ${err}`, err);
  });
  redisSub.subscribe(REDIS_CHANNEL_FEEDBACK)
  redisSub.on("subscribe", function (channel, count) {
    console.log(`subscribed to redis ${channel} (count ${count})`)
  });
 
  return [redisPub, redisSub]
}
let [redisPub, redisSub] = startRedisPubSub()

function announceItem(item:Item) {
  let msg = JSON.stringify(item)
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
  //console.log(`get`)
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
let io = socketio(server)

let configFile = path.join(__dirname, '..', 'data', 'local-config.json');
const SCHEDULE_ID_PREFIX = '_schedule_'
let nextScheduleItemId = 1


// external but watched - empty default
let configuration:Configuration = {
  metadata: {
    title:'empty (builtin)',
    version: '0',
    fileVersion: CONFIGURATION_FILE_VERSION
  },
  scheduleItems:[],
  selfies:[],
  reposters:[]
}

function replaceImageUrl(obj:any, property:string) : string {
  let url = obj[property]
  if (!url)
    return null
  let imageFile = path.join(__dirname, '..', 'static', 'images', url)
  fs.readFile(imageFile, {encoding:'binary'}, (err,data) => {
    if (err) {
      console.log(`Error: reading image file ${url} from ${imageFile}: ${err.message}`)
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
  }
}
function readConfig() {
  fs.readFile(configFile, 'utf8', (err,data) => {
    if (err) {
      console.log(`ERROR reading config file ${configFile}: ${err.message}`, err)
      return
    }
    try {
      let json:any = JSON.parse(data)
      if (json.metadata && json.metadata.fileVersion == CONFIGURATION_FILE_VERSION) {
        configuration = json as Configuration
        console.log(`read config ${configFile}: "${configuration.metadata.title}" version ${configuration.metadata.version}`)
        for (let si of configuration.scheduleItems) {
          if (!si.id)
            si.id = SCHEDULE_ID_PREFIX + (nextScheduleItemId++)
        }
        replaceImageUrls(configuration)
        return
      } else {
        console.log(`ERROR reading config file ${configFile}: does not appear to have correct type (${json.metadata ? json.metadata.fileVersion : "undefined fileVersion"})`)
      }
    }
    catch (err2) {
      console.log(`ERROR parsing config file ${configFile}: ${err2.message}`, err)
    }
  })
}
readConfig()

let items:Item[] = []

const ITEM_ID_PREFIX = '_server_'
let nextItemId = 1

const ITEM_ROOM = 'items'

redisSub.on("message", function (channel, message) {
  console.log(`feedback: ${message}`)
  try {
    let feedback = JSON.parse(message) as Feedback
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
        console.log(`likes for ${item.id} now ${simple.likes}`)
        let msgui:UpdateItem = {
          item:simple
        }
        io.to(ITEM_ROOM).emit(MSG_UPDATE_ITEM, msgui)
      } else {
        console.log(`warning: could not find liked item ${feedback.likeItem.id}`)
      }
    }
  } catch (err) {
    console.log(`error parsing feedback: {err.message}`)
  }
})

io.on('connection', function (socket) {
    console.log('new socket io connection...')
    //socket.emit('news', { hello: 'world' });
    socket.on(MSG_CLIENT_HELLO, (data) => {
        let msg = data as ClientHello
        console.log('new client hello', msg);
        if (LOCAL_PROTOCOL_VERSION != msg.version) { 
          console.log(`reject client - wrong protocol ${msg.version} vs ${LOCAL_PROTOCOL_VERSION}`)
          let ood:OutOfDate = {
            serverVersion:LOCAL_PROTOCOL_VERSION,
            clientVersion:msg.version
          }
          socket.emit(MSG_OUT_OF_DATE, ood)
          return
        }
        let msgconfig:ConfigurationMsg = { configuration: configuration }
        socket.emit(MSG_CONFIGURATION, msgconfig)
        let msgis:AnnounceItems = { items: items }
        socket.emit(MSG_ANNOUNCE_ITEMS, msgis)
        socket.join(ITEM_ROOM)
    });
    socket.on(MSG_POST_ITEM, (data) => {
        let msg = data as PostItem
        if (!msg.item) {
            console.log('Error: post item with no controlItem', msg)
            return
        }
        if (!msg.item.id) {
            msg.item.id = ITEM_ID_PREFIX + (nextItemId++)
            console.log(`Warning: post item without id -> ${msg.item.id}`)
        }
        if (msg.scheduleId) {
          let si = configuration.scheduleItems.find((si) => msg.scheduleId == si.id)
          if (!si) {
            console.log(`Warning: could not find posted schedule item ${msg.scheduleId}`)
          } else if (!si.postCount){
            si.postCount = 1;
          } else {
            si.postCount = 1+si.postCount;
          }
        }
        console.log(`post item ${msg.item.id}`)
        items.push(msg.item);
        let msgai:AnnounceItem = { item: msg.item }
        io.to(ITEM_ROOM).emit(MSG_ANNOUNCE_ITEM, msgai)
        if (msg.item.toAudience) {
          announceItem(msg.item)
        }
    })
});

/** 
 * OSC bridge
 */
startOSCBridge()
/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port, () => console.log(`API running on localhost:${port}`))
