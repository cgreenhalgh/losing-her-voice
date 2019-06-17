// LHV clients.ts

import * as fs from 'fs' 
import * as dateFormat from 'dateformat'

if (process.argv.length < 3) {
  console.log("usage: node dist/clients.js <audience-logfile> ...")
  process.exit(-1)
}

let logfiles:string[] = []
for (let i=2; i<process.argv.length; i++) {
	logfiles.push(process.argv[i])
}	
interface ClientEvent {
	msg:string
	time:string
	info?:any
}
  	
interface LogEntry {
  msg:string
	time:string
	name:string
  hostname:string
  pid:number
  level:number
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
	PLAY = "play"
}
let userActions:string[] = [
  Msg.PATH, //? not alwyas
  Msg.VISIBLE, //duplicates?!
  Msg.HIDDEN,
  "name",
  Msg.TAKESELFIE, 
  "consent1", 
  Msg.CONSENT2,
  Msg.TAPTOSTART,
  "link",
  "like",
  "share",
  "choose.select",
  "choose",
  "clearuserdata"
]

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

let sortbytime = (e1:LogEntry, e2:LogEntry) => e1.time.localeCompare(e2.time)
entries = entries.sort(sortbytime)

class Client {
	constructor (
		public clientId:string,
		public performanceId:string
	) {}
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

for (let entry of entries) {
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
    for (let event of centry.events) {
    	let time = new Date(event.time).getTime()
    	if (newFlag || time<client.minTime)
    		client.minTime = time
      if (newFlag || time>client.maxTime)
      	client.maxTime = time
      newFlag = false
      client.events.push(event)
    }
	}
}

const PRE_SHOW_TIME_MS = 1*60*60*1000 // 1 hour
const SHOW_TIME_MS = 3*60*60*1000 // 3 hours (including interval and some time after)
const TIME_FORMAT = 'H:MM:ss'
const FIRST_PATH_TIME_MS = 300
const SHOW_HIDDEN_EVENTS = false

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
    client.events.sort(sortbytime)
    
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
    		client.path = event.info.path
    		client.pathShowItems = new RegExp("^\/[^\/]*\/posts$").test(client.path)
    	} else if (event.msg == Msg.ITEM) {
    		if (!client.onloadscreen && client.itemId != event.info.id && ((client.viewId && client.viewShowItems) || (!client.viewId && client.pathShowItems)))
    			visibleChange = true
    		client.itemId = event.info.id
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
    	
    	let date = event.time
    	let delta = new Date(event.time).getTime() - startTime
    	if (delta> -60*60*1000 && delta<0)
    		date = '-'+dateFormat(new Date(-delta), TIME_FORMAT)
    	else if (delta>=0 && delta< 24*60*60*1000)
    		date = '+'+dateFormat(new Date(delta), TIME_FORMAT)
      
    		
      if (!hiddenUserAction && !userAction && (!client.visible || !visibleChange)) {
      	// remove?
      	if (SHOW_HIDDEN_EVENTS)
         	console.log(`  [${date} ${event.msg} ${event.info ? JSON.stringify(event.info) : ''}]`)
      } else {
        let state = client.onloadscreen ? 'loadscreen' : (client.viewId ? `view ${client.viewId}` : `page ${client.path}`)
     	  let showItems = client.viewId ? client.viewShowItems : client.pathShowItems
     	  if (showItems)
     		  state = state + ` item ${client.itemType} ${client.itemId}`
     		let showInfo = event.info && event.msg != Msg.VIEW && event.msg != Msg.PATH && event.msg != Msg.ITEM
    	  console.log(`${hiddenUserAction ? '?' : (userAction ? '*' : ' ')} ${date} ${event.msg} ${state} ${showInfo ? JSON.stringify(event.info) : ''}`)
    	  if (event.msg == Msg.HIDDEN) {
     	  	client.visible = false
     	  }     
      }
    }
  }
}
