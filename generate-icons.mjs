import sharp from 'sharp'
import fs from 'fs'

const svgPath = './public/icons/icon.svg'
const svgBuffer = fs.readFileSync(svgPath)

await sharp(svgBuffer).resize(192, 192).png().toFile('./public/icons/icon-192.png')
console.log('✅ icon-192.png created')

await sharp(svgBuffer).resize(512, 512).png().toFile('./public/icons/icon-512.png')
console.log('✅ icon-512.png created')

await sharp(svgBuffer).resize(180, 180).png().toFile('./public/apple-touch-icon.png')
console.log('✅ apple-touch-icon.png created')