import { Component } from '@angular/core';
import { Configuration, ScheduleItem, Performance } from './types';
import { Item, ItemType, SimpleItem, RepostItem } from './socialtypes';

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
    nextPerformanceId:string = null
    currentPerformance:Performance
    
    constructor(private store:StoreService) {
        this.store.getPerformance().subscribe((performance) => {
            this.currentPerformance = performance;
            this.nextPerformanceId = null
        })
        this.store.getConfiguration().subscribe((config) => this.configuration = config)
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
/*        if (this.configuration && this.configuration.selfies && this.configuration.selfies.length>0) {
          let six = (this.nextSelfieIndex++) % this.configuration.selfies.length
          this.store.postItem(scheduleItem, this.configuration.selfies[six])
        } else {
          console.log(`warning: no selfies available`)
        }
*/
        this.store.makeItem(scheduleItem)
      } else if (scheduleItem.itemType == ItemType.REPOST) {
/*        if (this.configuration && this.configuration.reposters && this.configuration.reposters.length>0) {
          let simplePosts = this.items.filter((si) => (si.itemType==ItemType.SIMPLE && si.toAudience))
          if (simplePosts.length>0) {
            let ix = Math.floor(Math.random()*simplePosts.length)
            let post = simplePosts[ix] as SimpleItem
            let rix = Math.floor(Math.random()*this.configuration.reposters.length)
            if (this.configuration.reposters[rix].user_name == post.user_name)
              rix = (rix+1) % this.configuration.reposters.length
            let reposter = this.configuration.reposters[rix]
            let repost:RepostItem = {
              user_name: reposter.user_name,
              user_icon: reposter.user_icon,
              itemType: ItemType.REPOST,
              toAudience: post.toAudience,
              item: post
            }
            this.store.postItem(scheduleItem, repost)
          } else {
            console.log(`warning: no posted items to repost`)
          } 
        } else {
          console.log(`warning: no reposters defined`)
        }
*/
        this.store.makeItem(scheduleItem)
      } else if (scheduleItem.itemType) {
        // TODO
        console.log(`ERROR: cannout post undefined item ${scheduleItem.id} type ${scheduleItem.itemType} '${scheduleItem.title}'`);
      } 
    }
}
