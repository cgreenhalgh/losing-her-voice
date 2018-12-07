import { Injectable } from '@angular/core';
import { ReplaySubject, Observable, BehaviorSubject } from "rxjs";

import { MSG_CLIENT_HELLO, ClientHello, LOCAL_PROTOCOL_VERSION, 
  MSG_CONFIGURATION, Configuration, ScheduleItem, ConfigurationMsg, 
  MSG_OUT_OF_DATE, OutOfDate, MSG_ANNOUNCE_ITEMS, AnnounceItems, 
  MSG_ANNOUNCE_ITEM, AnnounceItem, MSG_POST_ITEM, PostItem, 
  MSG_UPDATE_ITEM, UpdateItem } from './types';
import { Item } from './socialtypes';
import * as io from 'socket.io-client';

const SOCKET_IO_SERVER:string = 'http://localhost:8080'

@Injectable()
export class StoreService {
    items:ReplaySubject<Item>
    socket:any
    configuration:BehaviorSubject<Configuration>
    outOfDate:boolean = false
  
    constructor() {
        this.items = new ReplaySubject()
        this.configuration = new BehaviorSubject(null)
        console.log(`say hello to socket.io on ${SOCKET_IO_SERVER}`)
        this.socket = io(SOCKET_IO_SERVER)
        this.socket.on('connect', () => {
          console.log(`connected to socket.io`)
        })
        this.socket.on('disconnect', (reason) => {
          console.log(`socket.io disconnected: ${reason}`)
        })
        this.socket.on('connect', () => {
          let msg:ClientHello = {
            version:LOCAL_PROTOCOL_VERSION
          }
        
          this.socket.emit(MSG_CLIENT_HELLO, msg)
        })
        this.socket.on(MSG_OUT_OF_DATE, (msg) => {
          this.outOfDate = true
          let report = `client/server version incompatiable ${LOCAL_PROTOCOL_VERSION} vs ${msg.serverVersion}`
          console.log(report)
          alert(report)
        })
        this.socket.on(MSG_CONFIGURATION, (data) => {
          let msg = data as ConfigurationMsg
          console.log('got configuration ${msg.configuration.metadata.version} from server')
          this.configuration.next(msg.configuration)
        })
        this.socket.on(MSG_ANNOUNCE_ITEMS, (data) => {
            let msg = data as AnnounceItems
            console.log('got items from server')
            for (let i=0; i<data.items. length; i++)
                this.items.next(data.items[i])
        })
        this.socket.on(MSG_ANNOUNCE_ITEM, (data) => {
            let msg = data as AnnounceItem
            console.log('got item from server')
            this.items.next(data.item)
        })
        this.socket.on(MSG_UPDATE_ITEM, (data) => {
            let msg = data as UpdateItem
            console.log('got item update from server')
            this.items.next(data.item)
        })
    }

    getItems() : Observable<Item> {
        return this.items;
    }
    
    getConfiguration() : Observable<Configuration> {
        return this.configuration
    }
    postItem(scheduleItem:ScheduleItem, item:Item) {
        let msg:PostItem = { scheduleId: scheduleItem.id, item: item }
        if (!scheduleItem.postCount)
          scheduleItem.postCount = 1
        else
          scheduleItem.postCount = 1+scheduleItem.postCount
        this.socket.emit(MSG_POST_ITEM, msg)
        //this.items.next(controlItem.item);
    }
}
