import { Component, ViewChild, ElementRef, AfterViewInit, Inject } from '@angular/core';
import { SyncService } from './sync.service';
import { NamePart } from './types';

const PRIVACY_NOTICE_URL = 'http://music-mrl.nott.ac.uk/2/gdpr/LHV-audience.htm'

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
    @Inject('Window') private window: Window,
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
    this.syncService.log('consent1', undefined)
    this.selfieConfirmed = false
    this.selfieAccepted = true
    this.selfieDeclined = false
  }
  onConfirm() {
    this.syncService.log('consent2', undefined)
    this.selfieConfirmed = true
    this.selfieAccepted = true
    this.selfieDeclined = false
    console.log(`selfie consent confirmed`)
    this.syncService.setSelfieConfirmed()
  }
  onChangeFile($event) {
    this.syncService.log('takeselfie', undefined)
    console.log(`change image file`)
    let file = null;
    for (let i = 0; i < $event.target.files.length; i++) {
      if ($event.target.files[i].type.match(/^image\//)) {
        file = $event.target.files[i];
        break;
      }
    }
    if (file !== null) {
        this.getOrientation(file, (orientation) => {
          console.log(`image orientation ${orientation}`)
          if (orientation < 1)
            // default upright
            orientation = 1
          this.loadFile(file, orientation)
        })
    }
  }
  //https://stackoverflow.com/questions/7584794/accessing-jpeg-exif-rotation-data-in-javascript-on-the-client-side/32490603#32490603
  getOrientation(file, callback) {
    var reader = new FileReader();
    reader.onload = () => {
        var view = new DataView(reader.result as ArrayBuffer);
        if (view.getUint16(0, false) != 0xFFD8)
        {
            return callback(-2);
        }
        var length = view.byteLength, offset = 2;
        while (offset < length) 
        {
            if (view.getUint16(offset+2, false) <= 8) return callback(-1);
            var marker = view.getUint16(offset, false);
            offset += 2;
            if (marker == 0xFFE1) 
            {
                if (view.getUint32(offset += 2, false) != 0x45786966) 
                {
                    return callback(-1);
                }

                var little = view.getUint16(offset += 6, false) == 0x4949;
                offset += view.getUint32(offset + 4, little);
                var tags = view.getUint16(offset, little);
                offset += 2;
                for (var i = 0; i < tags; i++)
                {
                    if (view.getUint16(offset + (i * 12), little) == 0x0112)
                    {
                        return callback(view.getUint16(offset + (i * 12) + 8, little));
                    }
                }
            }
            else if ((marker & 0xFF00) != 0xFF00)
            {
                break;
            }
            else
            { 
                offset += view.getUint16(offset, false);
            }
        }
        return callback(-1);
    };
    reader.readAsArrayBuffer(file);
  }
  loadFile(file, orientation:Number) {
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
        //https://stackoverflow.com/questions/20600800/js-client-side-exif-orientation-rotate-and-mirror-jpeg-images
        // transform context before drawing image
        switch (orientation) {
        case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
        case 3: ctx.transform(-1, 0, 0, -1, width, height); break;
        case 4: ctx.transform(1, 0, 0, -1, 0, height); break;
        case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
        case 6: ctx.transform(0, 1, -1, 0, height, 0); break;
        case 7: ctx.transform(0, -1, -1, 0, height, width); break;
        case 8: ctx.transform(0, -1, 1, 0, 0, width); break;
        default: break;
        }
        ctx.drawImage(img, iw/2-width/2*invscale, ih/2-height/2*invscale, width*invscale, height*invscale, 0, 0, width, height);
        URL.revokeObjectURL(img.src)
        // reset transform
        ctx.setTransform(1, 0, 0, 1, 0, 0)

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
        
        // persist - format, quality
        let dataurl = this.canvasRef.nativeElement.toDataURL('image/jpeg', 0.8)
        this.syncService.setSelfieImage(dataurl)
        this.selfiePresent = true
      }
      img.src = url;
      //this.imageRef.nativeElement.src = url
  }
  openPrivacyNotice() {
      this.syncService.log('link', {url: PRIVACY_NOTICE_URL})
      this.window.open(PRIVACY_NOTICE_URL, "_blank");
  }
}
