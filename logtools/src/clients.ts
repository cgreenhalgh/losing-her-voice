// LHV clients.ts

import * as fs from 'fs' 
import * as dateFormat from 'dateformat'

if (process.argv.length < 4) {
  console.log("usage: node dist/clients.js <local-config.json> <audience-logfile> ...")
  process.exit(-1)
}

let configfile = process.argv[2]
console.log(`read local config ${configfile}`)
let configjson = fs.readFileSync(configfile, {encoding: 'utf8'})

import { Configuration, ScheduleItem } from './types';
import { Item, SelfieImage, SimpleItem, SelfieItem, RepostItem, 
  QuizOrPollItem, QuizOption, ItemType, ShareItem, 
} from './socialtypes'

let config:Configuration = JSON.parse(configjson) as Configuration

interface ItemInfo {
  itemNumber?:string
  itemType:ItemType
  description?:string
  content?:string	
  showIds:string[]
}
let items:ItemInfo[] = []
for (let si of config.scheduleItems) {
	if (si.item && si.item.toAudience && si.itemType == ItemType.SIMPLE) {
		let simple:SimpleItem = si.item as SimpleItem
		let item:ItemInfo = {
			itemNumber: si.itemNumber,
			itemType: si.itemType,
			description: si.description,
			content: simple.content,
			showIds: []
		}
	  console.log(`simple item ${item.itemNumber}, ${item.description}: ${item.content}`)
  	items.push(item)
	} else if (si.item && si.item.toAudience && (si.itemType == ItemType.QUIZ || si.itemType == ItemType.POLL)) {
		let quiz:QuizOrPollItem = si.item as QuizOrPollItem
		let item:ItemInfo = {
			itemNumber: si.itemNumber,
			itemType: si.itemType,
			description: si.description,
			content: quiz.content,
			showIds: []
		}
	  console.log(`quiz/poll item ${item.itemNumber}, ${item.description}: ${item.content}`)
		items.push(item)
  }
}
  
let logfiles:string[] = []
for (let i=3; i<process.argv.length; i++) {
	logfiles.push(process.argv[i])
}	
interface ClientEvent {
	msg:string
	time:string
	info?:any
	n?:number
	logEntry?:ClientLogEntry
}
  	
interface LogEntry {
  msg:string
	time:string
	name:string
  hostname:string
  pid:number
  level:number
  performanceid?:string
  item?:Item
}
interface ClientLogEntry extends LogEntry {
  clientId:string
  performanceId:string
  runId:string
  events:ClientEvent[]
}
enum Msg {
	LOAD = "load",
	TAPTOSTART = "taptostart",
	PATH = "path",
	ITEM = "item",
	VIEW = "view",
	NOVIEW = "noview",
	VISIBLE = "visible",
	HIDDEN = "hidden",
	CLIENT_LOG = "client.log",
	TAKESELFIE = "takeselfie",
	CONSENT2 = "consent2",
	PLAY = "play",
    LIKE = "like",
    CHOOSE = "choose",
    NAME = "name",
    ANNOUNCE_ITEM = "announce.item",
}
let userActions:string[] = [
  Msg.PATH, //? not alwyas
  Msg.VISIBLE, //duplicates?!
  Msg.HIDDEN,
  Msg.NAME,
  Msg.TAKESELFIE, 
  "consent1", 
  Msg.CONSENT2,
  Msg.TAPTOSTART,
  "link",
  Msg.LIKE,
  "share",
  "choose.select",
  Msg.CHOOSE,
  "clearuserdata"
]

let EPOCHS:number[] = [ -60*60*1000, 0.5*60*60*1000, 1.5*60*60*1000, 3*60*60*1000 ]
	
let entries:LogEntry[] = []

		
for (let logfile of logfiles) {
	let file = fs.readFileSync(logfile, 'utf-8')
	let newlines:string[] = file.split('\n')
	console.log(`read logfile ${logfile}: ${newlines.length} lines`)
	for (let lix in newlines) {
		let line = newlines[lix].trim()
		if (line.length==0)
			continue
		try {
			entries.push(JSON.parse(line) as LogEntry)
		} catch (err) {
			console.log(`Error: in ${logfile} line ${Number(lix)+1}: ${err.message} (${line.substring(0,50)}...)`)
		}
	}
}

