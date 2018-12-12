import { Component, ViewChild, ElementRef, AfterViewInit, Inject } from '@angular/core';
import { SyncService } from './sync.service';
import { NamePart } from './types';

@Component({
  selector: 'selfie-view',
  templateUrl: './selfie.component.html',
  styleUrls: ['./selfie.component.css']
})
export class SelfieComponent implements AfterViewInit {
  //@ViewChild('image') imageRef: ElementRef
  @ViewChild('canvas') canvasRef: ElementRef
  @ViewChild('fileInput') fileInputRef: ElementRef
  selfiePresent:boolean = false
  selfieDeclined:boolean = false
  selfieAccepted:boolean = false
  selfieConfirmed:boolean = false
  selfiePosted:boolean = false
  
  constructor(
    private syncService:SyncService,
  ) {
    this.selfieConfirmed = this.syncService.getSelfieConfirmed()
    this.selfiePresent = this.syncService.getSelfiePresent()
  }
  ngAfterViewInit() {
    let dataurl = this.syncService.getSelfieImage()
    if (dataurl) {
      console.log(`restore image`)
      let ctx = this.canvasRef.nativeElement.getContext('2d')
      let width = this.canvasRef.nativeElement.width
      let height = this.canvasRef.nativeElement.height
      var img = new Image;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height)
      }
      img.src = dataurl
    }
  }
  onDecline() {
    this.selfieConfirmed = false
    this.selfieAccepted = false
    this.selfieDeclined = true
  }
  onAccept() {
    this.selfieConfirmed = false
    this.selfieAccepted = true
    this.selfieDeclined = false
  }
  onConfirm() {
    this.selfieConfirmed = true
    this.selfieAccepted = true
    this.selfieDeclined = false
    console.log(`selfie consent confirmed`)
    this.syncService.setSelfieConfirmed()
  }
  onChangeFile($event) {
    console.log(`change image file`)
    let file = null;
    for (let i = 0; i < $event.target.files.length; i++) {
      if ($event.target.files[i].type.match(/^image\//)) {
        file = $event.target.files[i];
        break;
      }
    }
    if (file !== null) {
      let url = URL.createObjectURL(file)
      let ctx = this.canvasRef.nativeElement.getContext('2d')
      let width = this.canvasRef.nativeElement.width
      let height = this.canvasRef.nativeElement.height
      console.log(`canvas ${width} x ${height}`)
      var img = new Image;
      img.onload = () => {
        let iw = img.naturalWidth
        let ih = img.naturalHeight
        let invscale = Math.min(iw/width, ih/height)
        ctx.drawImage(img, iw/2-width/2*invscale, ih/2-height/2*invscale, width*invscale, height*invscale, 0, 0, width, height);
        URL.revokeObjectURL(img.src)
        
        // greyscale
        let imgData = ctx.getImageData(0, 0, width, height)
        var pixels  = imgData.data;
        for (var i = 0, n = pixels.length; i < n; i += 4) {
          var grayscale = pixels[i] * .3 + pixels[i+1] * .59 + pixels[i+2] * .11;
          pixels[i  ] = grayscale;        // red
          pixels[i+1] = grayscale;        // green
          pixels[i+2] = grayscale;        // blue
          //pixels[i+3]              is alpha
        }
        ctx.putImageData(imgData, 0, 0);
        
        // persist
        let dataurl = this.canvasRef.nativeElement.toDataURL()
        this.syncService.setSelfieImage(dataurl)
        this.selfiePresent = true
      }
      img.src = url;
      //this.imageRef.nativeElement.src = url
    }
  }
}
