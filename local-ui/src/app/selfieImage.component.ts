import { Component, Input, Output, EventEmitter } from '@angular/core';
import { SelfieImage } from './socialtypes';

@Component({
  selector: 'selfie-image',
  templateUrl: './selfieImage.component.html',
  styleUrls: ['./selfieImage.component.css']
})
export class SelfieImageComponent {
  @Input () selfieImage: SelfieImage;
  @Output () moderated: EventEmitter<SelfieImage> = new EventEmitter()
  
  constructor() {
  }
  onApprove() {
    this.selfieImage.approved = true
    this.selfieImage.rejected = false
    this.moderated.emit(this.selfieImage)
  }
  onReject() {
    this.selfieImage.approved = false
    this.selfieImage.rejected = true
    this.moderated.emit(this.selfieImage)
  }
}
