// server...
console.log(`hello`)

import * as express from 'express'
import * as path from 'path'
import * as http from 'http'
import * as socketio from 'socket.io'
//import * as bodyParser from 'body-parser'
import { startOSCBridge } from './osc-bridge'

import { Item, ControlItem, MSG_CLIENT_HELLO, ClientHello, MSG_ANNOUNCE_CONTROL_ITEMS, AnnounceControlItems, MSG_ANNOUNCE_ITEMS, AnnounceItems, MSG_ANNOUNCE_ITEM, AnnounceItem, MSG_POST_ITEM, PostItem } from './types';

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

// test data
let DEFAULT_USER_ICON = '/assets/images/default_user.png'
let controlItems:ControlItem[] = [
    { id: '1',
      item: { title: 'Item 1 Item 1 Item 1 Item 1 Item 1 Item 1 Item 1 Item 1 Item 1 Item 1 Item 1 Item 1 Item 1', 
         user_icon: DEFAULT_USER_ICON, 
         date: 'Jul 13 20:42', 
         content: 'this and this ... this and this ... this and this ... this and this ... this and this ... this and this ... this and this ... this and this ... this and this ... ', 
         image: '/assets/images/default_user.png' },
      postCount: 0 },
    { id: '2',
      item: { title: 'Item 2', user_icon: DEFAULT_USER_ICON, date: 'Jul 13 20:45', content: 'this and this and the other... ' },
      postCount: 1 },
]
let items:Item[] = []

const ITEM_ROOM = 'items'

io.on('connection', function (socket) {
    console.log('new socket io connection...')
    //socket.emit('news', { hello: 'world' });
    socket.on(MSG_CLIENT_HELLO, (data) => {
        let msg = data as ClientHello
        console.log('new client hello');
        let msgcis:AnnounceControlItems = { controlItems: controlItems }
        socket.emit(MSG_ANNOUNCE_CONTROL_ITEMS, msgcis)
        let msgis:AnnounceItems = { items: items }
        socket.emit(MSG_ANNOUNCE_ITEMS, msgis)
        socket.join(ITEM_ROOM)
    });
    socket.on(MSG_POST_ITEM, (data) => {
        let msg = data as PostItem
        if (!msg.controlItem) {
            console.log('Error: post item with no controlItem', msg)
            return
        }
        if (!msg.controlItem.id) {
            console.log('Error: post item with controlItem without id', msg)
            return
        }
        console.log(`post item ${msg.controlItem.id}`)
        let controlItem = controlItems.find(item => item.id == msg.controlItem.id)
        if (controlItem) {
            controlItem.postCount++;
        } else {
            console.log(`Error: could not find item ${msg.controlItem.id}`)
        }
        if (msg.controlItem.item) {
            items.push(msg.controlItem.item);
            let msgai:AnnounceItem = { item: msg.controlItem.item }
            io.to(ITEM_ROOM).emit(MSG_ANNOUNCE_ITEM, msgai)
        } else {
            console.log('Error: post item with not item', msg)
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
