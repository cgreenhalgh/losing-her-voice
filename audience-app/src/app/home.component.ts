import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SyncService } from './sync.service';
import { Configuration, Performance, MenuItem, CurrentState } from './types';

@Component({
  selector: 'home-view',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  performanceid:string
  performance:Performance
  startDatetime:string
  menuItem: MenuItem
  allMenuItems: MenuItem[]
  menuItems: MenuItem[]
  currentState:CurrentState = null
  constructor(
      private syncService:SyncService,
      private router: Router,
  ) {
  }
  ngOnInit() {
    this.performanceid = this.syncService.getPerformanceid()
    if (!this.performanceid) {
        console.log(`performanceid not known`)
        return
    }
    this.syncService.getConfiguration().subscribe((configuration) => {
      if (!configuration)
        return
      if (configuration.menuItems) {
          this.allMenuItems = configuration.menuItems
          this.menuItem = configuration.menuItems.find((mi) => mi.id == 'home')
      }
      this.updateMenuItems()
    })
    this.syncService.getPerformance().subscribe((performance) => {
        this.performance = performance
        if (this.performance) {
            this.startDatetime = new Date(this.performance.startDatetime).toLocaleString('en-GB', {"timeZoneName": "short"})
        }
    })
    this.syncService.getCurrentState().subscribe((newState) => {
      this.currentState = newState
      this.updateMenuItems()
    })
  }
  updateMenuItems() {
    if (!this.allMenuItems) 
      return
    this.menuItems = this.allMenuItems.filter((item) => 
      ((this.currentState && this.currentState.postPerformance && item.postPerformance) ||
       (this.currentState && this.currentState.inPerformance && item.inPerformance) ||
       (this.currentState && this.currentState.prePerformance && item.prePerformance) ||
       (!item.prePerformance && !item.inPerformance && !item.postPerformance))) 
  }
  onShowMenuItem(menuItem:MenuItem):void {
    console.log(`home show menu item`, menuItem)
    let performanceid = this.syncService.getPerformanceid()
    let encperformanceid = performanceid ? encodeURIComponent(performanceid) : 'undefined'
    this.router.navigate([`/${encperformanceid}//${menuItem.id}`])
  }
}
