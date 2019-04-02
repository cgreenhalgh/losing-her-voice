import { log } from './logging'
import * as OSC from 'osc-js'
import * as redis from 'redis'
import * as dgram from 'dgram'
import { REDIS_CHANNEL_VIEW_STATE, ViewState } from './statetypes'
import { startPing } from './utils'

let PORT = 9123

// redis set-up
let redis_host = process.env.REDIS_HOST || '127.0.0.1';
let redis_config = { host: redis_host, port: 6379, auth_pass:null, retry_unfulfilled_commands: true };
if (process.env.REDIS_PASSWORD) {
  redis_config.auth_pass = process.env.REDIS_PASSWORD;
}

const OSC_LHVA_STATE = "/lhva/state"

export type OscCommandCallback = (command:string, args:any[]) => void

interface OscCommands {
  [propName:string]:OscCommandCallback
}

export class OSCBridge {
  performanceid:string
  commands:OscCommands = {}
  osc:OSC
  
  constructor() {
      log.debug({redisConfig:redis_config}, 'redis config');
    
      let redisPub = redis.createClient(redis_config);
      redisPub.on("error", function (err) {
        log.error({err:err}, `osc bridge redis error ${err.message}`);
      });
      startPing(redisPub)
      
      // debugging - OK now (was docker & vagrant config issues)
      /*
      const socket = dgram.createSocket('udp4')
      socket.bind(PORT, '0.0.0.0', ()=> { log.info({}, `bound`) })
      socket.on('message', function(msg, rinfo) {
        log.debug(`Received ${msg.length} bytes from ${rinfo.address}:${rinfo.port}');
      });
      socket.on('error', function(err) {
        log.error({err:err}, `socket error`)
      });
      */
      this.osc = new OSC({ 
        plugin: new OSC.DatagramPlugin({
          open: {
            port: PORT,
            host: '0.0.0.0'
          }
        }) 
      })
      this.osc.on('open', () => {
        log.info({}, `osc open`)
      })
      this.osc.on(OSC_LHVA_STATE, (message) => {
        if (message.args.length!=1) {
          log.error({args:message.args}, ` osc /lhva/state message with ${message.args.length} arguments`)
          return
        }
        if (!this.performanceid) {
            log.warn({}, `discarding osc /lhva/state message because performanceid is not set`)
            return
        }
        let msg:ViewState = {
            performanceid:this.performanceid,
            state:message.args[0],
        }
        log.info(msg, `osc.setstate`)
        redisPub.publish(REDIS_CHANNEL_VIEW_STATE, JSON.stringify(msg))
      })
      //osc.on('*', (message) => {
      //  log.debug({}, `Warning: osc message`, message)
      //})
      log.info({}, `bridge OSC from port ${PORT} to redis ${REDIS_CHANNEL_VIEW_STATE}; expecting ${OSC_LHVA_STATE} "..."`)
      this.osc.open()
    }
    addCommand(command:string, cb:OscCommandCallback): void {
      this.commands[command] = cb
      this.osc.on(command, (message) => {
        log.info({address: message.address, args: message.args}, 'osc.recv')
        cb(message.address, message.args)
      })
    }
    setPerformanceid(performanceid:string) {
        this.performanceid = performanceid
    }
}