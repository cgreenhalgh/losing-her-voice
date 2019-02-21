// spreadsheet handling
import * as xlsx from 'xlsx'
import * as fs from 'fs'
import { ConfigurationMetadata, CONFIGURATION_FILE_VERSION, Configuration, ScheduleItem, NamePart } from './types'
import { Item, ItemType, SelfieItem, ShareItem, ShareSelfie, SimpleItem, QuizOrPollItem, QuizOption } from './socialtypes'

// excel cell name from column,row (start from 0)
function cellid(c:number,r:number): string {
  let p = String(r+1)
  let rec = (c) => {
    p = String.fromCharCode( ('A'.charCodeAt(0))+(c % 26) ) + p
    c = Math.floor (c/26)
    if (c!=0)
      rec( c-1 )
  }
  rec( c )
  return p 
}

export interface Row {
  [propName:string]: string
}
// generic spreadsheet sheet type
export interface Sheet {
  headings: string[]
  rows: Row[]
}

// read generic representation of sheet
export function readSheet(sheet:any): Sheet {
  let headings:string[] = []
  let prefix = ''
  let lastHeading = ''
  for (let c=0; true; c++) {
    let cell = sheet[cellid(c,0)]
    if (!cell)
      break
    let heading = String(cell.v).trim()
    // heading with ':' makes that a prefix added to subsequent column names
    let ix = heading.indexOf(':')
    if (ix==0) {
      // at start => append to last heading
      headings.push(lastHeading+'_'+heading.substring(1))
    } else if (ix>0) {
      prefix = heading.substring(0, ix)
      let suffix = heading.substring(ix+1)
      if (prefix.length>0 && suffix.length>0) {
        headings.push(prefix+'_'+suffix)
      } else {
        headings.push(prefix+suffix)
      }
    } else if (prefix.length>0) {
      headings.push(prefix+'_'+heading)
    } else {
      headings.push(heading)
      lastHeading = heading;
    }
    //console.log(`Found heading ${cell.v} at column ${c}, ${cellid(c,0)}`)
  }
  let rows:Row[] = []
  for (let r=1; true; r++) {
    let row:Row = {}
    let empty = true
    for (let c=0; c<headings.length; c++) {
      let cell = sheet[cellid(c,r)]
      if (cell) {
        let value = String(cell.v).trim()
        if (value.length>0) {
          row[headings[c]] = value
          empty = false
        }
      }
    }
    if (empty)
      break
    rows.push(row)
  }
  return { headings: headings, rows: rows}
}


// read settings in particular from sheet 'Metadata'
export function readMetadata(workbook:any): ConfigurationMetadata {
  let s = workbook.Sheets['Metadata']
  if ( !s) 
    throw new Error(`no "Metadata" sheet in workbook`)
  let sheet = readSheet(s)
  let metadata: ConfigurationMetadata = {
    title:'',
    version:'',
    fileVersion:CONFIGURATION_FILE_VERSION,
  }
  for (let row of sheet.rows) {
    if (row['value'])
      metadata[row['metadata']] = row['value']
  }
  return metadata
}

const TOOL = "daoauthor-1"

if (process.argv.length!=5) {
  console.log('Usage: node ... EXCELFILE INPUT.json OUTPUT.json')
  process.exit(-1)
}
let infile = process.argv[3]
console.log(`read ${infile}`)
let cdata = fs.readFileSync(infile, 'utf8')
let configuration:Configuration = JSON.parse(cdata) as Configuration
if (!configuration.metadata) {
    console.log(`input file ${infile} missing metadata section`)
    process.exit(-1)
}
if (CONFIGURATION_FILE_VERSION != configuration.metadata.fileVersion) {
    console.log(`input file metadata fileVersion is incompatible: expected ${CONFIGURATION_FILE_VERSION}, found ${configuration.metadata.fileVersion}`)
    process.exit(-1)
}

let excelfile = process.argv[2]
console.log(`read ${ excelfile }`)