let sortbyn = (e1:ClientEvent, e2:ClientEvent) => (e1.time == e2.time) ? ((e1.n!==undefined && e2.n!==undefined) ? e1.n - e2.n : 0) : e1.time.localeCompare(e2.time)

let sortbytime = (e1:LogEntry, e2:LogEntry) => e1.time.localeCompare(e2.time)
entries = entries.sort(sortbytime)

class Client {
	constructor (
		public clientId:string,
		public performanceId:string
	) {}
	runIds:string[] = []
	minTime:number
	maxTime:number
	events:ClientEvent[] = []
	takeselfie:boolean
	takeselfieTime:number
	consent2:boolean
	consent2Time:number
	onloadscreen?:boolean
	visible?:boolean
	visibleTime?:number
  viewId?:string
	viewShowItems?:boolean
  noviewTime?:number
	path?:string
	pathShowItems?:boolean // path '/.../posts'
	itemId?:string
  itemType?:string
    currentView:ViewInfo
    currentItemView:ViewInfo
    views:ViewInfo[] = []
    itemActions:ItemAction[] = []
    user_name?:string
}

interface ViewInfo {
    id:string
    onloadscreen?:boolean
    viewId?:string
    path?:string
    epoch?:number
    startTime?:number
    visibleTime?:number
}
interface ItemAction {
    performanceId:string
    itemId:string
    itemType:string
    seen?:boolean
    liked?:boolean
    choose?:boolean
    count?:number
}

interface ClientMap {
  [index: string]: Client;
}

interface PerformanceInfo {
	startTime:string
}

interface PerformanceMap {
	[index:string]: PerformanceInfo
}

let performances:PerformanceMap = {
		show1: { startTime: '2019-04-06T13:30:00Z' },
		show2: { startTime: '2019-04-07T18:00:00Z' },
//		test1: { startTime: '2019-04-05T13:00:00Z' } // dress rehearsal
}

let clients:Client[] = []
let clientMap:ClientMap = {}

const PRE_SHOW_TIME_MS = 1*60*60*1000 // 1 hour
const SHOW_TIME_MS = 3*60*60*1000 // 3 hours (including interval and some time after)

for (let entry of entries) {
	if (entry.msg == Msg.ANNOUNCE_ITEM && entry.item && entry.performanceid) {
		let simple:SimpleItem = entry.item as SimpleItem
		if (simple.itemType == ItemType.SIMPLE || simple.itemType == ItemType.QUIZ || simple.itemType == ItemType.POLL) {
			let time = new Date(entry.time).getTime()
			let performance = performances[entry.performanceid]
			if (performance) {
				let delta = time - new Date(performance.startTime).getTime()
				if (delta > -PRE_SHOW_TIME_MS && delta < SHOW_TIME_MS) {
  				let ii = items.find((ii) => ii.itemType == simple.itemType && ii.content == simple.content)
  				if (!ii) {
  					console.log(`Warning: cannot find ${entry.performanceid} ${simple.itemType} item ${simple.content}`)
  				} else {
  					let showId = entry.performanceid+':'+simple.id
  					if (ii.showIds.indexOf(showId) < 0) {
  						ii.showIds.push(showId)
  						console.log(`Found ${ii.itemType} ${ii.itemNumber} as ${showId}`)
  					}
  				}
				}
			}
		}
	}
	if (entry.msg == Msg.CLIENT_LOG) {
		let centry = entry as ClientLogEntry
    let clientId = centry.clientId
    if (!clientId) {
    	console.log(`missing client ID in client.log entry at ${centry.time}`)
    	continue
    }
    let client:Client = clientMap[clientId]
    let newFlag = false
    if (!client) {
    	client = new Client(clientId, centry.performanceId)
    	clientMap[clientId] = client
    	clients.push(client)
    	//console.log(`added client ${clientId} to ${client.performanceId} at ${centry.time}`)
    	newFlag = true
    }
    // only newest run id?!
    let runIx = client.runIds.indexOf(centry.runId)
    if (runIx<0) {
    	runIx = client.runIds.length
    	client.runIds.push(centry.runId)
    }
    if (runIx < client.runIds.length-1) {
    	console.log(`warning: ignore log from old runId ${centry.runId} vs current ${client.runIds[client.runIds.length-1]} for client ${client.clientId}`)
    	continue
    }
    for (let event of centry.events) {
    	let time = new Date(event.time).getTime()
    	if (newFlag || time<client.minTime)
    		client.minTime = time
      if (newFlag || time>client.maxTime)
      	client.maxTime = time
      newFlag = false
      event.logEntry = centry
      client.events.push(event)
    }
	}
}

