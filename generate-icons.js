const fs = require('fs');
const path = require('path');

// 创建 icons 目录
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// 生成简单的 PNG 图标（使用纯颜色填充）
// 创建一个简单的 128x128 图标
function createSimpleIcon(size, outputPath) {
  // PNG 文件头
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR 块
  const width = size;
  const height = size;
  const bitDepth = 8;
  const colorType = 2; // RGB
  const compression = 0;
  const filter = 0;
  const interlace = 0;
  
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(bitDepth, 8);
  ihdr.writeUInt8(colorType, 9);
  ihdr.writeUInt8(compression, 10);
  ihdr.writeUInt8(filter, 11);
  ihdr.writeUInt8(interlace, 12);
  
  const ihdrChunk = createChunk('IHDR', ihdr);
  
  // IDAT 块（图像数据）
  // 创建渐变背景
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // 过滤器字节
    for (let x = 0; x < width; x++) {
      // 创建从紫色到深紫色的渐变
      const ratio = y / height;
      const r = Math.round(102 + (118 - 102) * ratio);
      const g = Math.round(126 + (75 - 126) * ratio);
      const b = Math.round(234 + (162 - 234) * ratio);
      rawData.push(r, g, b);
    }
  }
  
  // 在中心添加一个简单的 "G" 字母
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const fontSize = Math.floor(size * 0.5);
  
  // 简单地在中心画一个白色圆圈表示 "G"
  const radius = Math.floor(fontSize / 2);
  for (let y = centerY - radius; y <= centerY + radius; y++) {
    if (y < 0 || y >= height) continue;
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      if (x < 0 || x >= width) continue;
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      if (dist <= radius) {
        const rowStart = y * (width * 3 + 1) + 1;
        const pixelStart = rowStart + x * 3;
        rawData[pixelStart] = 255;
        rawData[pixelStart + 1] = 255;
        rawData[pixelStart + 2] = 255;
      }
    }
  }
  
  const compressed = require('zlib').deflateSync(Buffer.from(rawData));
  const idatChunk = createChunk('IDAT', compressed);
  
  // IEND 块
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  // 组合所有数据
  const pngData = Buffer.concat([
    signature,
    ihdrChunk,
    idatChunk,
    iendChunk
  ]);
  
  fs.writeFileSync(outputPath, pngData);
  console.log(`Created: ${outputPath}`);
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const chunkData = Buffer.concat([typeBuffer, data]);
  const crc = require('zlib').crc32(chunkData);
  
  const chunk = Buffer.alloc(4 + 4 + data.length + 4);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc, 8 + data.length);
  
  return chunk;
}

// 生成不同尺寸的图标
const sizes = [16, 32, 48, 128];
sizes.forEach(size => {
  createSimpleIcon(size, path.join(iconsDir, `icon${size}.png`));
});

console.log('All icons generated successfully!');
