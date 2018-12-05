import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject, Observable } from "rxjs";

import { MSG_CLIENT_HELLO, ClientHello, CURRENT_VERSION, MSG_CURRENT_STATE, 
  CurrentState, CurrentStateMsg, ServerTiming, ClientTiming, 
  MSG_OUT_OF_DATE, OutOfDate, MSG_CONFIGURATION, Configuration, 
  ConfigurationMsg } from './types';
import * as io from 'socket.io-client';

const SOCKET_IO_TEST_SERVER:string = 'http://localhost:8081'

@Injectable()
export class SyncService {
  currentState:BehaviorSubject<CurrentState>
  configuration:BehaviorSubject<Configuration>
  socket:any
  minClientTimeOffset:number = Number.MIN_SAFE_INTEGER
  maxClientTimeOffset:number = Number.MAX_SAFE_INTEGER
  rttSqSum:number = 0
  rttSqCount:number = 0
  RTT_ALPHA:number = 0.3 // smoothing coefficient for RTT estimator
  rtt:number = 0
  
  constructor(@Inject(DOCUMENT) private document: any) {
    // loading state...
    this.currentState = new BehaviorSubject(null)
    this.configuration = new BehaviorSubject(null)
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
    if (!socketioPath) {
      socketioServer = SOCKET_IO_TEST_SERVER
    } 
    console.log(`say hello to socket.io on server ${socketioServer} path ${socketioPath}`)
    this.socket = io(socketioServer, { path: socketioPath })
    let now = (new Date()).getTime()
    let msg:ClientHello = {
      version:CURRENT_VERSION,
      clientType:'default', // TODO: fix clientType
      clientId:'?', // TODO: fix clientId - persistent??
      clientSendTime: now,
    }
    
    this.socket.emit(MSG_CLIENT_HELLO, msg)
    this.socket.on(MSG_CONFIGURATION, (data) => {
      let msg = data as ConfigurationMsg
      console.log('got configuration from server', msg)
      this.updateTiming(msg.timing)
      this.configuration.next(msg.configuration)
    })
    this.socket.on(MSG_CURRENT_STATE, (data) => {
      let msg = data as CurrentStateMsg
      console.log('got current state from server', msg)
      this.updateTiming(msg.timing)
      this.currentState.next(msg.currentState)
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
    })
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
  }
  getConfiguration(): Observable<Configuration> {
    return this.configuration;
  }
  getCurrentState() : Observable<CurrentState> {
    return this.currentState;
  }
  getClientTime(serverTime:number) : number {
    if (this.rttSqCount<=0) {
      console.log(`error: cannot estimate client time with no RTT info`)
      return serverTime
    }
    // assume for now that server -> client time is short? and go with max offset
    return serverTime + this.maxClientTimeOffset
  }
}
