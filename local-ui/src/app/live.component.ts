import { Component } from '@angular/core';
import { Item } from './types';
import { StoreService } from './store.service';

@Component({
  selector: 'live-view',
  templateUrl: './live.component.html',
  styleUrls: ['./live.component.css']
})
export class LiveComponent {
    items: Item[];
    
    constructor(private store:StoreService) {
        this.items = [];
        this.store.getItems().subscribe((item:Item) => {
            this.items.push(item)
        })
    }
}
