// Park-Miller-Carta Pseudo-Random Number Generator
define(['library/Simplex'], function(SimplexNoise){
  var PRNG = {
    seed : 1,
    next : function(){
      return (this.gen() / 2147483647);
    },
    nextRange : function(min, max){
      return min + ((max - min) * this.next())
    },
    gen : function(){
      return this.seed = (this.seed * 16807) % 2147483647;
    },
  };
  return {
    width:0,
    height:0,
    data:[], 
    perlinNoise : function(canvas, baseX, baseY, seed){
      var ctx = canvas.getContext('2d');
      this.height = canvas.height;
      this.width = canvas.width;
      var imagedata = ctx.createImageData(canvas.width, canvas.height);
      this.data = imagedata.data;

      var simplexR = new SimplexNoise(PRNG);
      simplexR.setSeed(seed);

      var simplexG = new SimplexNoise(PRNG);
      simplexG.setSeed(seed + 1);

      var simplexB = new SimplexNoise(PRNG);
      simplexB.setSeed(seed + 2);

      var pos, cr, cg, cb, gray;
      for(var y = 0; y < canvas.height; y++){
        for(var x = 0; x < canvas.width; x++){
          pos = (x + y * canvas.width) * 4;

          cr = Math.floor(((simplexR.noise(x / baseX, y / baseY) + 1) * 0.5) * 255);
          cg = Math.floor(((simplexG.noise(x / baseX, y / baseY) + 1) * 0.5) * 255);
          cb = Math.floor(((simplexB.noise(x / baseX, y / baseY) + 1) * 0.5) * 255);

          gray = (cr + cg + cb) / 3;

          this.data[pos + 0] = gray;
          this.data[pos + 1] = gray;
          this.data[pos + 2] = gray;
          this.data[pos + 3] = 255;
        }
      }

      ctx.putImageData(imagedata, 0, 0);
      this.data = imagedata.data;
      return imagedata;
    }
  };
});