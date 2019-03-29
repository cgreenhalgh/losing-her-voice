import { Injectable, Inject, OnInit } from '@angular/core';
import { HttpClient, HttpResponse, HttpHeaders } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject, Subject, Observable } from "rxjs";
import { LOCAL_STORAGE, StorageService } from 'ngx-webstorage-service';
import { Logger } from './logger';
import * as uuidv4 from 'uuid/v4';

import { MSG_CLIENT_HELLO, ClientHello, CURRENT_VERSION, MSG_CURRENT_STATE, 
  CurrentState, CurrentStateMsg, ServerTiming, ClientTiming, 
  MSG_OUT_OF_DATE, OutOfDate, Configuration, 
  MSG_CLIENT_PING, ClientPing, MSG_ANNOUNCE_ITEM, 
  AnnounceItem, FeedbackMsg, MSG_FEEDBACK, NamePart, PerformanceFile,
  Performance , FeedbackPost, LogPost, Event, EventInfo } from './types';
import { Item } from './socialtypes'
import * as io from 'socket.io-client';

const SOCKET_IO_TEST_SERVER:string = 'http://localhost:8081'
const NAME_KEY_PREFIX = 'namePart:'
const IMAGE_KEY = 'selfie.image'
const SELFIE_CONFIRMED_KEY = 'selfie.confirmed'
const SELFIE_IMAGE_POSTED_KEY = 'selfie.posted'
const SELFIE_SENT_KEY = 'selfie.sent'
const PERFORMANCE_ID_KEY = 'performance.id'
const CLIENT_ID_KEY = 'client.id'

enum CommsMode {
    UNKNOWN, PRE, LIVE, POST
}
enum StartupState {
    NEW,
    WAIT_CONFIG,
    WAIT_PERFORMANCE,
    STARTED,
}

const PRE_SHOW_LIVE_TIME_S = 60*60 // 1 hour
const COMMS_WAKE_DELAY_S = 1 //60 1 minute


@Injectable()
export class SyncService {
  clientId:string
  runId:string 
  currentState:BehaviorSubject<CurrentState>
  configuration:BehaviorSubject<Configuration>
  performance:BehaviorSubject<Performance>
  profileName:BehaviorSubject<string>
  selfieConfirmed:BehaviorSubject<boolean>
  selfieSent:BehaviorSubject<boolean>
  item:BehaviorSubject<Item>
  socket:any
  minClientTimeOffset:number = Number.MIN_SAFE_INTEGER
  maxClientTimeOffset:number = Number.MAX_SAFE_INTEGER
  rttSqSum:number = 0
  rttSqCount:number = 0
  RTT_ALPHA:number = 0.3 // smoothing coefficient for RTT estimator
  rtt:number = 0
  outOfDate:boolean = false
  clientTiming:ClientTiming = null
  pingCount:number = 0
  performanceid:string
  shouldSendHello:boolean
  startupState:StartupState = StartupState.NEW
  commsMode:CommsMode = CommsMode.UNKNOWN
  socketioServer:string
  socketioPath:string
  baseHrefPath:string
  logger:Logger
    