const TIME_FORMAT = 'H:MM:ss'
const FIRST_PATH_TIME_MS = 300
const SHOW_HIDDEN_EVENTS = false

function dumpClientEvent (ev:ClientEvent): string {
	/*   msg:string
time:string
name:string
hostname:string
pid:number
level:number
clientId:string
performanceId:string
runId:string
events:ClientEvent[]
	*/
	let le:ClientLogEntry = {
			time: ev.logEntry.time,
			msg: ev.logEntry.msg,
			hostname: ev.logEntry.hostname,
			name: ev.logEntry.name,
			level: ev.logEntry.level,
			pid: ev.logEntry.pid,
			clientId: ev.logEntry.clientId,
			performanceId: ev.logEntry.performanceId,
			runId: ev.logEntry.runId,
			events: []
	}
/* 	msg:string
time:string
info?:any
n?:number
logEntry?:LogEntry */
  let ev2:ClientEvent = {
		time: ev.time,
		msg: ev.msg,
		info: ev.info,
		n: ev.n,
		logEntry: le
  }
  return JSON.stringify(ev2)
}

let outputClients:Client[] = []

for (let performanceId in performances) {
	console.log(`*** Performance ${performanceId} ***`)
	let performance = performances[performanceId]
	let pclients:Client[] = clients.filter((client) => client.performanceId == performanceId)
	let startTime = new Date(performance.startTime).getTime()
	for (let cix=0; cix<pclients.length; cix++) {
		let client = pclients[cix]
		if (client.events.length==0) {
			console.log(`Warning: performance ${performanceId} client ${client.clientId} has no events`)
			pclients.splice(cix, 1)
			cix--
			continue
		}
		if (client.minTime > startTime+SHOW_TIME_MS) {
			console.log(`Warning: performance ${performanceId} client ${client.clientId} starts after concert (${client.minTime} vs ${startTime})`)
			pclients.splice(cix, 1)
			cix--
			continue
		}
		if (client.maxTime < startTime-PRE_SHOW_TIME_MS) {
			console.log(`Warning: performance ${performanceId} client ${client.clientId} stops before concert (${client.maxTime} vs ${startTime})`)
			pclients.splice(cix, 1)
			cix--
			continue
		}
		for (let event of client.events) {
			if (event.msg == Msg.TAKESELFIE) {
				client.takeselfie = true
				client.takeselfieTime = new Date(event.time).getTime()-startTime
			}
			else if (event.msg == Msg.CONSENT2) {
				client.consent2 = true
				client.consent2Time = new Date(event.time).getTime()-startTime
			}
		}
	}
	console.log(`performance ${performanceId}, ${pclients.length} clients`)
	console.log(`takeselfies: ${pclients.filter((client)=>client.takeselfie).length}, consent2 ${pclients.filter((client)=>client.consent2).length}`)
  for (let client of pclients) {
    console.log(`- client ${client.clientId} (performance ${client.performanceId}):`)
    outputClients.push(client)
    client.events.sort(sortbyn)
    let levent:ClientEvent = null
    let lev2:ClientEvent = null
    for (let ei=0; ei<client.events.length; ei++) {
    	let event = client.events[ei]
  		let ev2:ClientEvent = {
 					time: event.time,
 					msg: event.msg,
 					info: event.info,
 					n: event.n,
  		}
    	if (levent) {
    		if (!event.n) {
    			//console.log(`warning: event without n: ${dumpClientEvent(event)}`)
    		}
    		if (event.n && levent.n) {
    			if (event.n == levent.n) {
      			// ignore equal for now; happens sometimes
    			} else if (event.n < levent.n) {
         		console.log(`Warning: event ${levent.n} -> ${event.n} for client ${client.clientId}: ${dumpClientEvent(levent)} -> ${dumpClientEvent(event)}`)
       		}
    		}
      	if (JSON.stringify(ev2) == JSON.stringify(lev2)) {
      		//console.log(`duplicate event ${event.n} for client ${client.clientId}: ${dumpClientEvent(levent)} -> ${dumpClientEvent(event)}`)
    	  	client.events.splice(ei, 1)
    		  ei--
    	  } 
    	  if (event.time.localeCompare(levent.time) <0) {
    	  	console.log(`Warning: time reversal ${levent.time} -> ${event.time} for ${client.clientId}: ${dumpClientEvent(levent)} -> ${dumpClientEvent(event)}`)
    	  }
    	}
    	levent = event
    	lev2 = ev2
    }    
    for (let event of client.events) {
    	let time = new Date(event.time).getTime()
    	let visibleChange = false
    	let userAction = userActions.indexOf(event.msg) >= 0
    	let hiddenUserAction = false
    	if (event.msg == Msg.LOAD) {
    		if (!client.onloadscreen)
    			visibleChange = true
    		client.onloadscreen = true
    	} else if (event.msg == Msg.TAPTOSTART) {
    		client.onloadscreen = false
    		visibleChange = true
    	}
    	else if (event.msg == Msg.PATH) {
    		if (!client.onloadscreen && !client.viewId && client.path != event.info.path)
    			visibleChange = true
    		// initial path
    		if (client.visibleTime && time < client.visibleTime + FIRST_PATH_TIME_MS) {
    			userAction = false
    			client.visibleTime = 0
    		}
    		// auto-path after act
    		if (client.noviewTime && time < client.noviewTime + FIRST_PATH_TIME_MS) {
    			userAction = false
    			client.noviewTime = 0
    		} 		
    	  // default paths
    	  if ((!client.path && event.info.path == '/'+client.performanceId) || (client.path == '/'+client.performanceId && event.info.path == '/'+client.performanceId+'/home'))
    	  	userAction = false
            let pix = event.info.path.lastIndexOf('/')
    		client.path = event.info.path.substring(pix+1)
    		client.pathShowItems = 'posts'==client.path
    	} else if (event.msg == Msg.ITEM) {
    		if (!client.onloadscreen && client.itemId != event.info.id && ((client.viewId && client.viewShowItems) || (!client.viewId && client.pathShowItems)))
    			visibleChange = true
            if (event.info.itemType == 'blank' || event.info.itemType=='reset') {
                client.itemId = null
            } else {
            	let showId = client.performanceId+':'+event.info.id
            	let ii = items.find((ii) => ii.showIds.indexOf(showId)>=0)
            	if (ii) { 
            		client.itemId = ii.description+'-'+event.info.itemType+'_'+ii.itemNumber
            	} else {
            		console.log(`Warning: cannot find ${client.performanceId} ${event.info.itemType} item ${event.info.id}`)
              	client.itemId = event.info.id
            	}
            }
    		client.itemType = event.info.itemType
    	} else if (event.msg == Msg.VIEW) {
    		if (!client.onloadscreen && client.viewId != event.info.id)
    			visibleChange = true
    		client.viewId = event.info.id
    		client.viewShowItems = event.info.showItems
    	} else if (event.msg == Msg.NOVIEW) {
    		if (!client.onloadscreen && !client.viewId)
    			visibleChange = true
    		client.viewId = null
    		client.viewShowItems = false
    		client.noviewTime = time
    	} else if (event.msg == Msg.PLAY) {
    		if (client.visible || client.onloadscreen)
    			visibleChange = true
    	}

    	let date = event.time
    	let delta = new Date(event.time).getTime() - startTime
    	if (delta> -60*60*1000 && delta<0)
    		date = '-'+dateFormat(new Date(-delta), TIME_FORMAT)
    	else if (delta>=0 && delta< 24*60*60*1000)
    		date = '+'+dateFormat(new Date(delta), TIME_FORMAT)

    		let epoch = EPOCHS.filter((t) => (delta > t)).length

        let viewId = (client.viewId ? 'view:'+client.viewId : (client.path ? 'path:'+epoch+':'+client.path : 'unknown')) + (client.onloadscreen ? ':loadscreen' : '')
        let view:ViewInfo = client.views.find((v) => v.id == viewId)
        if (!view) {
            view = {
                id: viewId,
                onloadscreen: client.onloadscreen,
                startTime: time
            }
            //if (!client.onloadscreen)
            view.viewId = client.viewId
            if(/*!client.onloadscreen &&*/ !client.viewId) {
              view.path = client.path
              view.epoch = epoch
            }
        }
        if (client.currentView && client.visible) {
            if (client.currentView.visibleTime === undefined)
                client.currentView.visibleTime = 0
            client.currentView.visibleTime += (time - client.currentView.startTime)
        }
        view.startTime = time
       
    	if (event.msg == Msg.VISIBLE) {
    		visibleChange = !client.visible
    		userAction = !client.visible
    		client.visible = true
    		client.visibleTime = new Date(event.time).getTime()
    	}
    	else if (event.msg == Msg.HIDDEN) {
    		visibleChange = client.visible
    	} else if (userAction && !client.visible) {
    		hiddenUserAction = true    		
    	}
        let itemAction:ItemAction = null
        let showItems = client.onloadscreen ? false : (client.viewId ? client.viewShowItems : client.pathShowItems)
        if (client.itemId && (showItems || event.msg == Msg.LIKE || event.msg == Msg.CHOOSE)) {
            // TODO map item ID to global ID
            let itemId = view.id+':'+client.itemType+':'+client.itemId
            itemAction = client.itemActions.find((ia) => ia.itemId == client.itemId) // itemId
            if (!itemAction) {
                itemAction = {
                    itemId: client.itemId, //itemId,
                    itemType: client.itemType,
                    performanceId: performanceId
                }
                client.itemActions.push(itemAction)
            }
        }
        if (client.visible && event.msg != Msg.HIDDEN) {
            if (!client.views.find((v) => v.id == view.id)) {
                client.views.push(view)
            }
            client.currentView = view
            if (showItems && itemAction) {
                itemAction.seen = true
            }
        } else {
            client.currentView = null
        }
        if (itemAction && event.msg == Msg.LIKE) {
            itemAction.liked = true
        }
        if (itemAction && event.msg == Msg.CHOOSE) {
            itemAction.choose = true
        }
        if (event.msg == Msg.NAME || event.msg == Msg.CONSENT2) {
        	// page-based user actions
        	let itemId = 'user:'+viewId+':'+event.msg
          itemAction = client.itemActions.find((ia) => ia.itemId == itemId)
          if (!itemAction) {
              itemAction = {
                  itemId: itemId,
                  itemType: event.msg,
                  performanceId: performanceId,
                  count: 0
              }
              client.itemActions.push(itemAction)
          }
        	itemAction.count++
        }
      	if (event.msg == Msg.NAME) {
      		client.user_name = event.info.user_name
      	}
    		
      if (!hiddenUserAction && !userAction && (!client.visible || !visibleChange)) {
      	// remove?
      	if (SHOW_HIDDEN_EVENTS)
         	console.log(`  [${date} ${event.msg} ${event.info ? JSON.stringify(event.info) : ''}]`)
      } else {
        let state = client.onloadscreen ? 'loadscreen' : (client.viewId ? `view ${client.viewId}` : `page ${client.path}`)
     	  if (showItems)
     		  state = state + ` item ${client.itemType} ${client.itemId}`
     		let showInfo = event.info && event.msg != Msg.VIEW && event.msg != Msg.PATH && event.msg != Msg.ITEM
     		if (event.msg == Msg.HIDDEN)
     			console.log(`${hiddenUserAction ? '?' : (userAction ? '*' : ' ')} ${date} ${event.msg}`)
     		else
     			console.log(`${hiddenUserAction ? '?' : (userAction ? '*' : ' ')} ${date} ${event.msg} ${state} ${showInfo ? JSON.stringify(event.info) : ''}`)
    	  if (event.msg == Msg.HIDDEN) {
     	  	client.visible = false
     	  }     
      }
    }
  }
}

