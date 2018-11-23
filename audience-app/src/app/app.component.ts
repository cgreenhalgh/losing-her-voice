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
  forceView:string
  showMenuItem
  
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
      if (this.currentState && this.currentState.allowMenu && !this.forceView) {
        this.showMenu = true
      }
      if (this.allMenuItems) {
        this.menuItems = this.allMenuItems.filter((item) => (this.currentState && this.currentState.postPerformance) || !item.postPerformance)
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
