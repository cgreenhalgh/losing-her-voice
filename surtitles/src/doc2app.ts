import * as mammoth from 'mammoth'
import * as sax from 'sax'
import * as fs from 'fs'

if (4 != process.argv.length) {
    console.log(`usage: node ${process.argv[1]} AUDIENCE-TEXT.docx OUTFILE.json`)
    process.exit(-1)
}

let path = process.argv[2]
let outfile = process.argv[3]

console.log(`reading content file ${path}`)

// mammoth outputs each line as <p> ... </p>
// Bold as <strong> ... </strong> -> <b> ... </b>
// italic as <em> ... </em> -> <i> ... </i>
// Currently no paragraph formatting? 
var options = {
    //transformDocument: mammoth.transforms.paragraph(transformParagraph),
    ignoreEmptyParagraphs:false,
    styleMap: [
        "b => b",
        "i => i",
    ]
};

interface Item {
    html:string
}
mammoth.convertToHtml({path: path}, options)
    .then((result) => {
        let html = result.value; // The generated HTML
        let messages = result.messages; // Any messages, such as warnings during conversion
        for (let message of messages) {
            console.log(`convertion message:`,message)
        }
        //console.log('result:', html)
        let lines = html.split('<p></p>')
        console.log(`read ${lines.length} blocks`)
        let output = ''
        for (let line of lines) {
            let item:Item = {html: line}
            output += JSON.stringify(item) + '\n'
        }
        //let jsontext = JSON.stringify(items, null, 4)
        try {
            fs.writeFileSync(outfile ,output, {encoding:'utf8'})
        } catch(err) {
            console.log(`Error writing ${outfile}: ${err.message}`)
        }
        console.log(`wrote to ${outfile}`)
    })
    .done();
