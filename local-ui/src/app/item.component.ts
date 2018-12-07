import { Component, Input, OnChanges } from '@angular/core';
import { Item, SimpleItem, ItemType } from './socialtypes';

@Component({
  selector: 'item-view',
  templateUrl: './item.component.html',
  styleUrls: ['./item.component.css']
})
export class ItemComponent implements OnChanges {
    @Input () item: Item;
    simpleItem: SimpleItem
    
    constructor() {}
    ngOnChanges() {
        console.log(`onChanges item`, this.item)
        if (!this.item)
            this.simpleItem = null
        else if (ItemType.SIMPLE == this.item.itemType)
            this.simpleItem = this.item as SimpleItem
    }
}
