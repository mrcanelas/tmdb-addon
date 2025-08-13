const sharp = require('sharp');
const axios = require('axios');

async function blurImage(imageUrl) {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer'
    });

    const processedImageBuffer = await sharp(response.data)
      .blur(20)
      .toBuffer();

    return processedImageBuffer;
  } catch (error) {
    console.error('Error processing image:', error);
    return null;
  }
}

module.exports = { blurImage }; 