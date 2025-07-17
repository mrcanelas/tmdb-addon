function getEpisodeThumbnail(imageUrl, hideEpisodeThumbnails) {
  if (!imageUrl) {
    return null;
  }
  
  if (hideEpisodeThumbnails) {
    return `${process.env.HOST_NAME}/api/image/blur?url=${encodeURIComponent(imageUrl)}`;
  }
  
  return imageUrl;
}

module.exports = { getEpisodeThumbnail };
