import { Item, Feedback } from './socialtypes'

// protocol message IDs
export const MSG_CLIENT_HELLO = 'lhva.client.hello'
export const MSG_CONFIGURATION = 'lhva.server.configuration'
export const MSG_CURRENT_STATE = 'lhva.server.state'
export const MSG_OUT_OF_DATE = 'lhva.server.outofdate'
export const MSG_CLIENT_PING = 'lhva.client.ping'
export const MSG_ANNOUNCE_ITEM = 'lhva.announce.item'
export const MSG_FEEDBACK = 'lhva.feedback'

// protocol version number
export const CURRENT_VERSION:number = 11

export interface ClientTiming {
  clientSendTime:number
  lastServerSendTime:number
  lastClientRecvTime:number
  clientOffset:number
  roundTrip:number // estimate!
}

export interface ServerTiming {
  serverSendTime:number
  lastClientSendTime:number
  lastServerRecvTime:number
}

// body of MSG_CLIENT_HELLO
export interface ClientHello {
  version:number
  clientType:string // e.g. web/pwa, ios, android ??
  clientId:string
  clientSendTime:number
  timing?:ClientTiming
  configurationVersion?:string // if already configured
  performanceid:string
}

// body of MSG_PING
export interface ClientPing {
  timing:ClientTiming
}

// body of MSG_OUT_OF_DATE
export interface OutOfDate {
  serverVersion:number
  clientVersion:number
}

// body of MSG_CURRENT_STATE, also current state to control view (availability)
export interface CurrentState {
  forceView?:string
  allowMenu:boolean
  prePerformance:boolean
  inPerformance:boolean
  postPerformance:boolean
  serverStartTime:number
  serverSendTime:number
  error?:string // not usually from server
}
export interface CurrentStateMsg {
  currentState:CurrentState
  timing:ServerTiming
}

// one card in a view
export interface Card {
  html:string
}

// menu item
export interface MenuItem {
  id:string
  title:string
  prePerformance?:boolean
  inPerformance?:boolean
  postPerformance?:boolean
  cards:Card[]
  highlight?:boolean // internal
  url?:string // optional external url
  urlTitle?:string
  showOnHome?:boolean
}

// view
export interface View {
  id:string
  cards:Card[]
  act:number // clue for styling?! (1 or 2)
  defaultMenuId?:string
  audioFile?:string
  audioDelaySeconds?:number
  audioJitterSeconds?:number
  audioVolume?:number
  showItems?:boolean // social media stuff...
  postSelfie?:boolean // prompt
  dark?:boolean
  flicker?:FlickerConfig
  notify?:boolean
}

export interface FlickerConfig {
  images:string[]
  minFraction?:number
  maxFraction?:number
  minShowSeconds?:number
  maxShowSeconds?:number
  minBlankSeconds?:number
  maxBlankSeconds?:number
}

export interface ConfigurationMetadata {
  title:string
  description?:string
  author?:string
  version:string
  fileVersion:string
}

export const CONFIGURATION_FILE_VERSION = "lhv/audience/v4"

export interface NamePart {
  title:string
  required?:boolean
  options:string[]
  value?:string // internal
}

export interface Performance {
  id:string
  title:string
  isPublic?:boolean
  startDatetime:string // RFC3339 GMT
  durationSeconds?:number
  timezone?:string
}

export interface Options {
  notifyVibrate?:boolean
  notifySound?:boolean
  notifyPopup?:boolean
  noSoundInShow?:boolean
  notifyView?:boolean
}

export interface Configuration {
  metadata:ConfigurationMetadata
  options:Options
  performances:Performance[]
  menuItems:MenuItem[]
  views:View[]
  nameParts:NamePart[]
}
export interface ConfigurationMsg {
  configuration:Configuration
  timing:ServerTiming
}

export interface AnnounceItem {
  item:Item
  timing:ServerTiming
}

export interface FeedbackMsg {
  feedback:Feedback
  timing:ClientTiming
}