  constructor(
    @Inject(DOCUMENT) private document: any,
    @Inject(LOCAL_STORAGE) private storage: StorageService,
    @Inject('Window') private window: Window,
    private http: HttpClient,
  ) {
    // loading state...
    this.currentState = new BehaviorSubject(null)
    this.configuration = new BehaviorSubject(null)
    this.performance = new BehaviorSubject(null)
    this.profileName = new BehaviorSubject(this.getName())
    this.selfieConfirmed = new BehaviorSubject(this.getSelfieConfirmed())
    this.selfieSent = new BehaviorSubject(this.getSelfieSent())
    this.item = new BehaviorSubject(null)
    this.initClientId()
    this.checkServerUrl()
    this.initPerformanceid()
    this.startupState = StartupState.WAIT_CONFIG;
    this.logger = new Logger(this.clientId, this.runId, this.performanceid, this.http, this.socketioServer, this.baseHrefPath, )
    this.http.get<Configuration>('assets/audience-config.json')
      .subscribe(
          (configuration:Configuration) => {
              this.handleConfig(configuration)
          },
          (error) => {
              console.log(`error getting configuration`, error)
              alert(`Sorry, the application is unable to start at the moment`)
          }
       )
  }
  initClientId() {
    this.runId = uuidv4()
    this.clientId = this.storage.get(CLIENT_ID_KEY)
    if (!this.clientId) {
      this.clientId = uuidv4()
      console.log(`generating new clientId ${this.clientId}`)
      this.storage.set(CLIENT_ID_KEY, this.clientId)
    }
    console.log(`clientId ${this.clientId}, runId ${this.runId}`)
  }
  handleConfig(configuration:Configuration) {
    console.log(`got configuration`);
    if (configuration.nameParts) {
      for (let np of configuration.nameParts) {
        np.value = this.storage.get(NAME_KEY_PREFIX+np.title)
      }
    }
    this.configuration.next(configuration)
    this.startupState = StartupState.WAIT_PERFORMANCE
    if (!this.performanceid) {
        return;
    }
    if (this.storage.get(SELFIE_CONFIRMED_KEY) && !this.storage.get(SELFIE_IMAGE_POSTED_KEY)) {
        console.log(`re-post selfie image - confirmed by not posted`)
        this.postSelfieImage()
    }
    this.checkPerformance()
  }
  checkPerformance() {
    let performanceFile = `assets/nocache/${this.performanceid}.json`
    this.http.get<PerformanceFile>(performanceFile, { observe: 'response' })
      .subscribe(
          (resp:HttpResponse<PerformanceFile>) => {
              let pfile:PerformanceFile = { ... resp.body }
              let date = resp.headers.get('date')
              console.log(`got performance, date ${date}, start ${pfile.performance.startDatetime}, duration ${pfile.performance.durationSeconds}`)
              this.performance.next(pfile.performance)
              this.startupState = StartupState.STARTED
              // fall back to client time?!
              let now = date ? (new Date(date)).getTime() : (new Date()).getTime()
              let start = new Date(this.performance.value.startDatetime).getTime()
              let elapsed = (now - (start - PRE_SHOW_LIVE_TIME_S*1000))/1000
              console.log(`since performance start: ${elapsed} -  now ${now}, start ${start}, pre-show ${PRE_SHOW_LIVE_TIME_S}`)
              if (pfile.finished || (pfile.performance.durationSeconds && 
                  elapsed > pfile.performance.durationSeconds + PRE_SHOW_LIVE_TIME_S)) {
                  console.log(`performance ${this.performanceid} is officially finished (server time ${now}, start ${start}, elapsed ${elapsed}, finished ${pfile.finished}`)
                  this.commsMode = CommsMode.POST
                  if (this.socket) {
                      console.log(`post performance, stop socket io`)
                      this.socket.close()
                      this.socket = null
                  }
                  this.currentState.next({
                      allowMenu:true,
                      postPerformance:true,
                      prePerformance:false,
                      inPerformance:false,
                      //error
                      serverSendTime:0,
                      serverStartTime:0,
                  })
                  return
              }
              if (elapsed < 0) {
                  // timer to go live
                  let delay = -elapsed + Math.random()*COMMS_WAKE_DELAY_S
                  console.log(`pre-show, check in ${delay} seconds (elapsed ${elapsed})`)
                  setTimeout(() => { this.checkPerformance() }, delay*1000)
                  this.currentState.next({
                      allowMenu:true,
                      postPerformance:false,
                      prePerformance:true,
                      inPerformance:false,
                      //error
                      serverSendTime:0,
                      serverStartTime:0,
                  })
                  this.commsMode = CommsMode.PRE
                  return
              }
              this.commsMode = CommsMode.LIVE
              if (!this.socket)
                  this.startSocketio()
              //check again...
              if (pfile.performance.durationSeconds) {
                  let delay = pfile.performance.durationSeconds + PRE_SHOW_LIVE_TIME_S - elapsed + Math.random()*COMMS_WAKE_DELAY_S
                  console.log(`in-show, check for end in in ${delay} seconds`)
                  setTimeout(() => { this.checkPerformance() }, delay*1000)
              }
          },
          (error) => {
              console.log(`error getting performance`, error)
              this.currentState.next({
                  allowMenu:false,
                  postPerformance:false,
                  prePerformance:false,
                  inPerformance:false,
                  error:'Sorry, trying to connect...',
                  serverSendTime:0,
                  serverStartTime:0,
              })
              alert(`Sorry, the application is unable to start at the moment`)
          }
       )
  }
  checkServerUrl() {
    // base href?
    let baseHref = ((this.document.getElementsByTagName('base')[0] || {})).href
    console.log(`base href = ${baseHref}`)
    let socketioPath = null
    let socketioServer = null
    if (baseHref) {
      let hix = baseHref.indexOf('//')
      if (hix<0)
        hix = 0
      else
        hix = hix+2
      let pix = baseHref.indexOf('/', hix)
      if (pix<0)
        pix = 0
      let baseHrefPath = baseHref.substring(pix)
      //console.log(`base href path = ${baseHref} (pix=${pix} & hix=${hix})`)
      if ('/' != baseHrefPath) {
        this.baseHrefPath = baseHrefPath
        socketioPath = baseHrefPath+'socket.io'
        socketioServer = baseHref.substring(0,pix)
      }
    }
    if (!socketioPath) {
      socketioServer = SOCKET_IO_TEST_SERVER
    }
    this.socketioServer =socketioServer
    this.socketioPath = socketioPath
  }
  startSocketio() {
    console.log(`say hello to socket.io on server ${this.socketioServer} path ${this.socketioPath}`)
    this.socket = io(this.socketioServer, { path: this.socketioPath })
    this.socket.on('connect', () => {
      console.log(`socket.io connected`)
      // reset
      this.pingCount = 0
      this.shouldSendHello = true
      this.trySendHello()
    })
    this.socket.on('error', (error) => {
      console.log(`socket.io error: ${error.message}`, error)
    })
    this.socket.on('disconnect', (reason) => {
      if (this.commsMode != CommsMode.LIVE) {
        console.log(`ignore socketio disconnect in comms mode ${this.commsMode}`)
        return
      }
      this.shouldSendHello = false
      if (reason === 'io server disconnect') {
        // the disconnection was initiated by the server, you need to reconnect manually
        // TODO go to post mode??
        this.socket.connect();
      }
      // else the socket will automatically try to reconnect
      console.log(`socket.io disconnect (${reason})`)
      if (!this.outOfDate) {
        // signal problem to UI
        this.currentState.next({
          allowMenu:false,
          postPerformance:false,
          prePerformance:false,
          inPerformance:false,
          error:`Sorry, trying to re-connect...`,
          serverSendTime:0,
          serverStartTime:0,
        })
      }
    })
    this.socket.on(MSG_CURRENT_STATE, (data) => {
      let msg = data as CurrentStateMsg
      console.log('got current state from server', msg)
      this.updateTiming(msg.timing)
      this.currentState.next(msg.currentState)
      this.maybePing()
    })
    this.socket.on(MSG_ANNOUNCE_ITEM, (data) => {
      let msg = data as AnnounceItem
      console.log('got item from server', msg)
      this.updateTiming(msg.timing)
      this.item.next(msg.item)
      this.maybePing()
    })
    this.socket.on(MSG_OUT_OF_DATE, (data) => {
      let msg = data as OutOfDate
      console.log(`got outofdate from server (our version ${CURRENT_VERSION})`, msg)
      this.currentState.next({
        allowMenu:false,
        postPerformance:false,
        prePerformance:false,
        inPerformance:false,
        error:`the client and server versions do not match - try re-loading this page or re-installing/updating if this is an app (client version ${CURRENT_VERSION}, server version ${msg.serverVersion})`,
        serverSendTime:0,
        serverStartTime:0,
      })
      this.outOfDate = true
    })
  }
  getParams(): any {
    var pl     = /\+/g;  
    // Regex for replacing addition symbol with a space
    var search = /([^&=]+)=?([^&]*)/g;
    var decode = function(s) { return decodeURIComponent(s.replace(pl, " ")); }
    var query  = this.window.location.search.substring(1);
    let params = {};
    var match
    while (match = search.exec(query))
      params[decode(match[1])] = decode(match[2]);
    return params
  }
  initPerformanceid(): void {
    if (this.performanceid)
      return
    // old style
    let params = this.getParams()
    if (params['p']!==undefined) {
      this.performanceid = params['p'];
      console.log(`set performanceid from parameter p ${params['p']}`)
    }
    // new style - path, basehrefpath should have trailing /
    let path = this.window.location.pathname
    if (this.baseHrefPath) {
      if (path.substring(0, this.baseHrefPath.length) == this.baseHrefPath) 
        path = path.substring(this.baseHrefPath.length)
      else 
        console.log(`warning: pathname ${path} doesn't start with basehref ${this.baseHrefPath}`)
    }
    if (path.substring(0,1) == '/')
      path = path.substring(1)
    let pathels = path.split('/')
    if (pathels.length > 1) {
      this.performanceid = pathels[0]
      console.log(`set performanceid from path ${path} (${pathels[0]})`)
    }
    if (this.performanceid) {
      this.storage.set(PERFORMANCE_ID_KEY, this.performanceid)
      console.log(`persisting performanceid: ${this.performanceid}`)
    } else if (!this.performanceid) {
      this.performanceid = this.storage.get(PERFORMANCE_ID_KEY)
      if (!this.performanceid) {
        alert(`Sorry, the URL seems to be wrong (there is no performance specified)`)
        console.log(`Error: no performanceid (p) in url`, params)
      } else {
        console.log(`using saved performanceid ${this.performanceid}`)
      }
    }
  }
  getPerformance(): Observable<Performance> {
      return this.performance;
  }
  getPerformanceid(): string {
      return this.performanceid
  }
  trySendHello():void {
      if (!this.shouldSendHello || !this.performanceid)
        return
      this.shouldSendHello = false
      console.log(`sending hello`)
      let now = (new Date()).getTime()
      if (this.clientTiming) {
        this.clientTiming.clientSendTime = now
      }
      let msg:ClientHello = {
        version:CURRENT_VERSION,
        clientType:'default', // TODO: fix clientType
        clientId:this.clientId,
        runId:this.runId,
        clientSendTime: now,
        timing:this.clientTiming,
        configurationVersion:this.configuration.value && this.configuration.value.metadata ? this.configuration.value.metadata.version : null,
        performanceid:this.performanceid,
      }
      if (this.socket)
        this.socket.emit(MSG_CLIENT_HELLO, msg)
      else
        console.log(`error: trying to emit hello with no socket.io`)
  }
  maybePing():void {
    if (this.pingCount>0 || !this.clientTiming)
      return
    let now = (new Date()).getTime()
    this.clientTiming.clientSendTime = now
    let msg:ClientPing = {
      timing:this.clientTiming,
    }
    if (this.socket)
      this.socket.emit(MSG_CLIENT_PING, msg)
    else
      console.log(`error: trying to emit ping with no socket.io`)
    this.pingCount++
  }
  updateTiming(timing:ServerTiming): void {
    let now = (new Date()).getTime()
    let sendOffset = timing.lastClientSendTime - timing.lastServerRecvTime
    let recvOffset = now - timing.serverSendTime
    if (recvOffset < this.maxClientTimeOffset)
      this.maxClientTimeOffset = recvOffset
    if (sendOffset > this.minClientTimeOffset)
      this.minClientTimeOffset = sendOffset
    // just assume relative clock drift is negligable over the timescale in question (about 2 hours)
    if (this.maxClientTimeOffset < this.minClientTimeOffset) {
      console.log(`Warning: client time drifted by at least ${this.minClientTimeOffset-this.maxClientTimeOffset}s (${this.minClientTimeOffset}-${this.maxClientTimeOffset}), last message ${sendOffset}-${recvOffset}`)
      if (recvOffset < this.minClientTimeOffset)
        this.minClientTimeOffset = this.maxClientTimeOffset
      else 
        this.maxClientTimeOffset = this.minClientTimeOffset
    }
    let rtt = now - timing.lastClientSendTime - (timing.serverSendTime - timing.lastServerRecvTime)
    if (rtt<0) {
      console.log(`Warning: RTT negative (${rtt}) - ignoring`)
    } else {
      this.rttSqSum = (1-this.RTT_ALPHA)*this.rttSqSum + this.RTT_ALPHA* rtt*rtt
      this.rttSqCount = (1-this.RTT_ALPHA)*this.rttSqCount + this.RTT_ALPHA
      this.rtt = Math.sqrt(this.rttSqSum / this.rttSqCount)
    }
    console.log(`timing, ${timing.lastClientSendTime} -> ${timing.lastServerRecvTime} / ${timing.serverSendTime} -> ${now}: sendOffset ${sendOffset}, recvOffset ${recvOffset}, clientTimeOffset ${this.minClientTimeOffset}-${this.maxClientTimeOffset}, rtt ${this.rtt} (from ${this.rttSqSum} / ${this.rttSqCount})`)
    this.clientTiming = {
      clientSendTime:0,
      lastServerSendTime:timing.serverSendTime,
      lastClientRecvTime:now,
      clientOffset:this.getClientTime(0),
      roundTrip:this.rtt
    }
  }
  getConfiguration(): Observable<Configuration> {
    return this.configuration;
  }
  getCurrentState() : Observable<CurrentState> {
    return this.currentState;
  }
  getItem() : Observable<Item> {
    return this.item;
  }
  getClientTime(serverTime:number) : number {
    if (this.rttSqCount<=0) {
      console.log(`error: cannot estimate client time with no RTT info`)
      return serverTime
    }
    // assume for now that server -> client time is short? and go with max offset
    return serverTime + this.maxClientTimeOffset
  }
  likeItem(item:Item): void {
    console.log(`like item ${item.id}`)
    let now = (new Date()).getTime()
    this.clientTiming.clientSendTime = now
    let msg:FeedbackMsg = {
      feedback: {
        performanceid:this.performanceid,
        likeItem: {
          id: item.id
        }
      },
      timing:this.clientTiming,
    }
    if (this.socket)
      this.socket.emit(MSG_FEEDBACK, msg)
    else
      console.log(`error: trying to emit like with no socket.io`)
  }
  shareItem(item:Item): void {
    let name = this.getName()
    if (!name) {
      console.log(`error: cannot share item ${item.id} with no name set`)
      return
    }
    console.log(`share item ${item.id} as ${name}`)
    let now = (new Date()).getTime()
    this.clientTiming.clientSendTime = now
    let msg:FeedbackMsg = {
      feedback: {
        performanceid:this.performanceid,
        shareItem: {
          id: item.id,
          user_name: name,
        }
      },
      timing:this.clientTiming,
    }
    if (this.socket)
      this.socket.emit(MSG_FEEDBACK, msg)
    else
      console.log(`error: trying to emit share with no socket.io`)
 }
  chooseOption(item:Item, option:number): void {
    console.log(`choose item ${item.id} option ${option}`)
    let now = (new Date()).getTime()
    this.clientTiming.clientSendTime = now
    let msg:FeedbackMsg = {
      feedback: {
        performanceid:this.performanceid,
        chooseOption: {
          itemId: item.id,
          option: option
        }
      },
      timing:this.clientTiming,
    }
    if (this.socket)
      this.socket.emit(MSG_FEEDBACK, msg)
    else
      console.log(`error: trying to emit choice with no socket.io`)
  }
  saveName(nameParts:NamePart[]) {
    let name = ''
    for (let np of nameParts) {
      if (np.value && name.length>0)
        name += ' '
      if (np.value)
        name += np.value
      this.storage.set(NAME_KEY_PREFIX+np.title, np.value)
      console.log(`save name ${np.title} ${np.value}`)
    }
    name = name.trim()
    console.log(`name = ${name}`)
    this.log('name',{user_name:name})
    this.storage.set(NAME_KEY_PREFIX, name)
    this.profileName.next(name)
  }
  getName(): string {
    return this.storage.get(NAME_KEY_PREFIX)
  }
  getNameObservable(): Observable<string> {
    return this.profileName
  }
  getSelfieConfirmed(): boolean {
    return !!this.storage.get(SELFIE_CONFIRMED_KEY)
  }
  getSelfieConfirmedObservable(): Observable<boolean> {
    return this.selfieConfirmed
  }
  getSelfieSent(): boolean {
    return !!this.storage.get(SELFIE_SENT_KEY)
  }
  getSelfieSentObservable(): Observable<boolean> {
    return this.selfieSent
  }
  getSelfiePresent(): boolean {
    return !!this.storage.get(IMAGE_KEY)
  }
  setSelfieConfirmed(): void {
    this.storage.set(SELFIE_CONFIRMED_KEY, 'true')
    this.selfieConfirmed.next(true)
    this.postSelfieImage()
  }
  postSelfieImage(): void {
    let dataurl:string = this.getSelfieImage()
    let post:FeedbackPost = {
      clientVersion: CURRENT_VERSION,
      feedback: {
        performanceid: this.performanceid,
        selfieImage: {
          image: dataurl
        }
      },
    }
    let url = this.socketioServer+(this.baseHrefPath ? this.baseHrefPath : '/')+'api/feedback'
    console.log(`submit selfie image to ${url}`)
    this.http.post<boolean>(url, post, {
        headers: new HttpHeaders({
          'Content-Type':  'application/json',
        })
      })
      .subscribe(
          (ok:boolean) => {
              console.log(`post selfie OK`)
              this.storage.set(SELFIE_IMAGE_POSTED_KEY, 'true')
              alert(`Thank you - your selfie has been sent`)
          },
          (error) => {
              console.log(`error posting selfie image`, error)
              alert(`Sorry, I couldn't send your selfie just then; reload the app to try sending it again.`)
          }
       )
  }
  sendSelfie(): void {
    this.storage.set(SELFIE_SENT_KEY, 'true')
    this.selfieSent.next(true)
    let dataurl:string = this.getSelfieImage()
    console.log(`send selfie`)
    let now = (new Date()).getTime()
    this.clientTiming.clientSendTime = now
    // TODO use hash?
    let msg:FeedbackMsg = {
      feedback: {
        performanceid:this.performanceid,
        shareSelfie: {
          user_name: this.getName(),
          image: dataurl
        }
      },
      timing:this.clientTiming,
    }
    if (this.socket)
      this.socket.emit(MSG_FEEDBACK, msg)
    else
      console.log(`error: trying to emit selfie with no socket.io`)
  }
  getSelfieImage(): string {
    return this.storage.get(IMAGE_KEY)
  }
  setSelfieImage(dataurl:string): void {
    this.storage.remove(SELFIE_CONFIRMED_KEY)
    this.selfieConfirmed.next(false)
    this.storage.set(IMAGE_KEY, dataurl)
  }
  resetApp():void {
    console.log(`reset app state`)
    this.storage.remove(SELFIE_CONFIRMED_KEY)
    this.storage.remove(SELFIE_IMAGE_POSTED_KEY)
    this.storage.remove(SELFIE_SENT_KEY)
    this.storage.remove(IMAGE_KEY)
    this.storage.remove(NAME_KEY_PREFIX)
    if (this.configuration.value && this.configuration.value.nameParts) {
      for (let np of this.configuration.value.nameParts) {
        this.storage.remove(NAME_KEY_PREFIX+np.title)
      }
    }
    this.profileName.next(null)
    this.selfieConfirmed.next(false)
    this.selfieSent.next(false)
  }
  log(msg:string, info:EventInfo) {
    let event:Event = {
        time: (new Date()).toISOString(),
        msg:msg,
        info:info
    }
    this.logger.log(event)
  }
}
