import { Component, Inject } from '@angular/core';
import { SyncService } from './sync.service';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { MenuItem, Configuration } from './types'

@Component({
  selector: 'item-view',
  templateUrl: './item.component.html',
  styleUrls: ['./item.component.css']
})
export class ItemComponent {
  itemId: string
  menuItem: MenuItem
  configuration: Configuration
  constructor(
      private route: ActivatedRoute,
      private syncService:SyncService,
      @Inject('Window') private window: Window,
  ) {
  }
  ngOnInit() {
    this.syncService.getConfiguration().subscribe((configuration) => {
      if (!configuration)
        return
      //console.log(`configuration changed`)
      this.configuration = configuration
      this.checkMenuItem()
    })
    this.route.paramMap.subscribe((params: ParamMap) => {
        //console.log(`item id = ${params.get('id')}`)
        this.itemId = params.get('id')
        this.checkMenuItem()
    });
  }
  checkMenuItem() {
      if (!this.configuration || !this.configuration.menuItems || !this.itemId) {
          console.log(`waiting for configuration & itemId`)
          this.menuItem = null
          return
      }
      this.menuItem = this.configuration.menuItems.find((mi) => mi.id == this.itemId)
      if (!this.menuItem) {
          console.log(`cannot find menu item ${this.itemId}`)
      } else {
          console.log(`show menu item ${this.itemId}: ${this.menuItem.title}`)
      }
  }
  openUrl() {
      this.syncService.log('link', {url: this.menuItem.url})
      this.window.open(this.menuItem.url, "_blank");
  }
}