function escapeCsv(text:string): string {
    if (!text)
        return '';
    text = String(text);
    if (text.indexOf('"')>=0 || text.indexOf(',')>=0 || text.indexOf('\n')>=0) {
        var out = '"';
        for (var i=0; i<text.length; i++) {
            var c = text.substring(i,i+1);
            if ('"'==c) {
                out = out + '""';           
            } else if ('\n'==c){
                out = out + '\n';
            } else {
                out = out + c;
            }
        }
        out = out + '"';
        return out;
    }
    return text;
}

let keys:string[] = []
keys.push('clientId')
keys.push('performance')
keys.push('minTime')
keys.push('maxTime')
keys.push('user_name')
keys.push('selfie')
keys.push('posts')
keys.push('like')
keys.push('choose')
keys.push('on')
for (let epoch=0; epoch<=EPOCHS.length; epoch++) {
	keys.push('pages:'+epoch)
}
for (let act=1; act<=2; act++) {
	keys.push('views:act'+act)
}
let rows = []
let viewIds:string[] = []
let itemIds:string[] = []
for (let client of outputClients) {
    let row = {}
    row['clientId'] = client.clientId
    row['performance'] = client.performanceId
    row['minTime'] = client.minTime ? new Date(client.minTime).toISOString() : ''
    row['maxTime'] = client.maxTime ? new Date(client.maxTime).toISOString() : ''
    row['user_name']  = client.user_name
    
    row['selfie'] = client.consent2 ? 'Y' : ''
    row['posts'] = client.itemActions.filter((ia) => ia.seen || ia.liked || ia.choose).length
    row['like'] = client.itemActions.filter((ia) => ia.liked).length
    row['choose'] = client.itemActions.filter((ia) => ia.choose).length
    
    let total = 0
    let totals:number[] = []
    for (let epoch=0; epoch<=EPOCHS.length; epoch++) {
    	totals[epoch] = 0
    }
    let vtotals:number[] = []
    for (let act=1; act<=2; act++) {
    	vtotals[act] = 0
    }
    for (let view of client.views) {
        if (viewIds.indexOf(view.id) < 0) 
            viewIds.push(view.id)
        if (view.visibleTime!==undefined) {
        	  total += 0.001*view.visibleTime
            row[view.id] = 0.001*view.visibleTime
            if (view.path)
            	totals[view.epoch] += 0.001*view.visibleTime
            if (view.id.substring(0,8)=='view:act')
            	vtotals[Number(view.id.substring(8,9))] += 0.001*view.visibleTime
        }
    }
    row['on'] = total
    for (let epoch=0; epoch<=EPOCHS.length; epoch++) {
    	row['pages:'+epoch] = totals[epoch]
    }
    for (let act=1; act<=2; act++) {
    	row['views:act'+act] = vtotals[act]    	
    }
    for (let itemAction of client.itemActions) {
        if (itemIds.indexOf(itemAction.itemId) < 0)
            itemIds.push(itemAction.itemId)
        if (itemAction.choose || itemAction.liked || itemAction.seen)
            row[itemAction.itemId] = itemAction.choose ? 3 : (itemAction.liked ? 2 : 1 )
            else if (itemAction.count)
            	row[itemAction.itemId] = itemAction.count
    }
    rows.push(row)
    console.log(`client ${client.clientId}`, row)
}
viewIds.sort((a,b) => a.localeCompare(b))
for (let viewId of viewIds) 
  keys.push(viewId)
itemIds.sort((a,b) => {
	if (a.substring(0,4)=='user' || b.substring(0,4)=='user')
		return a.localeCompare(b)
	else if (a.substring(0,4)=='user')
		return -1
	else if (b.substring(0,4)=='user')
    return 1
  let n1 = Number(a.substring(a.lastIndexOf('_')+1))
  let n2 = Number(b.substring(b.lastIndexOf('_')+1))
  return n1==n2 ? a.localeCompare(b) : n1-n2
})
for (let itemId of itemIds) 
  keys.push(itemId)

let out = ''
for (let key of keys) {
    if (out.length>0)
        out += ','
    out += escapeCsv(key)
}
out += '\n'
for (let row of rows) {
    let line = ''
    for (let key of keys) {
        if (line.length>0)
            line += ','
        line += escapeCsv(row[key]!==undefined ? String(row[key]) : undefined)
    }
    line += '\n'
    out += line
}

let outfilename = 'data/clients.csv'
console.log(`write to ${outfilename}`)
fs.writeFileSync(outfilename, out, {encoding:'utf8'})

