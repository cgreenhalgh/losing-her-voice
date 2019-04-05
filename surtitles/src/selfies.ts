import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'

// copy selected selfie images
if (process.argv.length != 7) {
    console.log(`Error: usage: ... STOCK-DIR DONATED-DIR SHOW-DIR OUTPUT-DIR NUMBER`)
    process.exit(-1)
}

function getImages(dir:string) :string[] {
    let all = fs.readdirSync(dir)
    let images = all.filter((n) => path.extname(n) == '.jpeg').map((f) => path.join(dir, f))
    console.log(`found ${images.length} jpegs in ${dir} (out of ${all.length} files)`)
    return images
}

let images:string[][] = [
    getImages(process.argv[2]),
    getImages(process.argv[3]),
    getImages(process.argv[4])
]
let outdir = process.argv[5]
let count = Number(process.argv[6])

let order:number[] = [2,1,2,1,0,2,1,0,0]

let selected:string[] = []
let nextInOrder = 0

function selectNFrom(selectFrom:string[], n:number) : string[] {
    let sf:string[] = [].concat(selectFrom)
    let res:string[] = []
    for (let count=0; count<n; count++) {
        let r = Math.floor(Math.random() * sf.length)
        res.push( sf.splice(r, 1)[0] )
    }
    return res
}

while (selected.length < count) {
    let selectFrom = images[order[nextInOrder]]
    nextInOrder = (nextInOrder+1) % order.length
    let n = selected.length + selectFrom.length <= count ? selectFrom.length : count - selected.length
    let add = selectNFrom(selectFrom, n)
    selected = selected.concat(add)
}

//console.log(`selected`, selected)
// TODO copy
for (let i=0; i<selected.length; i++) {
    let inpath = selected[i]
    let outpath = path.join( outdir, `img${i}${path.extname(inpath)}`)
    console.log(`${inpath} -> ${outpath}`)
    let data = fs.readFileSync(inpath)
    fs.writeFileSync(outpath, data)
}

console.log(`Done; ${selected.length} files`)