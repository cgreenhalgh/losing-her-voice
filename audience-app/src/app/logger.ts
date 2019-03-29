import { CURRENT_VERSION, LogPost, Event } from './types';
import { HttpClient, HttpResponse, HttpHeaders } from '@angular/common/http';
import * as localforage from "localforage";
//import { LocalForage } from "localforage";


const NEXT_EVENT = "event.next"
const POSTED_EVENT = "event.posted"
const DELETED_EVENT = "event.deleted"
const EVENT_PREFIX = "event:"
const EVENT_STORE = "lhv_events:"
const POST_INTERVAL_MS = 2*60*1000 // 2 minutes
const POST_INTERVAL_JITTER_MS = 10*1000

enum LogState {
    STARTING,
    RELOADING,
    RUNNING,
    POSTING,
}
enum DeleteState {
    STARTING,
    ACTIVE,
}

export class Logger {
    startingEvents:Event[] = []
    postEventLogs:LogPost[] = []
    reloadEventLogs:LogPost[] = []
    nextEvent:number
    postedEvent:number
    postingEvent:number
    deletedEvent:number
    localforage:any//LocalForage
    logState:LogState = LogState.STARTING
    deleteState:DeleteState = DeleteState.STARTING
    postWhenReady:boolean
    postTimeout:any
    
