// LHV clients.ts

import * as fs from 'fs' 

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
	CLIENT_LOG = "client.log",
	TAKESELFIE = "takeselfie",
	CONSENT2 = "consent2"
}

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
}
