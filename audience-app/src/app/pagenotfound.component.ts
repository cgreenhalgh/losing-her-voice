import { Component } from '@angular/core';
import { Router, UrlSegment, ActivatedRoute } from '@angular/router';
import { SyncService } from './sync.service';

@Component({
  selector: 'pagenotfound',
  template: '<p>Sorry, page not found</p>',
})
export class PageNotFoundComponent {
  constructor(
    private router: Router,
    private syncService:SyncService,
    private route: ActivatedRoute,
  ) {
  }
  ngOnInit() {
    this.route.url.subscribe((url: UrlSegment[]) => {
      let performanceid = this.syncService.getPerformanceid()
      let encperformanceid = performanceid ? encodeURIComponent(performanceid) : 'undefined'
      console.log(`page ${url} not found, performance ${encperformanceid}`)
      this.router.navigate([`/${encperformanceid}/home`])
    })
  }
}