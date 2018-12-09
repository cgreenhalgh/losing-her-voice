import { Component } from '@angular/core';
import { Configuration, ScheduleItem } from './types';
import { Item } from './socialtypes';

import { StoreService } from './store.service';

@Component({
  selector: 'control-view',
  templateUrl: './control.component.html',
  styleUrls: ['./control.component.css']
})
export class ControlComponent {
    configuration: Configuration;
    
    constructor(private store:StoreService) {
        this.store.getConfiguration().subscribe((config) => this.configuration = config)
    }
    postItem(scheduleItem:ScheduleItem) {
      console.log(`post item ${scheduleItem.id} '${scheduleItem.title}'`);
      if (scheduleItem.closePolls) {
        this.store.closePolls(scheduleItem)
      }
      if (scheduleItem.item) {
        this.store.postItem(scheduleItem, scheduleItem.item);
      } else if (scheduleItem.itemType) {
        // TODO
        console.log(`ERROR: cannout post undefined item ${scheduleItem.id} type ${scheduleItem.itemType} '${scheduleItem.title}'`);
      } 
    }
}
