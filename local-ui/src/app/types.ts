import { Item, ItemType, SelfieItem, ShareItem, ShareSelfie } from './socialtypes'

/* OLD
export interface Item {
    title:string;
    content?:string;
    date?:string;
    user_icon:string;
    image?:string;
    likes?:number;
}

export interface ControlItem {
    id:string;
    item:Item;
    postCount:number;
}
*/

export interface Reposter {
  user_name:string
  user_icon:string
}
export interface ConfigurationMetadata {
  title:string
  description?:string
  author?:string
  version:string
  fileVersion:string
}
export const CONFIGURATION_FILE_VERSION = "lhv/local/v2"

export enum VideoMode {
  HIDE = 'hide',
  FULLSCREEN = 'fullscreen',
  SELFIES = 'selfies'
}
export interface VideoState {
  url?:string
  mode:VideoMode
  loop?:boolean
  queue?:boolean
}
export interface ScheduleItem {
  itemNumber?:string
  itemType:ItemType
  title:string
  description?:string
  item?:Item
  closePolls?:boolean
  videoState?:VideoState
  id?:string // internal
  postCount?:number // internal
  showPreview?:boolean // internal
}

export interface Performance {
  id:string
  title:string
  isPublic?:boolean
  startDatetime:string // RFC3339 GMT
  durationSeconds?:number
  timezone?:string
}

export interface Configuration {
  metadata:ConfigurationMetadata
  performances:Performance[]
  scheduleItems:ScheduleItem[]
  selfies:SelfieItem[]
  reposters:Reposter[]
}

export const MSG_CLIENT_HELLO = 'lhr.client.hello'
export const MSG_OUT_OF_DATE = 'lhr.out.of.date'
export const MSG_CONFIGURATION = 'lhr.configuration'
export const MSG_ANNOUNCE_PERFORMANCE = 'lhr.announce.performance'
export const MSG_ANNOUNCE_ITEMS = 'lhr.announce.items'
export const MSG_ANNOUNCE_ITEM = 'lhr.announce.item'
export const MSG_START_PERFORMANCE = 'lhr.start.performance'
export const MSG_POST_ITEM = 'lhr.post.item'
export const MSG_MAKE_ITEM = 'lhr.make.item'
export const MSG_UPDATE_ITEM = 'lhr.update.item'
export const MSG_CLOSE_POLLS = 'lhr.close.polls'
export const MSG_VIDEO_STATE = 'lhr.video.state'
export const MSG_SELFIE_IMAGE = 'lhr.selfie.image'
export const MSG_ANNOUNCE_SHARE_ITEM = 'lhr.announce.share_item'
export const MSG_ANNOUNCE_SHARE_SELFIE = 'lhr.announce.share_selfie'
export const MSG_OSC_COMMAND = 'lhr.osc.command'

export const LOCAL_PROTOCOL_VERSION = 11

export interface ClientHello {
  version:number
}

export interface OutOfDate {
  clientVersion:number
  serverVersion:number
}

export interface ConfigurationMsg {
  configuration:Configuration
}
export interface AnnounceItems {
    items:Item[]
}
export interface AnnounceItem {
    item:Item
}
export interface AnnounceShareItem {
  shareItem:ShareItem
}
export interface AnnounceShareSelfie {
  shareSelfie:ShareSelfie
}
export interface AnnouncePerformance {
  performance:Performance
}
export interface StartPerformance {
  performance:Performance
}
export interface PostItem {
    scheduleId:string
    item:Item
}
export interface MakeItem {
  scheduleId:string
  itemType:ItemType
}
export interface UpdateItem {
    item:Item
}

export const OSC_GO = "/lhva/go"
export const OSC_RESET = "/lhva/reset"
export const OSC_PLAYHEAD_STAR = "/lhva/playhead/*"

export interface OscCommand {
  command:string
}
