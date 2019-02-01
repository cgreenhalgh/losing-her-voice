import { Injectable } from '@angular/core';
import { ReplaySubject, Observable, BehaviorSubject, Subject } from "rxjs";

import { MSG_CLIENT_HELLO, ClientHello, LOCAL_PROTOCOL_VERSION, 
  MSG_CONFIGURATION, Configuration, ScheduleItem, ConfigurationMsg, 
  MSG_OUT_OF_DATE, OutOfDate, MSG_ANNOUNCE_ITEMS, AnnounceItems, 
  MSG_ANNOUNCE_ITEM, AnnounceItem, MSG_POST_ITEM, PostItem, 
  MSG_UPDATE_ITEM, UpdateItem, MSG_CLOSE_POLLS, VideoState, 
  MSG_VIDEO_STATE, MSG_SELFIE_IMAGE, MSG_ANNOUNCE_PERFORMANCE,
  MSG_START_PERFORMANCE, AnnouncePerformance, StartPerformance,
  Performance, MSG_MAKE_ITEM, MakeItem, MSG_ANNOUNCE_SHARE_ITEM,
  AnnounceShareItem, MSG_ANNOUNCE_SHARE_SELFIE, AnnounceShareSelfie,
  MSG_OSC_COMMAND, OscCommand, MSG_EXPORT_SELFIE_IMAGES,
  ExportSelfieImages } from './types';
import { Item, SelfieImage, ShareItem, ShareSelfie } from './socialtypes';
import * as io from 'socket.io-client';

const SOCKET_IO_SERVER:string = 'http://localhost:8080'

@Injectable()
export class StoreService {
    items:ReplaySubject<Item>
    shareItems:ReplaySubject<ShareItem>
    shareSelfies:ReplaySubject<ShareSelfie>
    socket:any
    performance:BehaviorSubject<Performance>
    configuration:BehaviorSubject<Configuration>
    videoState:BehaviorSubject<VideoState>
    outOfDate:boolean = false
    selfieImages:ReplaySubject<SelfieImage>
    oscCommands:Subject<OscCommand> = new Subject()
  
    constructor() {
        this.items = new ReplaySubject()
        this.shareItems = new ReplaySubject()
        this.shareSelfies = new ReplaySubject()
        this.performance = new BehaviorSubject(null)
        this.configuration = new BehaviorSubject(null)
        this.videoState= new BehaviorSubject(null)
        this.selfieImages = new ReplaySubject()
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
        this.socket.on(MSG_ANNOUNCE_PERFORMANCE, (data) => {
          let msg = data as AnnouncePerformance
          console.log(`announce performance ${msg.performance.id}: ${msg.performance.title}`)
          // replace/reset
          this.items = new ReplaySubject()
          this.shareItems = new ReplaySubject()
          this.shareSelfies = new ReplaySubject()
          this.performance.next(msg.performance)
        })
        this.socket.on(MSG_CONFIGURATION, (data) => {
          let msg = data as ConfigurationMsg
          console.log('got configuration ${msg.configuration.metadata.version} from server')
          this.configuration.next(msg.configuration)
        })
        this.socket.on(MSG_ANNOUNCE_ITEMS, (data) => {
            let msg = data as AnnounceItems
            console.log(`got ${msg.items.length} items from server`)
            for (let i=0; i<data.items. length; i++)
                this.items.next(data.items[i])
        })
        this.socket.on(MSG_ANNOUNCE_ITEM, (data) => {
            let msg = data as AnnounceItem
            console.log('got item from server')
            this.items.next(msg.item)
        })
        this.socket.on(MSG_ANNOUNCE_SHARE_ITEM, (data) => {
            let msg = data as AnnounceShareItem
            console.log('got share item from server')
            this.shareItems.next(msg.shareItem)
        })
        this.socket.on(MSG_ANNOUNCE_SHARE_SELFIE, (data) => {
            let msg = data as AnnounceShareSelfie
            console.log('got share selfie from server')
            this.shareSelfies.next(msg.shareSelfie)
        })
        this.socket.on(MSG_UPDATE_ITEM, (data) => {
            let msg = data as UpdateItem
            console.log('got item update from server')
            this.items.next(msg.item)
        })
        this.socket.on(MSG_VIDEO_STATE, (data) => {
            let msg = data as VideoState
            console.log('got video state from server')
            this.videoState.next(msg)
        })
        this.socket.on(MSG_SELFIE_IMAGE, (data) => {
            let msg = data as SelfieImage
            console.log('got selfie image from server')
            this.selfieImages.next(msg)
        })
        this.socket.on(MSG_OSC_COMMAND, (data) => {
            let msg = data as OscCommand
            console.log('got osc command from server: ${msg.command}')
            this.oscCommands.next(msg)
        })
    }

    getItems() : Observable<Item> {
        return this.items;
    }
    getShareItems() : Observable<ShareItem> {
        return this.shareItems;
    }
    getShareSelfies() : Observable<ShareSelfie> {
        return this.shareSelfies;
    }
    
    getPerformance() : Observable<Performance> {
        return this.performance
    }
    getConfiguration() : Observable<Configuration> {
        return this.configuration
    }
    getVideoState() : Observable<VideoState> {
        return this.videoState
    }
    getSelfieImages() : Observable<SelfieImage> {
        return this.selfieImages;
    }
    getOscCommands() : Observable<OscCommand> {
        return this.oscCommands
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
    makeItem(scheduleItem:ScheduleItem) {
        let msg:MakeItem = { scheduleId: scheduleItem.id, itemType: scheduleItem.itemType }
        if (!scheduleItem.postCount)
          scheduleItem.postCount = 1
        else
          scheduleItem.postCount = 1+scheduleItem.postCount
        this.socket.emit(MSG_MAKE_ITEM, msg)
        //this.items.next(controlItem.item);
    }
    closePolls(scheduleItem:ScheduleItem) {
        if (!scheduleItem.postCount)
          scheduleItem.postCount = 1
        else
          scheduleItem.postCount = 1+scheduleItem.postCount
        this.socket.emit(MSG_CLOSE_POLLS, null)
    }
    setVideoState(scheduleItem:ScheduleItem) {
        if (!scheduleItem.postCount)
          scheduleItem.postCount = 1
        else
          scheduleItem.postCount = 1+scheduleItem.postCount
        this.socket.emit(MSG_VIDEO_STATE, scheduleItem.videoState)
    }
    updateSelfieImage(selfieImage:SelfieImage) {
        this.socket.emit(MSG_SELFIE_IMAGE, selfieImage)
    }
    startPerformance(performance:Performance) {
        let msg:StartPerformance = {
            performance:performance
        }
        this.socket.emit(MSG_START_PERFORMANCE, msg)
    }
    exportSelfieImages(performance:Performance) {
        if (!performance) {
          console.log(`Error: cannot export selfie images for undefined performance`)
          return
        }
        let msg:ExportSelfieImages = {
            performance:performance
        }
        this.socket.emit(MSG_EXPORT_SELFIE_IMAGES, msg)
    }
}
