import { Component, Inject } from '@angular/core';

import { SyncService } from './sync.service';
import { Item, SimpleItem, ItemType, QuizOrPollItem, RepostItem } from './socialtypes';

@Component({
  selector: 'posts',
  templateUrl: './posts.component.html',
  styleUrls: ['./posts.component.css']
})
export class PostsComponent {
  currentItem:Item
  currentRepostItem:RepostItem
  currentSimpleItem:SimpleItem
  currentItemLiked:boolean
  currentItemShared:boolean
  currentQuizItem:QuizOrPollItem
  currentItemSelected:boolean
  currentQuizOption:number
  currentItemSent:boolean
  currentItemIsBlank:boolean
  profileName:string

  constructor(
      private syncService:SyncService,
  ){
    syncService.getNameObservable().subscribe((name) => {
      this.profileName = name
    })
    syncService.getItem().subscribe((item) => {
      if (!item)
        return
      if (item.itemType == ItemType.REPOST) {
        this.currentRepostItem = item as RepostItem
        item = this.currentRepostItem.item
      } else {
        this.currentRepostItem = null
      }
      this.currentItem = item
      this.currentItemLiked = false
      this.currentItemShared = false
      if (item && ItemType.SIMPLE == item.itemType)
        this.currentSimpleItem = item as SimpleItem
        else
          this.currentSimpleItem = null
          this.currentItemSent = false
          let wasItemSelected = this.currentItemSelected
          this.currentItemSelected = false
          if (item && (ItemType.QUIZ == item.itemType || ItemType.POLL == item.itemType)) {
            let quiz = item as QuizOrPollItem
            // update to previous quiz? preserve selected
                if (this.currentQuizItem && this.currentQuizItem.id == quiz.id) {
                  if (wasItemSelected && this.currentQuizOption < quiz.options.length) {
                    console.log(`carry over selected option ${this.currentQuizOption} for ${quiz.id}`)
                    quiz.options[this.currentQuizOption].selected = true
                    this.currentItemSelected = true
                  }
                }
            this.currentQuizItem = quiz
          }
          else
            this.currentQuizItem = null
            this.currentItemIsBlank = (item.itemType == ItemType.BLANK || item.itemType == ItemType.RESET)
    })
  }
  onLikeCurrentItem() {
    if (this.currentItemLiked)
      return
    this.currentItemLiked = true
    if (this.currentItem) {
      this.syncService.likeItem(this.currentItem)
    }
  }
  onShareCurrentItem() {
    if (this.currentItemShared)
      return
    if (!this.profileName) {
      console.log(`cannot share item without profile name set`)
      return
    }
    this.currentItemShared = true
    if (this.currentItem) {
      this.syncService.shareItem(this.currentItem)
    }
  }
  selectQuizOption(optionIndex:number) {
    if (this.currentQuizItem && this.currentQuizItem.options && !this.currentItemSent && !this.currentQuizItem.closed) {
      this.currentQuizItem.options.forEach((option) => option.selected = false)
      if (optionIndex>=0 && optionIndex<this.currentQuizItem.options.length) {
        this.currentQuizItem.options[optionIndex].selected = true
        this.currentItemSelected = true
        this.currentQuizOption = optionIndex
      }
    }
  }
  onSendCurrentItem() {
    if (this.currentQuizItem && this.currentItemSelected && !this.currentQuizItem.closed && !this.currentItemSent) {
      this.currentItemSent = true
      this.syncService.chooseOption(this.currentQuizItem, this.currentQuizOption)
    }
  }
}