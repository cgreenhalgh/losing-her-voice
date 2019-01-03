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
export const CURRENT_VERSION:number = 9

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
  postPerformance:boolean
  cards:Card[]
  highlight?:boolean // internal
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
}

export interface ConfigurationMetadata {
  title:string
  description?:string
  author?:string
  version:string
  fileVersion:string
}

export const CONFIGURATION_FILE_VERSION = "lhv/audience/v2"

export interface NamePart {
  title:string
  required?:boolean
  options:string[]
  value?:string // internal
}

export interface Configuration {
  metadata:ConfigurationMetadata
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
