const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const sharp = require('sharp')
const { imagesToIco } = require('png-to-ico')

const SVG_PATH = path.join(__dirname, '../betinapp logo.svg')
const BUILD_DIR = path.join(__dirname, '../electron/icons')
const ICONSET_DIR = path.join(BUILD_DIR, 'icon.iconset')

// macOS iconset requires these exact filenames
const MAC_SIZES = [
  { file: 'icon_16x16.png',      size: 16   },
  { file: 'icon_16x16@2x.png',   size: 32   },
  { file: 'icon_32x32.png',      size: 32   },
  { file: 'icon_32x32@2x.png',   size: 64   },
  { file: 'icon_128x128.png',    size: 128  },
  { file: 'icon_128x128@2x.png', size: 256  },
  { file: 'icon_256x256.png',    size: 256  },
  { file: 'icon_256x256@2x.png', size: 512  },
  { file: 'icon_512x512.png',    size: 512  },
  { file: 'icon_512x512@2x.png', size: 1024 },
]

async function main() {
  fs.mkdirSync(BUILD_DIR, { recursive: true })
  fs.mkdirSync(ICONSET_DIR, { recursive: true })

  const svgBuffer = fs.readFileSync(SVG_PATH)

  // Generate all macOS iconset sizes
  for (const { file, size } of MAC_SIZES) {
    await sharp(svgBuffer).resize(size, size).png().toFile(path.join(ICONSET_DIR, file))
  }
  console.log('  iconset PNGs generated')

  // Build .icns with macOS iconutil
  execSync(`iconutil -c icns "${ICONSET_DIR}" -o "${path.join(BUILD_DIR, 'icon.icns')}"`)
  console.log('✓ build/icon.icns')

  // 1024×1024 PNG for Linux + Electron fallback
  await sharp(svgBuffer).resize(1024, 1024).png().toFile(path.join(BUILD_DIR, 'icon.png'))
  console.log('✓ build/icon.png')

  // Windows .ico — imagesToIco needs raw bitmap { data, width, height }
  const { data, info } = await sharp(svgBuffer)
    .resize(256, 256)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const icoBuffer = imagesToIco([{ data, width: info.width, height: info.height }])
  fs.writeFileSync(path.join(BUILD_DIR, 'icon.ico'), icoBuffer)
  console.log('✓ build/icon.ico')

  // Clean up the intermediate iconset folder
  fs.rmSync(ICONSET_DIR, { recursive: true })
  console.log('\nIcons ready in electron/icons/')
}

main().catch(err => { console.error(err); process.exit(1) })
