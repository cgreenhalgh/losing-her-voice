import { Component } from '@angular/core';
import { Configuration, ScheduleItem, Performance } from './types';
import { Item, ItemType, SimpleItem, RepostItem, ShareItem, ShareSelfie } from './socialtypes';

import { StoreService } from './store.service';

@Component({
  selector: 'control-view',
  templateUrl: './control.component.html',
  styleUrls: ['./control.component.css']
})
export class ControlComponent {
    configuration: Configuration;
    nextSelfieIndex:number = 0
    items:Item[] = []
    shareItems:ShareItem[] = []
    shareSelfies:ShareSelfie[] = []
    nextPerformanceId:string = null
    currentPerformance:Performance
    
    constructor(private store:StoreService) {
        this.store.getConfiguration().subscribe((config) => this.configuration = config)
        this.store.getPerformance().subscribe((performance) => {
            this.currentPerformance = performance;
            this.nextPerformanceId = null
            // hack - items has been replaced
            this.items.splice(0, this.items.length)
            this.store.getItems().subscribe((item) => {
                // update?
                for (let ix = 0; ix < this.items.length; ix++) {
                    let i = this.items[ix]
                    if (i.id == item.id) {
                        console.log(`update item ${item.id}`, item)
                        this.items.splice(ix, 1, item)
                        return
                    }
                }
                this.items.push(item) 
            })
            this.shareItems.splice(0, this.shareItems.length)
            this.store.getShareItems().subscribe((item) => {
                this.shareItems.push(item)
            })
            this.shareSelfies.splice(0, this.shareSelfies.length)
            this.store.getShareSelfies().subscribe((item) => {
                this.shareSelfies.push(item)
            })
        })
    }
    startPerformance() {
        console.log(`start performance ${this.nextPerformanceId}`)
        if (!this.nextPerformanceId)
            return
        let nextPerformance = this.configuration.performances.find((p) => p.id == this.nextPerformanceId)
        if (!nextPerformance) {
            let msg = `Sorry, could not find performance ${this.nextPerformanceId}`
            console.log(msg)
            alert(msg)
            return
        }
        this.store.startPerformance(nextPerformance)
    }
    postItem(scheduleItem:ScheduleItem) {
      console.log(`post item ${scheduleItem.id} '${scheduleItem.title}'`);
      if (scheduleItem.closePolls) {
        this.store.closePolls(scheduleItem)
      }
      if (scheduleItem.videoState) {
        this.store.setVideoState(scheduleItem)
      }
      if (scheduleItem.item) {
        this.store.postItem(scheduleItem, scheduleItem.item);
      } else if (scheduleItem.itemType == ItemType.SELFIE) {
        this.store.makeItem(scheduleItem)
      } else if (scheduleItem.itemType == ItemType.REPOST) {
        this.store.makeItem(scheduleItem)
      } else if (scheduleItem.itemType) {
        // TODO
        console.log(`ERROR: cannout post undefined item ${scheduleItem.id} type ${scheduleItem.itemType} '${scheduleItem.title}'`);
      } 
    }
}
