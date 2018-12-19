import { Injectable, Inject, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject, Subject, Observable } from "rxjs";
import { LOCAL_STORAGE, StorageService } from 'ngx-webstorage-service';

import { MSG_CLIENT_HELLO, ClientHello, CURRENT_VERSION, MSG_CURRENT_STATE, 
  CurrentState, CurrentStateMsg, ServerTiming, ClientTiming, 
  MSG_OUT_OF_DATE, OutOfDate, MSG_CONFIGURATION, Configuration, 
  ConfigurationMsg, MSG_CLIENT_PING, ClientPing, MSG_ANNOUNCE_ITEM, 
  AnnounceItem, FeedbackMsg, MSG_FEEDBACK, NamePart } from './types';
import { Item } from './socialtypes'
import * as io from 'socket.io-client';

const SOCKET_IO_TEST_SERVER:string = 'http://localhost:8081'
const NAME_KEY_PREFIX = 'namePart:'
const IMAGE_KEY = 'selfie.image'
const SELFIE_CONFIRMED_KEY = 'selfie.confirmed'


@Injectable()
export class SyncService {
  currentState:BehaviorSubject<CurrentState>
  configuration:BehaviorSubject<Configuration>
  profileName:BehaviorSubject<string>
  selfieConfirmed:BehaviorSubject<boolean>
  selfieSent:BehaviorSubject<boolean>
  item:Subject<Item>
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
    
  constructor(
    @Inject(DOCUMENT) private document: any,
    @Inject(LOCAL_STORAGE) private storage: StorageService,
  ) {
    // loading state...
    this.currentState = new BehaviorSubject(null)
    this.configuration = new BehaviorSubject(null)
    this.profileName = new BehaviorSubject(this.getName())
    this.selfieConfirmed = new BehaviorSubject(this.getSelfieConfirmed())
    this.item = new Subject()
    // base href?
    let baseHref = (document.getElementsByTagName('base')[0] || {}).href
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
        socketioPath = baseHrefPath+'socket.io'
        socketioServer = baseHref.substring(0,pix)
      }
    }
    this.initPerformanceid()
    if (!socketioPath) {
      socketioServer = SOCKET_IO_TEST_SERVER
    } 
    console.log(`say hello to socket.io on server ${socketioServer} path ${socketioPath}`)
    this.socket = io(socketioServer, { path: socketioPath })
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
      this.shouldSendHello = false
      if (reason === 'io server disconnect') {
        // the disconnection was initiated by the server, you need to reconnect manually
        this.socket.connect();
      }
      // else the socket will automatically try to reconnect
      console.log(`socket.io disconnect (${reason})`)
      if (!this.outOfDate) {
        // signal problem to UI
        this.currentState.next({
          allowMenu:false,
          postPerformance:false,
          error:`trying to re-connect...`,
          serverSendTime:0,
          serverStartTime:0,
        })
      }
    })
    this.socket.on(MSG_CONFIGURATION, (data) => {
      let msg = data as ConfigurationMsg
      console.log('got configuration from server', msg)
      this.updateTiming(msg.timing)
      if (msg.configuration.nameParts) {
        for (let np of msg.configuration.nameParts) {
          np.value = this.storage.get(NAME_KEY_PREFIX+np.title)
        }
      }
      this.configuration.next(msg.configuration)
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
        error:`the client and server versions do not match - try re-loading this page or re-installing/updating if this is an app (client version ${CURRENT_VERSION}, server version ${msg.serverVersion})`,
        serverSendTime:0,
        serverStartTime:0,
      })
      this.outOfDate = true
    })
  }
  initPerformanceid(): void {
        var pl     = /\+/g;  
        // Regex for replacing addition symbol with a space
        var search = /([^&=]+)=?([^&]*)/g;
        var decode = function(s) { return decodeURIComponent(s.replace(pl, " ")); }
        var query  = window.location.search.substring(1);
        let params = {};
        var match
        while (match = search.exec(query))
          params[decode(match[1])] = decode(match[2]);

        if (params['p']!==undefined) {
          if (!this.performanceid) {
            this.performanceid = params['p'];
            console.log(`setting performanceid: ${this.performanceid}`)
            this.trySendHello()
          }
        } else if (!this.performanceid) {
          alert(`Sorry, the URL seems to be wrong (there is no performance specified)`)
          console.log(`Error: no performanceid (p) in url`, params)
        }
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
        clientId:'?', // TODO: fix clientId - persistent??
        clientSendTime: now,
        timing:this.clientTiming,
        configurationVersion:this.configuration.value && this.configuration.value.metadata ? this.configuration.value.metadata.version : null,
        performanceid:this.performanceid,
      }
      this.socket.emit(MSG_CLIENT_HELLO, msg)
  }
  maybePing():void {
    if (this.pingCount>0 || !this.clientTiming)
      return
    let now = (new Date()).getTime()
    this.clientTiming.clientSendTime = now
    let msg:ClientPing = {
      timing:this.clientTiming,
    }
    this.socket.emit(MSG_CLIENT_PING, msg)
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
    this.socket.emit(MSG_FEEDBACK, msg)
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
    this.socket.emit(MSG_FEEDBACK, msg)
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
  getSelfiePresent(): boolean {
    return !!this.storage.get(IMAGE_KEY)
  }
  setSelfieConfirmed(): void {
    this.storage.set(SELFIE_CONFIRMED_KEY, 'true')
    this.selfieConfirmed.next(true)
    let dataurl:string = this.getSelfieImage()
    console.log(`submit selfie image`)
    let now = (new Date()).getTime()
    this.clientTiming.clientSendTime = now
    let msg:FeedbackMsg = {
      feedback: {
        performanceid:this.performanceid,
        selfieImage: {
          image: dataurl
        }
      },
      timing:this.clientTiming,
    }
    this.socket.emit(MSG_FEEDBACK, msg)
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
    this.storage.remove(IMAGE_KEY)
    this.storage.remove(NAME_KEY_PREFIX)
    if (this.configuration.value && this.configuration.value.nameParts) {
      for (let np of this.configuration.value.nameParts) {
        this.storage.remove(NAME_KEY_PREFIX+np.title)
      }
    }
    this.profileName.next(null)
    this.selfieConfirmed.next(false)
  }
}