try {
  let workbook = xlsx.readFile(excelfile)

  let metadata = readMetadata(workbook)
  if (CONFIGURATION_FILE_VERSION !=metadata.fileVersion) {
    console.log(`Spreadsheet metadata fileVersion is incompatible: expected ${CONFIGURATION_FILE_VERSION}, found ${metadata.fileVersion}`)
    process.exit(-1)
  }
  let title = metadata.title
  let version = metadata.version
  console.log(`read "${title}" version ${version}`)
  configuration.metadata = metadata
    
  let s = workbook.Sheets['ScheduledItems']
  if ( !s) 
    throw new Error(`no "ScheduledItems" sheet in workbook`)
  let items:Sheet = readSheet(s)
  console.log(`read ${items.rows.length} scheduled Items`, items)
  for (let row of items.rows) {
    let si:ScheduleItem = {
      itemNumber: row['itemNumber'],
      itemType:row['itemType'] as ItemType,
      title:row['title'],
      description:row['description'],
      //item?:Item
      closePolls: row['closePolls'] == 'true',
      //id// internal
      //postCount?:number // internal
      //showPreview?:boolean // internal
    }
    if (si.itemType == ItemType.SIMPLE) {
      let simple:SimpleItem = {
        // id?:string
        itemType:ItemType.SIMPLE,
        user_name:row['user_name'],
        user_icon:row['user_icon'],
        //date?:string
        toAudience:'true'==row['toAudience'],
        content:row['content'],
        image:row['image'],
        //likes
      }
      si.item = simple
    } else if (si.itemType == ItemType.QUIZ || si.itemType == ItemType.POLL) {
      let quiz:QuizOrPollItem = {
        // id?:string
        itemType:si.itemType,
        user_name:row['user_name'],
        user_icon:row['user_icon'],
        //date?:string
        toAudience:'true'==row['toAudience'],
        content:row['content'],
        options:[],
        //likes
        updateLive:'true'==row['updateLive'],
        openPrompt:row['openPrompt'],
        closedPrompt:row['closedPrompt'],
      }
      let OPTIONS = ['contentA', 'contentB', 'contentC', 'contentD']
      for (let option of OPTIONS) {
        let content = row[option]
        if (!content)
          break
        let correct = 'true' == row[option+'_correct']
        quiz.options.push({
          content:content,
          correct:correct,
        })
      }
      si.item = quiz

    } else if (si.itemType == ItemType.SELFIE && row['image']) {
      let selfie:SelfieItem = {
        // id?:string
        itemType:ItemType.SELFIE,
        user_name:row['user_name'],
        user_icon:row['user_icon'],
        //date?:string
        toAudience:'true'==row['toAudience'],
        image:row['image'],
        //likes
      }
      si.item = selfie
    } else if (si.itemType == ItemType.BLANK) {
      let blank:Item = {
        // id?:string
        itemType:ItemType.BLANK,
        user_name:'system',
        //user_icon:row['user_icon'],
        //date?:string
        toAudience:'true'==row['toAudience'],
      }
      si.item = blank
      if (!blank.toAudience) {
        console.log(`warning: blank item ${si.itemNumber} is not toAudience`)
      }
    } else if (si.itemType == ItemType.SELFIE || si.itemType == ItemType.REPOST) {
        if (row['user_name'] || row['user_icon'] || row['image']) {
            console.log(`warning: ${si.itemType} item ${si.itemNumber} has some content defined, but this will be ignored`)
        }
    } else if (si.itemType === undefined) {
        if (!si.closePolls) {
            console.log(`warning: item ${si.itemNumber} with undefined type, not closePolls`)
        }
    } else {
      console.log(`warning: item ${si.itemNumber} unhandled item type ${si.itemType}`)
    }
    configuration.scheduleItems.push(si)
  }
  let sn = workbook.Sheets['Names']
  if ( !sn) 
    console.log(`no "Names" sheet in workbook`)
  else {
    let names:Sheet = readSheet(sn)
    console.log(`read ${names.rows.length} Names`)
    configuration.nameParts = []
    for (let heading of names.headings) {
        let namePart:NamePart = {
            title: heading,
            options: []
        }
        for (let row of names.rows) {
            let name = row[heading]
            if (name)
                namePart.options.push(name)
        }
        configuration.nameParts.push(namePart)
    }
  }
  let outfile = process.argv[4]
  console.log(`write to ${outfile}`)
  let json = JSON.stringify(configuration, null, 2)
  fs.writeFileSync(outfile, json, 'utf8')
  console.log(`done`)
}
catch (err) {
  console.log(`Error: ${err.message}`, err)
}