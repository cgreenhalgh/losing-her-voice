import { Component } from '@angular/core';

import { SyncService } from './sync.service';
import { CurrentState, Configuration, MenuItem, View } from './types';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  loading:boolean = true
  currentState:CurrentState = null
  allMenuItems:MenuItem[]
  menuItems:MenuItem[] = []
  views:View[]
  showMenu:boolean = false
  view:View
  showMenuItem:MenuItem
  
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
}
