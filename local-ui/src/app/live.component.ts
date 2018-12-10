import { Component, ViewChild, AfterViewInit, ElementRef, HostListener, Inject } from '@angular/core';
import { Item, SelfieItem, ItemType } from './socialtypes';
import { StoreService } from './store.service';
import { VideoState, VideoMode } from './types';
import { DOCUMENT } from '@angular/common';

class VideoInfo {
  url:string
  video:ElementRef
  playing:boolean = false
  constructor(url:string, video:ElementRef) {
    this.url = url
    this.video = video
  }
}

class ImageInfo {
  url:string
  image:ElementRef
  error:boolean = false
  constructor(url:string, image:ElementRef) {
    this.url = url
    this.image = image
    this.image.nativeElement.onerror = () => {
      console.log(`error with image ${url}`)
      this.error = true
    }
  }
}
const SELFIE_CANVAS_SIZE = 2048
const EXTRA_SELFIE_SCALE = 0.9

@Component({
  selector: 'live-view',
  templateUrl: './live.component.html',
  styleUrls: ['./live.component.css']
})
export class LiveComponent implements AfterViewInit {
    items: Item[];
    @ViewChild('feedChild') feedChild: ElementRef; 
    @ViewChild('itemsChild') itemsChild: ElementRef; 
    @ViewChild('videoDiv') videoDiv: ElementRef; 
    @ViewChild('videoCanvas') videoCanvas: ElementRef; 
    @ViewChild('videoMedia') videoMedia: ElementRef; 
    top:number = 0
    videoState: VideoState
    hideVideo:boolean = true
    count:number = 0
    videos:VideoInfo[] = []
    currentVideo:VideoInfo = null
    nextVideo:VideoInfo = null
    waitForNextVideo:boolean
    @ViewChild('selfieCanvas') selfieCanvas: ElementRef; 
    selfieCanvasCount:number = 0
    selfieCanvasSize:number = 1
    selfiesToAdd:ImageInfo[] = []
    
