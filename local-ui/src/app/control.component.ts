import { Component } from '@angular/core';
import { Item, ControlItem } from './types';

import { StoreService } from './store.service';

@Component({
  selector: 'control-view',
  templateUrl: './control.component.html',
  styleUrls: ['./control.component.css']
})
export class ControlComponent {
    controlItems: ControlItem[];
    
    constructor(private store:StoreService) {
        this.store.getControlItems().then(items => this.controlItems = items);
    }
    postItem(controlItem:ControlItem) {
        console.log(`post item ${controlItem.id}`);
        this.store.postItem(controlItem);
    }
}
