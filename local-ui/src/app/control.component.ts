import { Component } from '@angular/core';
import { Configuration, ScheduleItem, Performance, OscCommand,
  OSC_RESET, OSC_GO, OSC_PLAYHEAD_STAR, RedisStatus } from './types';
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
    playheadIx:number = 0
    redisStatus:RedisStatus
    date:Date
    age:string
    
    constructor(private store:StoreService) {
        setInterval(() => {
          this.date = new Date()
          if (this.redisStatus && this.redisStatus.datetime) 
            this.age = String(Math.floor((this.date.getTime() - (new Date(this.redisStatus.datetime)).getTime())/1000))
        }, 1000)
        this.store.getRedisStatus().subscribe((status) => this.redisStatus = status )
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
        this.store.getOscCommands().subscribe((command) => {
            console.log(`got osc command ${command.command}`)
            if (OSC_GO == command.command)
                this.onGo()
            else if (OSC_RESET == command.command) 
                this.onReset()
            else if (command.command && command.command.substring(0, OSC_PLAYHEAD_STAR.length-1) == OSC_PLAYHEAD_STAR.substring(0, OSC_PLAYHEAD_STAR.length-1)) {
                let itemNumber = command.command.substring(OSC_PLAYHEAD_STAR.length-1)
                if (this.configuration && this.configuration.scheduleItems) {
                    // TODO move playhead
                    for (let ix=0; ix<this.configuration.scheduleItems.length; ix++) {
                        let si = this.configuration.scheduleItems[ix]
                        if (si.itemNumber == itemNumber) {
                            console.log(`move playhead to item ${itemNumber}, index ${ix}`)
                            this.playheadIx = ix
                            return
                        }
                    }
                    let msg = `sorry, could not find item ${itemNumber} on ${OSC_PLAYHEAD_STAR}`
                    console.log(msg)
                    // TODO nicer errors than alert?!
                    alert(msg)
                }
                else {
                    console.log(`ignore ${command.command} with not configuration/schedule items`)
                }
            }
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
    onGo() {
      if (!this.currentPerformance) {
        let msg = `Cannot go with no current performance`
        console.log(msg)
        // TODO nicer error?
        alert(msg)
        return
      }
      if (this.playheadIx>=0 && this.configuration && this.configuration.scheduleItems && this.playheadIx < this.configuration.scheduleItems.length) {
        let si = this.configuration.scheduleItems[this.playheadIx++]
        this.postItem(si)
      }
    }
    onReset() {
      console.log(`Reset`)
      this.playheadIx = 0
    }
    onCue(ix:number) {
      console.log(`cue ${ix}`)
      this.playheadIx = ix
    }
}
