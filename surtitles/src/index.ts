import * as mammoth from 'mammoth'
import * as sax from 'sax'
import * as fs from 'fs'

if (4 != process.argv.length) {
    console.log(`usage: node ${process.argv[1]} LIBRETTO.docx OUTFILEROOT`)
    process.exit(-1)
}

let path = process.argv[2]
let outroot = process.argv[3]

console.log(`reading script file ${path}`)

enum ItemType {
  SURTITLE,
  COMMENT,
  VOICE
}

interface Item {
  itemType:ItemType
  itemNumber?:string
  voice?:string
  text?:string // Caption or comment
  title?:boolean
}

function stripHtml(s:string): string {
    return s.replace(/<[^>]+>/g,'')
}
function escapeHtml(text:string):string {
  return text.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
}
// convert centred lines to "Heading2" style => h2 elements (why not :-)
function transformParagraph(element) {
    if (element.alignment === "center") {
        //console.log(`centered para style ${element.styleId} -> center`)
        return {...element, styleId: "Heading2"};
    } else {
        return element;
    }
}
// mammoth outputs each line as <p> ... </p>
// Bold as <strong> ... </strong> -> <b> ... </b>
// italic as <em> ... </em> -> <i> ... </i>
// Currently no paragraph formatting? 
var options = {
    transformDocument: mammoth.transforms.paragraph(transformParagraph),
    ignoreEmptyParagraphs:false,
    styleMap: [
        "b => b",
        "i => i",
    ]
};
mammoth.convertToHtml({path: path}, options)
    .then((result) => {
        //let lines = []
        let items:Item[] = []
        let html = result.value; // The generated HTML
        let messages = result.messages; // Any messages, such as warnings during conversion
        for (let message of messages) {
            console.log(`convertion message:`,message)
        }
        //console.log('result:', html)
        // Note: 
        let parser = sax.parser(false, {})
        let stack = []
        let line = []
        let addSpace:boolean = false
        parser.onerror = function (e) {
            // an error happened. 
            console.log(`ERROR: parsing: ${e}`)
        };
        parser.ontext = function (t) {
            // got some text.  t is the string of text.
            let trimmed = t.trim()
            if (trimmed.length>0) {
                let ix = t.indexOf(trimmed)
                if (ix>0) 
                    addSpace = true
                if (addSpace) {
                    for (let j=line.length-1; j>=0; j--) {
                        // before the first open tag
                        if (line[j].substring(0,1) == '<' && line[j].substring(0,2) != '</' ) 
                            continue
                        line.splice(j+1, 0, ' ')
                        break
                    }
                }
                // emote?
                if (trimmed.substring(0,1)=='<') {
                    console.log(`warning: tag or emote in text: ${trimmed}`)
                    trimmed = trimmed.replace('<', '(').replace('>', ')')
                } 
                line.push(trimmed)
                addSpace = t.length > trimmed.length+ix
            }
            //console.log(`text: ${t}`)
        };
        parser.onopentag = function (node) {
            // opened a tag.  node has "name" and "attributes" 
            let name = node.name.toLocaleLowerCase()
            stack.push(name)
            if (stack.length>2) {
                if (addSpace) {
                    line.push(' ')
                    addSpace = false
                }
                line.push('<'+name+'>')
            }
            //console.log(`open ${node.name}`)
        };
        parser.onclosetag = function (name) {
            name = name.toLocaleLowerCase()
            if (stack.length>2) {
                // discard if empty
                if (line.length>=1 && line[line.length-1] == '<'+name+'>') {
                    console.log(`trim empty ${name} tag`, line)
                    line.splice(line.length-1, 1)
                } else if (line.length>=2 && line[line.length-1].trim().length==0) {
                    console.log(`trim empty ${name} tag`, line)
                    line.splice(line.length-2, 2)
                } else {
                    line.push('</'+name+'>')
                }
            }
            stack.splice(stack.length-1, 1)
            if (stack.length==1) {
                //console.log(`line: ${line}`)
                let item:Item = {
                    itemType: name == 'p' ? ItemType.SURTITLE : ItemType.COMMENT,
                    text: line.join('')
                }
                items.push(item)
                line.splice(0,line.length)
                addSpace = false
            }
            //if ('p'==name && stack.length>1)
            //console.log(`stack after ${name}: ${stack}`)
        }
        parser.onattribute = function (attr) {
          // an attribute.  attr has "name" and "value" 
        };
        parser.onend = function () {
          // parser stream is done, and ready to have more stuff written to it. 
            console.log(`parse end`)
        };
         
        parser.write('<body>'+html+'</body>').close();
        return items;
    })
    .then((lines) => {
        console.log(`read ${lines.length} lines`)
        let items:Item[] = []
        let lastSurtitleBlank = false
      
        for (let line of lines) {
            // chop out comments
            if (line.itemType == ItemType.SURTITLE) {
                let bits = line.text.split('(')
                for (let ix=0; ix<bits.length; ix++) {
                    let bit = bits[ix].trim()
                    if (ix>0) {
                        let cix = bit.indexOf(')')
                        if (cix<0) {
                            console.log(`warning: unclosed comment in ${line.text}`)
                            cix = bit.length-1
                        }
                        let comment = bit.substring(0, cix+1).trim()
                        bit = bit.substring(cix+1).trim()
                        items.push({
                            itemType: ItemType.COMMENT,
                            text: '('+comment,
                        })
                    }
                    // orphaned </...?
                    if (bit.startsWith('</')) {
                        let cix = bit.indexOf('>')
                        if (cix<0) {
                            console.log(`warning: unclosed orphan closing tag in ${line.text}: ${bit}`)
                        } else {
                            console.log(`note: skipping orphaned closing tag after comment, in ${line.text}: ${bit}`)
                            bit = bit.substring(cix+1).trim()
                        }
                    }
                    if (bit.length>0) {
                        items.push({
                            itemType: line.itemType,
                            text: bit,
                        })
                        if (line.itemType == ItemType.SURTITLE)
                            lastSurtitleBlank = false
                    }
                }
                if (line.text.trim().length==0 && line.itemType == ItemType.SURTITLE && !lastSurtitleBlank) {
                    // blank line?! (but only one)
                    items.push({
                        itemType: line.itemType,
                        text: '',
                    })
                    lastSurtitleBlank = true
                }
            }
            else {
                if (line.itemType == ItemType.COMMENT){
                    if (line.text.startsWith('<b>Act ') || line.text.startsWith('<b>Scene ')) {
                        line.title = true
                    }
                }
                items.push(line)
            }
        }
        return items
    })
    .then((lines) => {
        // All bold surtitles are voice names
        //console.log(`read ${lines.length} lines`)
        let items:Item[] = []
        //let commentRegex = new RegExp('([^(]+)(\\([^\\)]*\\))?', 'g')
        let boldLineRegex = new RegExp('^<b>([^<]*)(</b>)?$')
        let surtitleCount:number = 0;
        for (let line of lines) {
            let m = boldLineRegex.exec(line.text)
            if (line.itemType== ItemType.SURTITLE && m) {
                items.push({
                    itemType: ItemType.VOICE,
                    voice: m[1],
                })
            } else {
                if (line.itemType==ItemType.SURTITLE) {
                    line.itemNumber = ''+(surtitleCount++)
                }
                items.push(line)
            }
        }
        return items
    })
    .then((lines) => {
        // fold voice entries into next comment/surtitle if possible
        let items:Item[] = []
        let voice:Item = null
        for (let line of lines) {
            if (line.itemType == ItemType.VOICE && voice) {
                items.push(voice)
                voice = null
            }
            if (line.itemType == ItemType.VOICE){
                voice = line;
            } else {
                if (voice) {
                    line.voice = voice.voice
                    voice = null
                }
                items.push(line)
            }
        }
        if (voice)
            items.push(voice)
        return items
    })
    // TODO merge/etc
    .then((items) => {
        let jsontext = JSON.stringify(items, null, 4)
        let jsonout = outroot+'.json'
        try {
            fs.writeFileSync(jsonout ,jsontext, {encoding:'utf8'})
        } catch(err) {
            console.log(`Error writing ${jsonout}: ${err.message}`)
        }
        console.log(`wrote to ${jsonout}`)
        let text = ''
        for (let item of items) {
            if (item.itemType == ItemType.SURTITLE) {
                text = text + item.text+'\n'
            }
        }
        let textout = outroot+'.txt'
        try {
            fs.writeFileSync(textout, text, {encoding:'utf8'})
        } catch(err) {
            console.log(`Error writing ${textout}: ${err.message}`)
        }        
        console.log(`wrote to ${textout}`)
        
        // HTML
        let html = '<html><head><title>Libretto</title></head><body><table><tbody>\n'
        for (let item of items) {
            if (item.title && !item.itemNumber && !item.voice) {
                html += `<tr><td colspan="3">${item.text ? item.text : ''}</td></tr>\n`
            } else {
                html += `<tr><td>${item.voice ? item.voice : ''}</td><td>${item.itemNumber ? item.itemNumber : ''}</td><td>${item.text ? item.text : ''}</td></tr>\n`
            }
        }
        html += '</tbody></body></html>\n'
        let htmlout = outroot+'.html'
        try {
            fs.writeFileSync(htmlout, html, {encoding:'utf8'})
        } catch(err) {
            console.log(`Error writing ${htmlout}: ${err.message}`)
        }        
        console.log(`wrote to ${htmlout}`)
    })
    .done();
