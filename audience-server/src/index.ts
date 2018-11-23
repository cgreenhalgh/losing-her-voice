// server...
console.log(`audience-server starting`)

import * as express from 'express'
import * as path from 'path'
import * as http from 'http'
import * as socketio from 'socket.io'
//import * as bodyParser from 'body-parser'

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

// TODO: external but watched
let configuration:Configuration = {
  menuItems:[
    {
      title: 'About Geraldine',
      postPerformance: false,
      cards: [
        { html: '<h1>About Geraldine</h1><p>Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah.</p>' },
      ]
    }
  ],
  views:[
    {
      id:'act1.scene1',
      act:1,
      cards:[
        { html: '<h1>Act 1, Scene 1<h1><h2><em>Carmen</em>, The Opera</h2><p>A series of intertitles sets the scene as the curtain opens. Lilli makes a dramatic entrance from behind the screen as ‘Carmen’. The two Journalists sing their reviews of her performance in counterpoint from amidst the chorus who sit in the wings as ‘audience’. (Their reviews are adapted from actual reviews of Lehmann’s Metropolitan Opera ‘Carmen’ performance in New York newspapers.) Geraldine jumps up to applaud Lilli from the audience at the end of the scene.</p>' },
      ]
    }
  ],
}

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
    // TODO: real
    let reply:CurrentState = {
      //forceView:string
      allowMenu:true,
      postPerformance:false,
      //error:string
    }
    socket.emit(MSG_CURRENT_STATE, reply)
    socket.join(UPDATE_ROOM)
  });
});

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port, () => console.log(`API running on localhost:${port}`))
