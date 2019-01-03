import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { SyncService } from './sync.service';
import { CurrentState, Configuration, MenuItem, View } from './types';
import { Item, SimpleItem, ItemType, QuizOrPollItem, RepostItem } from './socialtypes';

const SMALL_DELAY:number = 0.01

function getDefault(value:number, def:number) : number {
  if (value===null || value===undefined)
    return def
  return value
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('audio') audio: ElementRef
  @ViewChild('flickerImg') flickerImg: ElementRef
  @ViewChild('flickerDiv') flickerDiv: ElementRef
  loading:boolean = true
  currentState:CurrentState = null
  allMenuItems:MenuItem[]
  menuItems:MenuItem[] = []
  views:View[]
  showMenu:boolean = false
  view:View
  audioDelaySeconds:number
  showMenuItem:MenuItem
  showPlay:boolean
  playWhenReady:boolean
  audioTimeout:any = null
  showLanding:boolean = true
  landingTouched:boolean = false
  currentItem:Item
  currentRepostItem:RepostItem
  currentSimpleItem:SimpleItem
  currentItemLiked:boolean
  currentItemShared:boolean
  currentQuizItem:QuizOrPollItem
  currentItemSelected:boolean
  currentQuizOption:number
  currentItemSent:boolean
  profileName:string
  editProfile:boolean
  selfieConfirmed:boolean
  selfieSent:boolean
  flickerImage:string
  flickerTimer:any
  
  constructor(
    private syncService:SyncService,
    @Inject(DOCUMENT) private document: any
  ) 
  {
    syncService.getConfiguration().subscribe((configuration) => {
      if (!configuration)
        return
      this.allMenuItems = configuration.menuItems
      this.views = configuration.views
      let pmi = this.allMenuItems.find((mi) => mi.id =='profile')
      if (pmi)
        pmi.highlight = !syncService.getName()
      let smi = this.allMenuItems.find((mi) => mi.id =='selfie')
      if (smi)
        smi.highlight = !syncService.getSelfieConfirmed()
    })
    syncService.getNameObservable().subscribe((name) => {
      this.profileName = name
      if (this.allMenuItems) {
        let pmi = this.allMenuItems.find((mi) => mi.id =='profile')
        if (pmi)
          pmi.highlight = !name
      }
    })
    syncService.getSelfieConfirmedObservable().subscribe((val) => {
      this.selfieConfirmed = val
      if (this.allMenuItems) {
        let smi = this.allMenuItems.find((mi) => mi.id =='selfie')
        if (smi)
          smi.highlight = !val
      }
    })
    syncService.getSelfieSentObservable().subscribe((val) => {
      this.selfieSent = val
    })
    syncService.getCurrentState().subscribe((newState) => {
      console.log('home update current state', newState)
      this.currentState = newState
      this.loading = !this.currentState
      if (this.currentState && this.currentState.allowMenu) {
        this.showMenu = true
      } else {
        this.showMenu = false
      }
      this.showMenuItem = null
      if (this.allMenuItems) {
        this.menuItems = this.allMenuItems.filter((item) => (this.currentState && this.currentState.postPerformance) || !item.postPerformance)
      }
      this.flickerImage = null
      this.updateFlicker(false)
      if (this.currentState && this.currentState.forceView) {
        // force a view
        this.showMenu = false
        this.audioDelaySeconds = 0
        this.view = this.views.find((v) => this.currentState.forceView == v.id)
        if (!this.view) {
          console.log(`unknown view forced: ${this.currentState.forceView}`)
          this.currentState.error = `there seems to be something wrong (I don't know how to show ${this.currentState.forceView}`
        } else {
          if (this.view.audioDelaySeconds)
            this.audioDelaySeconds = this.view.audioDelaySeconds
          if (this.view.audioJitterSeconds)
            this.audioDelaySeconds += Math.random()*this.view.audioJitterSeconds
          // flicker defaults
          if (this.view.flicker) {
            this.view.flicker.minFraction = getDefault(this.view.flicker.minFraction, 0)
            this.view.flicker.maxFraction = getDefault(this.view.flicker.maxFraction, 1)
            if (this.view.flicker.maxFraction < this.view.flicker.minFraction)
             this.view.flicker.maxFraction = this.view.flicker.minFraction
            this.view.flicker.minShowSeconds = getDefault(this.view.flicker.minShowSeconds, 0)
            this.view.flicker.maxShowSeconds = getDefault(this.view.flicker.maxShowSeconds, 1)
            if (this.view.flicker.maxShowSeconds < this.view.flicker.minShowSeconds)
             this.view.flicker.maxShowSeconds = this.view.flicker.minShowSeconds
            this.view.flicker.minBlankSeconds = getDefault(this.view.flicker.minBlankSeconds, 0)
            this.view.flicker.maxBlankSeconds = getDefault(this.view.flicker.maxBlankSeconds, 1)
            if (this.view.flicker.maxBlankSeconds < this.view.flicker.minBlankSeconds)
             this.view.flicker.maxBlankSeconds = this.view.flicker.minBlankSeconds
            this.updateFlicker(true)
          }
        }
      } else {
        if (this.view) {
          // stop forcing any view
          if (this.view.defaultMenuId) {
            this.showMenuItem = this.menuItems.find((item) => item.id == this.view.defaultMenuId)
            if (this.showMenuItem) {
              this.showMenu = false
            }
          } 
          this.view = null
        }
      }
      this.updateAudio()
    })
    syncService.getItem().subscribe((item) => {
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
    })
  }
  onShowMenuItem(menuItem:MenuItem):void {
    console.log(`show menu item`, menuItem)
    this.showMenu = false
    this.showMenuItem = menuItem
  }
  onShowMenu():void {
    console.log('show menu')
    this.showMenu = true
    this.showMenuItem = null
  }
  onToggleEditProfile() :void {
    this.editProfile = !this.editProfile
  }
  ngAfterViewInit() {
    console.log(`audio component`, this.audio)
    this.updateAudio()
  }
  updateAudio():void {
    this.showPlay = false
    if (!this.audio)
      return
    let audio = this.audio.nativeElement
    audio.pause()
    if (!this.view || !this.view.audioFile)
      return
    console.log(`play audio ${this.view.audioFile}`)
    audio.setAttribute('src', 'assets/'+this.view.audioFile)
    let volume:number = this.view.audioVolume!==null && this.view.audioVolume!==undefined ? this.view.audioVolume : 1
    if (volume<0)
      volume = 0
    else if (volume>1)
      volume = 1
    audio.volume = volume
    audio.load()
    this.playAudio()
  }
  playAudio() {
    if (!this.audio || !this.audio.nativeElement || !this.view || !this.view.audioFile) 
      return
    this.showPlay = false
    this.playWhenReady = false
    this.clearAudioTimeout()
    // timing?
    let audio = this.audio.nativeElement
    let clientStartTime = this.syncService.getClientTime(this.currentState.serverStartTime)
    let now = (new Date()).getTime()
    let elapsed = (now - clientStartTime)*0.001
    if (this.audioDelaySeconds)
      elapsed -= this.audioDelaySeconds
    if (elapsed < 0) {
      console.log(`delay audio ${-elapsed}`)
      this.audioTimeout = setTimeout(() => this.playAudio(), -1000*elapsed)
      return
    } else if (elapsed > SMALL_DELAY) {
      if (audio.readyState < 1) {
        // no metadata
        console.log(`no metadata for audio (readyState ${audio.readyState})`)
        audio.load()
        this.playWhenReady = true
        return
      }
      if (elapsed > audio.duration) {
        console.log(`audio has finished (elapsed ${elapsed} vs duration ${audio.duration})`)
        return
      }
      audio.currentTime = elapsed
    } else {
      audio.currentTime = 0
    }
    // TODO past end?
    console.log(`play audio from ${elapsed}`)
    audio.play()
      .then(() => { console.log('play audio ok') })
      .catch((err) => { 
        console.log(`play audio error ${err.messsage}`, err);
        // not interacted??
        this.showPlay = true
      })
  }
  onAudioReadyStateChange():void {
    // why isn't this called in chrome??
    console.log(`audio readystate change to ${this.audio.nativeElement.readyState}`)
    if (this.playWhenReady)
      this.playAudio()
  }
  onCanPlay():void {
    console.log(`audio canplay, readyState ${this.audio.nativeElement.readyState}`)
    if (this.playWhenReady)
      this.playAudio()
  }
  onLoad():void {
    console.log(`audio load, readyState ${this.audio.nativeElement.readyState}`)
    if (this.playWhenReady)
      this.playAudio()
  }
  onPlayAudio():void {
    console.log(`play (button)`)
    this.playAudio()
  }
  ngOnDestroy() {
    this.clearAudioTimeout()
  }
  clearAudioTimeout(): void {
    if (this.audioTimeout) {
      clearTimeout(this.audioTimeout)
      this.audioTimeout = null
    }
  }
  onTouchLanding() {
    this.landingTouched = true
    //this.playAudio()
  }
  onDismissLanding($event:Event) {
    $event.preventDefault()
    this.showLanding = false;
    this.playAudio()
    // dodgy?!
    this.toggleFullScreen()
  }
  toggleFullScreen() {    
    // https://developers.google.com/web/fundamentals/native-hardware/fullscreen/
    var doc = this.document;
    var docEl = doc.documentElement;
    var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
  
    if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
      console.log(`request full screen`)
      if (requestFullScreen)
        requestFullScreen.call(docEl);
      else
        window.scrollTo(0,1)
    }
    else {
      console.log(`cancel full screen`)
      if (cancelFullScreen)
        cancelFullScreen.call(doc);
    }
  }
  onLikeCurrentItem() {
    this.currentItemLiked = true
    if (this.currentItem) {
      this.syncService.likeItem(this.currentItem)
    }
  }
  onShareCurrentItem() {
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
  onShareSelfie() {
    if (!this.selfieConfirmed) {
      console.log(`Error: attempt to share unconfirmed selfie`)
      return
    }
    this.selfieSent = true 
    this.syncService.sendSelfie()
  }
  updateFlicker(showImage:boolean) {
    if (this.flickerTimer) {
      clearTimeout(this.flickerTimer)
      this.flickerTimer = null
    }
    if (!showImage) {
      this.flickerImage = null
      if (this.flickerDiv && this.flickerDiv.nativeElement) {
        this.flickerDiv.nativeElement.style.display = "none"
      }
      if (this.view && this.view.flicker) {
        let delay = Math.random()*(this.view.flicker.maxBlankSeconds - this.view.flicker.minBlankSeconds)+this.view.flicker.minBlankSeconds
        this.flickerTimer = setTimeout(() => { this.updateFlicker(true) }, Math.floor(delay*1000))
      }
      return
    }
    if (this.view && this.view.flicker && this.view.flicker.images && this.view.flicker.images.length>0) {
      this.flickerImage = 'assets/'+this.view.flicker.images[Math.floor(this.view.flicker.images.length*Math.random())]
      // position
      let size = Math.random()*(this.view.flicker.maxFraction - this.view.flicker.minFraction)+this.view.flicker.minFraction
      let position1 = Math.random()*(1-size)
      let position2 = Math.random()*(1-size)
      if (this.flickerDiv && this.flickerDiv.nativeElement) {
        this.flickerDiv.nativeElement.style.display = "block"
      }
      if (this.flickerImg && this.flickerImg.nativeElement) {
        if (size<0.001)
          size = 0.001
        let invsize = 100/size
        this.flickerImg.nativeElement.style.width = invsize+"%"
        this.flickerImg.nativeElement.style.top = "-"+(invsize*position1)+"%"
        this.flickerImg.nativeElement.style.left = "-"+(invsize*position1)+"%"
        console.log(`position flicker width=${invsize}, top=-${invsize*position1}, left=-${invsize*position2}`)
      } else {
        console.log(`flickerImg not set`)
      }
      let delay = Math.random()*(this.view.flicker.maxShowSeconds - this.view.flicker.minShowSeconds)+this.view.flicker.minShowSeconds
      this.flickerTimer = setTimeout(() => { this.updateFlicker(false) }, Math.floor(delay*1000))
    }
    else {
      console.log(`warning: cannot flicker with no flicker/images`)
    }
  }
}
