module.exports = {
  createCanvas: () => ({
    getContext: () => ({
      measureText: () => ({ width: 0 }),
      drawImage: () => {},
      fillRect: () => {},
      fillText: () => {},
      beginPath: () => {},
      arc: () => {},
      stroke: () => {},
      closePath: () => {},
      clearRect: () => {},
    }),
    toBuffer: () => Buffer.from(''),
  }),
  Image: function Image() {},
}