    constructor(
        private clientId:string,
        private runId:string,
        private performanceid:string,
        private http: HttpClient,
        private serverUrl:string,
        private baseHrefPath:string
    ) {
        localforage.config({name: (EVENT_STORE + this.performanceid) })
        this.localforage = localforage
        this.initLog()
    }
    initLog() {
        console.log(`init log`)
        // TODO remove test log
        this.log({ time: (new Date()).toISOString(), msg: 'test' })

        this.localforage.getItem(NEXT_EVENT)
            .then((value) => {
                console.log(`next_event is ${value}`)
                if (value)
                    this.nextEvent = Number(value)
                else {
                    this.nextEvent = 1
                    return this.localforage.setItem(NEXT_EVENT, this.nextEvent)
                }
            })
            .then(() => this.localforage.getItem(POSTED_EVENT))
            .then((value) => {
                console.log(`sent_event is ${value}`)
                if (value)
                    this.postedEvent = Number(value)
                else {
                    this.postedEvent = 0
                    return this.localforage.setItem(POSTED_EVENT, this.postedEvent)
                }
            })
            .then(() => {
                // reload old events
                this.reloadEvents()
                this.initDelete()
            })
            .catch((err) => {
                console.log(`Warning: logger set-up failed: ${err.message}`, err)
                
            })
    }
    initDelete() {
        // background persistent item delete activity
        this.localforage.getItem(DELETED_EVENT)
            .then((value) => {
                console.log(`delete_event is ${value}`)
                if (value)
                    this.deletedEvent = Number(value)
                else {
                    this.deletedEvent = 0
                    return this.localforage.setItem(DELETED_EVENT, this.deletedEvent)
                }
            })
            .then(() => {
                this.deleteState = DeleteState.ACTIVE
                this.checkDelete()
            })
            .catch((err) => {
                console.log(`Warning: log deleter set-up failed: ${err.message}`, err)
                
            })
        
    }
    checkDelete() {
        if (this.deleteState==DeleteState.STARTING)
            return
        // could there be a race with newly added events?
        if (this.deletedEvent >= this.postedEvent)
            return
        console.log(`delete old events ${this.deletedEvent+1} - ${this.postedEvent}`)
        while (this.deletedEvent < this.postedEvent) {
            this.localforage.removeItem(EVENT_PREFIX + (++this.deletedEvent))
        }
        this.localforage.setItem(DELETED_EVENT, this.deletedEvent)
    }
    log(event: Event) {
        console.log('event', event)
        // TODO special events which force-start a post?
        
        if (this.logState == LogState.STARTING) {
            // can't persist when we don't know nextEvent etc.
            this.startingEvents.push(event)
            return
        }
        let logPost = this.persistEvents([event])
        this.postEventLogs.push(logPost)
    }
    reloadEvents() {
        this.logState = LogState.RELOADING
        // reload events...
        this.reloadEvent(this.postedEvent+1)
    }
    reloadEvent(index:number) {
        if (index < this.nextEvent) {
            this.localforage.getItem(EVENT_PREFIX + (index))
                .then((value) => {
                    try {
                        let lp = JSON.parse(value) as LogPost
                        this.postEventLogs.push(lp)
                    }
                    catch (err) {
                        console.log(`error unmarshalling saved log event ${index}: ${err.message} - ${value}`)
                    }
                    this.reloadEvent(index+1)
                })
                .catch((err) => {
                    console.log(`could not reload posted event ${index}: ${err.message}`)
                    this.reloadEvent(index+1)
                })
            return
        } 
        if (this.postEventLogs.length>0) {
            console.log(`reloaded ${this.postEventLogs.length} event logs`)
        }
        // pick up pending events
        this.handleStartingEvents()
        this.logState = LogState.RUNNING

        if (this.nextEvent > this.postedEvent+1)
            // post on startup if old events were lying around
            this.postWhenReady = true
        if (this.postWhenReady) {
            this.startPost()
        } else {
            this.schedulePost(false)
        }
    }
    handleStartingEvents() {
        let events = this.startingEvents
        this.startingEvents = null
        let logPost = this.persistEvents(events)
        if (logPost)
            this.postEventLogs.push(logPost)
    }
    persistEvents(events:Event[]): LogPost {
        if (events.length==0)
            return null
        events[0].n = this.nextEvent
        let logPost:LogPost = {
            clientId: this.clientId,
            performanceId: this.performanceid,
            runId: this.runId,
            clientVersion: CURRENT_VERSION,
            events:events,
        }
        this.localforage.setItem(EVENT_PREFIX + (this.nextEvent++), JSON.stringify(logPost))
        this.localforage.setItem(NEXT_EVENT, this.nextEvent)
        return logPost
    }
    schedulePost(failed:boolean) {
        if (this.postTimeout) {
            console.log(`schedulePost when already scheduled`)
            return
        }
        // timer or something for regular posting?
        this.postTimeout = setTimeout(() => {
            this.postTimeout = null
            this.startPost()
        }, failed ? 30*1000 : (this.postWhenReady ? 500 : POST_INTERVAL_MS + Math.random() * POST_INTERVAL_JITTER_MS ))
    }
    startPost() {
        console.log(`startPost nextEvent ${this.nextEvent}, postedEvent ${this.postedEvent}, ${this.postEventLogs.length} events, state ${this.logState}, postWhenReady ${this.postWhenReady}`)
        if (this.postEventLogs.length==0) {
            this.schedulePost(false)
            return
        }            
        if (this.logState != LogState.RUNNING) {
            this.postWhenReady = true
            this.schedulePost(false)
            return
        }
        this.postWhenReady = false
        this.logState = LogState.POSTING
        let logPost = this.postEventLogs.splice(0,1)[0]
        let postingEvent = logPost.events[0].n
        while (this.postEventLogs.length>0 && 
            this.postEventLogs[0].clientId == logPost.clientId && 
            this.postEventLogs[0].runId == logPost.runId && 
            this.postEventLogs[0].performanceId == logPost.performanceId &&
            this.postEventLogs[0].clientVersion == logPost.clientVersion) {
            // merge
            let lp = this.postEventLogs.splice(0,1)[0]
            postingEvent = lp.events[0].n
            for (let ev of lp.events) {
                logPost.events.push(ev)
            }
        }
        if (this.postEventLogs.length>0)
            this.postWhenReady = true
        let url = this.serverUrl+(this.baseHrefPath ? this.baseHrefPath : '/')+'api/log'
        console.log(`log (${logPost.events.length} events) to ${url}`, logPost)
        this.http.post<boolean>(url, logPost, {
            headers: new HttpHeaders({
              'Content-Type':  'application/json',
            })
          })
          .subscribe(
              (ok:boolean) => {
                  console.log(`post log ${postingEvent} OK`)
                  this.postedEvent = postingEvent
                  this.localforage.setItem(POSTED_EVENT, this.postedEvent)
                  this.checkDelete()
                  // this will be async :-)
                  this.logState = LogState.RUNNING
                  if (this.postWhenReady)
                      this.startPost()
                  else
                      this.schedulePost(false)
              },
              (error) => {
                  console.log(`error posting log ${postingEvent}: ${error.message}`, error)
                  this.postEventLogs.splice(0, 0, logPost)
                  this.logState = LogState.RUNNING
                  this.schedulePost(true)
              }
           )
    }
}
