import { Item, ItemType, SelfieItem } from './socialtypes'

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
export const CONFIGURATION_FILE_VERSION = "lhv/local/v1"

export interface ScheduleItem {
  itemType:ItemType
  title:string
  description?:string
  item?:Item
  closePolls?:boolean
  id?:string // internal
  postCount?:number // internal
}

export interface Configuration {
  metadata:ConfigurationMetadata
  scheduleItems:ScheduleItem[]
  selfies:SelfieItem[]
  reposters:Reposter[]
}

export const MSG_CLIENT_HELLO = 'lhr.client.hello'
export const MSG_OUT_OF_DATE = 'lhr.out.of.date'
export const MSG_CONFIGURATION = 'lhr.configuration'
export const MSG_ANNOUNCE_ITEMS = 'lhr.announce.items'
export const MSG_ANNOUNCE_ITEM = 'lhr.announce.item'
export const MSG_POST_ITEM = 'lhr.post.item'
export const MSG_UPDATE_ITEM = 'lhr.update.item'

export const LOCAL_PROTOCOL_VERSION = 2

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
export interface PostItem {
    scheduleId:string
    item:Item
}

export interface UpdateItem {
    item:Item
}