import * as dateFormat from 'dateformat';
import * as bunyan from 'bunyan';
import * as fs from 'fs';
import * as path from 'path';
import * as bunyanDebugStream from 'bunyan-debug-stream';

const LOG_FILENAME_DATE_FORMAT = "yyyymmdd'T'HHMMssl'Z'";
var ROOT_DIR = path.join(__dirname,'..');

var LOG_DIR = path.join(ROOT_DIR,'logs');
if (!fs.existsSync(LOG_DIR)) {
    console.log('Try to create log dir '+LOG_DIR);
    fs.mkdirSync(LOG_DIR);
    if (!fs.existsSync(LOG_DIR)) {
        console.log('ERROR: could not create log dir '+LOG_DIR);
    } else {
        console.log('Created log dir '+LOG_DIR);        
    }
}

let packageInfo = null;
try {
    let json = fs.readFileSync(path.join(ROOT_DIR,'package.json'),'utf8');
    packageInfo = JSON.parse(json);
}
catch (err) {
    console.log("Error reading/parsing package info from "+ROOT_DIR+'/package.json: '+err.message);
}

export interface Logger {
    fatal: (info:any, msg:string) => void
    error: (info:any, msg:string) => void
    warn: (info:any, msg:string) => void
    info: (info:any, msg:string) => void
    debug: (info:any, msg:string) => void
    trace: (info:any, msg:string) => void
}
export let log:Logger = null;

export function logInit(component:string)
{
    let now = new Date();
    let logPath = path.join(LOG_DIR, dateFormat(now, LOG_FILENAME_DATE_FORMAT)+'.log');
    let info:any = {
        logVersion: '1.0'
    };
    if (packageInfo!==null) {
        info.application = packageInfo.name;
        info.version = packageInfo.version;
    } else {
        // version ?!
    }
    let debug = !!process.env.DEBUG
    log =  bunyan.createLogger({
        name: component,
        streams: [
          {
            level: 'warn',
            type: 'raw',
            stream: bunyanDebugStream({
                basepath: __dirname, // this should be the root folder of your project.
            })
//            stream: process.stdout
          },
          {
            level: debug ? 'debug': 'info',
            path: logPath  
          }
        ]
    }) as Logger;
    log.info({info:info},'log.start');
}
