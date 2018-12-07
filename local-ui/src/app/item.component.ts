import { Component, Input } from '@angular/core';
import { Item } from './socialtypes';

@Component({
  selector: 'item-view',
  templateUrl: './item.component.html',
  styleUrls: ['./item.component.css']
})
export class ItemComponent {
    @Input () item: Item;
    
    constructor() {}
}
