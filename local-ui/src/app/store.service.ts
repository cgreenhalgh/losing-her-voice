import { Injectable } from '@angular/core';
import { ReplaySubject, Observable } from "rxjs";

import { Item, ControlItem, MSG_CLIENT_HELLO, ClientHello, MSG_ANNOUNCE_CONTROL_ITEMS, AnnounceControlItems, MSG_ANNOUNCE_ITEMS, AnnounceItems, MSG_ANNOUNCE_ITEM, AnnounceItem, MSG_POST_ITEM, PostItem } from './types';
import * as io from 'socket.io-client';

const SOCKET_IO_SERVER:string = 'http://localhost:8080'

@Injectable()
export class StoreService {
    controlItems:ControlItem[]
    items:ReplaySubject<Item>
    socket:any
    controlItemsPromise:Promise<ControlItem[]>
    
    constructor() {
        this.items = new ReplaySubject()
        console.log(`say hello to socket.io on ${SOCKET_IO_SERVER}`)
        this.socket = io(SOCKET_IO_SERVER)
        let msg:ClientHello = {}
        
        this.socket.emit(MSG_CLIENT_HELLO, msg)
        
        this.controlItemsPromise = new Promise((resolve, reject) => {
            /*
            let DEFAULT_USER_ICON = '/assets/images/default_user.png'
            this.controlItems = [
                { id: '1',
                  item: { title: 'Item 1 Item 1 Item 1 Item 1 Item 1 Item 1 Item 1 Item 1 Item 1 Item 1 Item 1 Item 1 Item 1', 
                     user_icon: DEFAULT_USER_ICON, 
                     date: 'Jul 13 20:42', 
                     content: 'this and this ... this and this ... this and this ... this and this ... this and this ... this and this ... this and this ... this and this ... this and this ... ', 
                     image: '/assets/images/default_user.png' },
                  postCount: 0 },
                { id: '2',
                  item: { title: 'Item 2', user_icon: DEFAULT_USER_ICON, date: 'Jul 13 20:45', content: 'this and this and the other... ' },
                  postCount: 1 },
            ]
            
            resolve(this.controlItems)
            */
            this.socket.on(MSG_ANNOUNCE_CONTROL_ITEMS, (data) => {
                let msg = data as AnnounceControlItems
                console.log('got control items from server')
                this.controlItems = msg.controlItems
                resolve(this.controlItems)
            })
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
    }

    getItems() : Observable<Item> {
        return this.items;
    }
    
    getControlItems() : Promise<ControlItem[]> {
        return this.controlItemsPromise
    }
    postItem(controlItem:ControlItem) {
        let msg:PostItem = { controlItem: controlItem }
        this.socket.emit(MSG_POST_ITEM, msg)
        //this.items.next(controlItem.item);
        controlItem.postCount++;
    }
}
