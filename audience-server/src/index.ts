// server...
console.log(`audience-server starting`)

import * as express from 'express'
import * as path from 'path'
import * as http from 'http'
import * as socketio from 'socket.io'
//import * as bodyParser from 'body-parser'

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

io.on('connection', function (socket) {
    console.log('new socket io connection...')
    //socket.emit('news', { hello: 'world' });
/*    socket.on(MSG_CLIENT_HELLO, (data) => {
        let msg = data as ClientHello
        console.log('new client hello');
        let msgcis:AnnounceControlItems = { controlItems: controlItems }
        socket.emit(MSG_ANNOUNCE_CONTROL_ITEMS, msgcis)
        let msgis:AnnounceItems = { items: items }
        socket.emit(MSG_ANNOUNCE_ITEMS, msgis)
        socket.join(ITEM_ROOM)
    });
*/
});

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port, () => console.log(`API running on localhost:${port}`))
