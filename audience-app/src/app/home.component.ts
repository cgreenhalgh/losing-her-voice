import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SyncService } from './sync.service';
import { Configuration, Performance, MenuItem } from './types';

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
  menuItems: MenuItem[]
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
      if (configuration.performances) {
        //console.log(`configuration changed`)
        this.performance = configuration.performances.find((p) => p.id == this.performanceid)
        if (!this.performance) {
            console.log(`could not find performance ${this.performanceid}`)
        }
        else {
            this.startDatetime = new Date(this.performance.startDatetime).toLocaleString('en-GB', {"timeZoneName": "short"})
        }
      }
      if (configuration.menuItems) {
          this.menuItems = configuration.menuItems
          this.menuItem = configuration.menuItems.find((mi) => mi.id == 'home')
      }
    })
  }
  onShowMenuItem(menuItem:MenuItem):void {
    console.log(`home show menu item`, menuItem)
    this.router.navigate([`/${menuItem.id}`])
  }
}
