import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';

import { SyncService } from './sync.service';
import { CurrentState, Configuration, MenuItem, View } from './types';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  @ViewChild('audio') audio: ElementRef
  loading:boolean = true
  currentState:CurrentState = null
  allMenuItems:MenuItem[]
  menuItems:MenuItem[] = []
  views:View[]
  showMenu:boolean = false
  view:View
  showMenuItem:MenuItem
  showPlay:boolean
  playWhenReady:boolean
  
  constructor(
    private syncService:SyncService,
  ) 
  {
    syncService.getConfiguration().subscribe((configuration) => {
      if (!configuration)
        return
      this.allMenuItems = configuration.menuItems
      this.views = configuration.views
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
      if (this.currentState && this.currentState.forceView) {
        // force a view
        this.showMenu = false
        this.view = this.views.find((v) => this.currentState.forceView == v.id)
        if (!this.view) {
          console.log(`unknown view forced: ${this.currentState.forceView}`)
          this.currentState.error = `there seems to be something wrong (I don't know how to show ${this.currentState.forceView}`
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
    // TODO audioDelay
    if (!this.audio || !this.audio.nativeElement || !this.view || !this.view.audioFile) 
      return
    this.showPlay = false
    this.playWhenReady = false
    // timing?
    let audio = this.audio.nativeElement
    let clientStartTime = this.syncService.getClientTime(this.currentState.serverStartTime)
    let now = (new Date()).getTime()
    let elapsed = (now - clientStartTime)*0.001
    if (audio.readyState < 1) {
      // no metadata
      // TODO
      console.log(`no metadata for audio (readyState ${audio.readyState})`)
      audio.load()
      this.playWhenReady = true
      return
    }
    if (elapsed > 0) {
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
}
