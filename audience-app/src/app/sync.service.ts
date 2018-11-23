import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from "rxjs";

import { MSG_CLIENT_HELLO, ClientHello, CURRENT_VERSION, MSG_CURRENT_STATE, CurrentState, MSG_OUT_OF_DATE, OutOfDate, MSG_CONFIGURATION, Configuration } from './types';
import * as io from 'socket.io-client';

// TODO: configure me
const SOCKET_IO_SERVER:string = 'http://localhost:8081'

@Injectable()
export class SyncService {
  currentState:BehaviorSubject<CurrentState>
  configuration:BehaviorSubject<Configuration>
  socket:any
  
  constructor() {
    // loading state...
    this.currentState = new BehaviorSubject(null)
    this.configuration = new BehaviorSubject(null)
    console.log(`say hello to socket.io on ${SOCKET_IO_SERVER}`)
    this.socket = io(SOCKET_IO_SERVER)
    let msg:ClientHello = {
      version:CURRENT_VERSION,
      clientType:'default', // TODO: fix clientType
      clientId:'?', // TODO: fix clientId - persistent??
    }
    
    this.socket.emit(MSG_CLIENT_HELLO, msg)
    this.socket.on(MSG_CONFIGURATION, (data) => {
      let msg = data as Configuration
      console.log('got configuration from server', msg)
      this.configuration.next(msg)
    })
    this.socket.on(MSG_CURRENT_STATE, (data) => {
      let msg = data as CurrentState
      console.log('got current state from server', msg)
      this.currentState.next(msg)
    })
    this.socket.on(MSG_OUT_OF_DATE, (data) => {
      let msg = data as OutOfDate
      console.log(`got outofdate from server (our version ${CURRENT_VERSION})`, msg)
      this.currentState.next({
        allowMenu:false,
        postPerformance:false,
        error:`the client and server versions do not match - try re-loading this page or re-installing/updating if this is an app (client version ${CURRENT_VERSION}, server version ${msg.serverVersion})`,
      })
    })
  }
  getConfiguration(): Observable<Configuration> {
    return this.configuration;
  }
  getCurrentState() : Observable<CurrentState> {
    return this.currentState;
  }
}
