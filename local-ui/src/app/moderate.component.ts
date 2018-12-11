import { Component } from '@angular/core';
import { SelfieImage } from './socialtypes';

import { StoreService } from './store.service';

@Component({
  selector: 'moderate-view',
  templateUrl: './moderate.component.html',
  styleUrls: ['./moderate.component.css']
})
export class ModerateComponent {
  toModerate:SelfieImage[] = []
  approved:SelfieImage[] = []
  rejected:SelfieImage[] = []
  
  constructor(private store:StoreService) {
    this.store.getSelfieImages().subscribe((si) => {
      console.log(`got selfie image ${si.hash}`)
      this.addImage(si)
    })
  }
  addImage(si:SelfieImage) {
    if (si.approved)
      this.approved.push(si)
    else if (si.rejected)
      this.rejected.push(si)
    else 
      this.toModerate.push(si)
  }
  onModerate(si:SelfieImage, ix:number) {
    this.toModerate.splice(ix, 1)
    this.addImage(si)
    this.store.updateSelfieImage(si)
  }
  onChangeApproved(si:SelfieImage, ix:number) {
    this.approved.splice(ix, 1)
    this.addImage(si)
    this.store.updateSelfieImage(si)
  }
  onChangeRejected(si:SelfieImage, ix:number) {
    this.rejected.splice(ix, 1)
    this.addImage(si)
    this.store.updateSelfieImage(si)
  }
}