    constructor(
        private store:StoreService,
        @Inject(DOCUMENT) private document: any
    ) {
        this.items = [];
        this.store.getItems().subscribe((item:Item) => {
            // update?
            for (let ix = 0; ix < this.items.length; ix++) {
                let i = this.items[ix]
                if (i.id == item.id) {
                    console.log(`update item ${item.id}`, item)
                    this.items.splice(ix, 1, item)
                    return
                }
            }
            this.items.push(item)
            if (this.feedChild && this.itemsChild)
                this.update()
            if (this.videoState && this.videoState.mode == VideoMode.SELFIES && item.itemType == ItemType.SELFIE) {
                console.log(`new selfie to add ${item.id}`)
                let selfie = item as SelfieItem
                let img = document.createElement('img')
                img.src = selfie.image
                let ii = new ImageInfo(selfie.image, new ElementRef(img))
                this.selfiesToAdd.push(ii)
            }
        })
        this.store.getVideoState().subscribe((vs:VideoState) => {
            // update?
            this.videoState = vs
            if (vs && vs.url) {
                let vi = this.videos.find((vi) => vi.url == vs.url)
                if (!vi) {
                    console.log(`add video ${vs.url}`)
                    vi = new VideoInfo(vs.url, new ElementRef(document.createElement('video')))
                    vi.video.nativeElement.src = vs.url
                    vi.video.nativeElement.loop = !!vs.loop
                    vi.video.nativeElement.muted = true
                    vi.video.nativeElement.onerror = (e) => {
                        console.log(`video ${vi.url} error: ${e.message}`)
                    }
                    vi.video.nativeElement.onplaying = () => {
                        console.log(`video ${vi.url} playing`)
                        vi.playing = true
                    }
                    vi.video.nativeElement.load()
                }
                this.waitForNextVideo = !!vs.queue
                this.nextVideo = vi
            }
            if (vs && vs.mode == VideoMode.SELFIES) {
                this.selfiesToAdd = []
                this.selfieCanvasCount = 0
                this.selfieCanvasSize = 1
                if (this.selfieCanvas) {
                  let ctx: CanvasRenderingContext2D =
                    this.selfieCanvas.nativeElement.getContext('2d');
                  ctx.fillStyle = '#000' 
                  ctx.fillRect(0, 0, this.selfieCanvas.nativeElement.width, this.selfieCanvas.nativeElement.height)
                } 
            }
        })
    }
    @HostListener('window:resize', ['$event.target']) onResize() { 
        console.log('window:resize');
        this.resize();
    }
    ngAfterViewInit() {
        this.update()
        this.resize()
        this.redraw()
    }
    resize() {
        let width = this.videoDiv.nativeElement.clientWidth;
        let height = this.videoDiv.nativeElement.clientHeight;
        console.log('resize video '+width+'x'+height);
        this.videoCanvas.nativeElement.width = width;
        this.videoCanvas.nativeElement.height = height;
    }
    update() {
        setTimeout(() => {
            this.top = this.feedChild.nativeElement.offsetHeight - this.itemsChild.nativeElement.offsetHeight;
            console.log(`feedChild ${this.feedChild.nativeElement.offsetHeight} & itemsChild ${this.itemsChild.nativeElement.offsetHeight} -> ${this.top}`, this.feedChild, this.itemsChild)
        }, 0);
    }
    redraw() {
        requestAnimationFrame(() => {
            this.redraw()
        })
        let width = this.videoCanvas.nativeElement.width;
        let height = this.videoCanvas.nativeElement.height;
        let ctx: CanvasRenderingContext2D =
          this.videoCanvas.nativeElement.getContext('2d');
        
        if (!this.videoState || this.videoState.mode == VideoMode.HIDE) {
          // hide video
          if (!this.hideVideo) {
            console.log(`hide video`)
            this.hideVideo = true
            if (this.currentVideo) {
              this.currentVideo.video.nativeElement.pause()
              this.currentVideo.video.nativeElement.currentTime = 0
              this.currentVideo.playing = false
              this.currentVideo = null
              this.nextVideo = null
            }
          }
          return
        } else {
          if (this.hideVideo) {
            console.log(`show video`)
            this.hideVideo = false
            ctx.fillStyle = '#000'
            ctx.fillRect(0, 0, width, height);
          }
        }
        if (this.nextVideo && (!this.currentVideo || !this.waitForNextVideo || this.currentVideo.video.nativeElement.ended || this.currentVideo.video.nativeElement.error)) {
          if (this.currentVideo) {
            this.currentVideo.video.nativeElement.pause()
            this.currentVideo.video.nativeElement.currentTime = 0
            this.currentVideo.playing = false
          }
          this.nextVideo.video.nativeElement.play()
          .then(() => { console.log(`playing video`) })
          .catch((err) => { console.log(`error playing video: ${err.message}`, err) })
          this.currentVideo = this.nextVideo
          this.nextVideo = null
        }
        
        if (this.videoState.mode == VideoMode.SELFIES && this.selfiesToAdd.length>0) {
          if (this.selfiesToAdd[0].error) {
            let selfie = this.selfiesToAdd.splice(0,1)
            // ignore
          } else if (!this.selfiesToAdd[0].image.nativeElement.complete) {
            console.log(`waiting for selfie image ${this.selfiesToAdd[0].url}`)
          } else {
            let selfie = this.selfiesToAdd.splice(0,1)[0]
            let sctx = this.selfieCanvas.nativeElement.getContext('2d')
            let sw = this.selfieCanvas.nativeElement.width
            let sh = this.selfieCanvas.nativeElement.height
            this.selfieCanvasCount ++
            if (this.selfieCanvasCount >= this.selfieCanvasSize*this.selfieCanvasSize) {
              console.log(`increase selfieCanvasSize from ${this.selfieCanvasSize}`)
              this.selfieCanvasSize++
              // scale down existing
              sctx.drawImage(this.selfieCanvas.nativeElement, 0, 0, sw*(this.selfieCanvasSize-1)/this.selfieCanvasSize, sh*(this.selfieCanvasSize-1)/this.selfieCanvasSize)
              sctx.fillStyle = '#000'
              sctx.fillRect(0, sh*(this.selfieCanvasSize-1)/this.selfieCanvasSize, sw, sh/this.selfieCanvasSize)
              sctx.fillRect(sw*(this.selfieCanvasSize-1)/this.selfieCanvasSize, 0, sw/this.selfieCanvasSize, sh*(this.selfieCanvasSize-1)/this.selfieCanvasSize)              
            }
            // add selfie
            let iw = selfie.image.nativeElement.naturalWidth
            let ih = selfie.image.nativeElement.naturalHeight
            let iscale = Math.min(sw/iw, sh/ih)/this.selfieCanvasSize
            iscale *= EXTRA_SELFIE_SCALE
            console.log(`selfie image scale = ${iscale}: ${iw}x${ih} -> ${sw}x${sh}`)
            let si = this.selfieCanvasCount - (this.selfieCanvasSize-1)*(this.selfieCanvasSize-1)
            if (si < this.selfieCanvasSize-1)
              sctx.drawImage(selfie.image.nativeElement, (this.selfieCanvasSize-1)*sw/this.selfieCanvasSize+sw/2/this.selfieCanvasSize-iw*iscale/2,
                si*sh/this.selfieCanvasSize+sh/2/this.selfieCanvasSize-ih*iscale/2,
                iw*iscale, ih*iscale)
            else
              sctx.drawImage(selfie.image.nativeElement, (si-(this.selfieCanvasSize-1))*sw/this.selfieCanvasSize+sw/2/this.selfieCanvasSize-iw*iscale/2,
                (this.selfieCanvasSize-1)*sh/this.selfieCanvasSize+sh/2/this.selfieCanvasSize-ih*iscale/2,
                iw*iscale, ih*iscale)
            
            let scale = Math.min(width/sw, height/sh)
            console.log(`selfie scale = ${scale}: ${sw}x${sh} -> ${width}x${height}`)
            ctx.drawImage(this.selfieCanvas.nativeElement, width/2-sw*scale/2, height/2-sh*scale/2, sw*scale, sh*scale)
          }
        }
          
        if (this.currentVideo && this.currentVideo.playing) {
          let sw = this.selfieCanvas.nativeElement.width
          let sh = this.selfieCanvas.nativeElement.height
          let scale1 = Math.min(width/sw, height/sh)
          let vw = this.currentVideo.video.nativeElement.videoWidth
          let vh = this.currentVideo.video.nativeElement.videoHeight
          let scale2 = Math.min(sw/vw, sh/vh) * EXTRA_SELFIE_SCALE
          //console.log(`scale = ${scale}: ${vw}x${vh} -> ${width}x${height}`)
          if (this.videoState.mode == VideoMode.SELFIES) {
            scale2 = scale2/this.selfieCanvasSize
            ctx.drawImage(this.currentVideo.video.nativeElement, width/2-sw*scale1/2+sw*scale1/this.selfieCanvasSize/2-vw*scale1*scale2/2, 
              height/2-sh*scale1/2+sh*scale1/this.selfieCanvasSize/2-vh*scale1*scale2/2, vw*scale1*scale2, vh*scale1*scale2)
          } else {
            ctx.drawImage(this.currentVideo.video.nativeElement, width/2-vw*scale1*scale2/2, height/2-vh*scale1*scale2/2, vw*scale1*scale2, vh*scale1*scale2)
          }
        } else {
          if (this.currentVideo )
            console.log(`waiting for current video to play`)
        }
    }
}
