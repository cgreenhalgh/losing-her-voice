import { Component, Input, OnChanges } from '@angular/core';
import { Item, SimpleItem, ItemType, QuizOrPollItem, QuizOption, SelfieItem, RepostItem } from './socialtypes';

@Component({
  selector: 'item-view',
  templateUrl: './item.component.html',
  styleUrls: ['./item.component.css']
})
export class ItemComponent implements OnChanges {
    @Input () item: Item;
    headerItem: Item
    simpleItem: SimpleItem
    quizItem: QuizOrPollItem
    selfieItem: SelfieItem
    repostItem: RepostItem
  
    constructor() {}
    ngOnChanges() {
        //console.log(`onChanges item`, this.item)
        this.headerItem = this.item
        this.simpleItem = null
        this.quizItem = null
        this.selfieItem = null
        if (this.item) {
            switch(this.item.itemType) {
            case ItemType.SIMPLE:
                this.simpleItem = this.item as SimpleItem
                break
            case ItemType.SELFIE:
                this.selfieItem = this.item as SelfieItem
                break
            case ItemType.QUIZ:
            case ItemType.POLL:
                this.quizItem = this.item as QuizOrPollItem
                break
            case ItemType.REPOST:
                this.repostItem = this.item as RepostItem
                this.headerItem = this.repostItem.item
                // TODO: repost other than simple item?
                if (this.repostItem.item && this.repostItem.item.itemType==ItemType.SIMPLE)
                    this.simpleItem = this.repostItem.item as SimpleItem
                break
            }
        }
    }
}
