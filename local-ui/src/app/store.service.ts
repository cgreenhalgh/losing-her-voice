import { Injectable } from '@angular/core';
import { ReplaySubject, Observable } from "rxjs";

import { Item, ControlItem } from './types';

@Injectable()
export class StoreService {
    controlItems:ControlItem[]
    items:ReplaySubject<Item>

    constructor() {
        this.items = new ReplaySubject()
    }

    getItems() : Observable<Item> {
        return this.items;
    }
    
    getControlItems() : Promise<ControlItem[]> {
        // TODO
        let p:Promise<ControlItem[]> = new Promise((resolve, reject) => {
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
        })
        return p
    }
    postItem(controlItem:ControlItem) {
        this.items.next(controlItem.item);
        controlItem.postCount++;
    }
}
