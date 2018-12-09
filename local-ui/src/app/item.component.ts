import { Component, Input, OnChanges } from '@angular/core';
import { Item, SimpleItem, ItemType, QuizOrPollItem, QuizOption } from './socialtypes';

@Component({
  selector: 'item-view',
  templateUrl: './item.component.html',
  styleUrls: ['./item.component.css']
})
export class ItemComponent implements OnChanges {
    @Input () item: Item;
    simpleItem: SimpleItem
    quizItem: QuizOrPollItem
    
    constructor() {}
    ngOnChanges() {
        console.log(`onChanges item`, this.item)
        this.simpleItem = null
        this.quizItem = null
        if (this.item) {
            switch(this.item.itemType) {
            case ItemType.SIMPLE:
                this.simpleItem = this.item as SimpleItem
                break
            case ItemType.QUIZ:
            case ItemType.POLL:
                this.quizItem = this.item as QuizOrPollItem
                break
            }
        }
    }
}
