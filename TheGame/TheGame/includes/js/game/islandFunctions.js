define([
  'jquery',
  
  'game/constants',
  'dojo/topic'
], function($, C, topic){
  return{
    getRandomInt:function(min, max){
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    calcDistance:function (a, b, mult){
      var dx = mult*(a.x - b.x), dy = mult*(a.y - b.y);
      return Math.sqrt(dx * dx + dy * dy);
    },
    getCharOrder:function(){
      var maxRand = 4;
      var last = '_';
      var charList = [];
      // Put the chars for the border tiles into a list in a random order. 
      //    Chars must be grouped by kind. 
      //    Chars can only be put in once.
      //    Chars must be in groups of 2-4 to fill the 8 position array. 
      //      If one char has 4 positions, the others must have 2.
      //      If one char has 3 positions, the others can have 3 or 2
      while(charList.length < 8){
        if(C.CHARS.length != 0){
          var index = 0 + this.getRandomInt(0, C.CHARS.length - 1);
          var numberToAdd = this.getRandomInt(2, maxRand);
          if(numberToAdd == 4){
            maxRand = 2;
          }else{
            maxRand = 3;
          }
          for(var i = 0; i < numberToAdd && charList.length < 8; i++){
            last = C.CHARS[index];
            charList.push(last);
          }
          C.CHARS.splice(index, 1);
        }else{
          charList.push(last);
        }
      }
      //Decide the order the charList is going to be applied to the grid areas.
      var start = this.getRandomInt(0, 8);
      var order = [];
      for(var i = 0; i < 8; i++){
        if(start >= 8){
          start = 0;
        }
        order.push(charList[start]);
        start++;
      }
      //console.log(order);
      return order;
    },
    computeMCenter:function(mLocs){
      //console.log(mLocs);
      var center = -1;
      var prev=mLocs[0]-1;
      var count=0;
      for(var i=0;i<mLocs.length&&(prev+1)==mLocs[i];i++){
        if(center==-1){
          center = mLocs[i]*2;
          prev=mLocs[i];
          count++;
        }else{
          prev=mLocs[i];
          center++;
          count++;
        }
      }
      if(count<mLocs.length){
      prev=8;
      for(var i=mLocs.length-1;i>=0&&(prev-1)==mLocs[i];i--){
        center--;
        if(center<0){
          center+=16;
        }
        prev=mLocs[i];
      }}
      var mPoint;
      //console.log("CenterE:" + center);
      switch(center){
      case 0:
        mPoint = {x:0, y:C.DIM/4};
        break;
      case 1:
        mPoint = {x:0, y:0};
        break;
      case 2:
        mPoint = {x:C.DIM/4, y:0};
        break;
      case 3:
        mPoint = {x:C.DIM/2, y:0};
        break;
      case 4:
        mPoint = {x:3*C.DIM/4, y:0};
        break;
      case 5:
        mPoint = {x:C.DIM, y:0};
        break;
      case 6:
        mPoint = {x:C.DIM, y:C.DIM/4};
        break;
      case 7:
        mPoint = {x:C.DIM, y:C.DIM/2};
        break;
      case 8:
        mPoint = {x:C.DIM, y:3*C.DIM/4};
        break;
      case 9:
        mPoint = {x:C.DIM, y:C.DIM};
        break;
      case 10:
        mPoint = {x:3*C.DIM/4, y:C.DIM};
        break;
      case 11:
        mPoint = {x:C.DIM/2, y:C.DIM};
        break;
      case 12:
        mPoint = {x:C.DIM/4, y:C.DIM};
        break;
      case 13:
        mPoint = {x:0, y:C.DIM};
        break;
      case 14:
        mPoint = {x:0, y:3*C.DIM/4};
        break;
      case 15:
        mPoint = {x:0, y:C.DIM/2};
        break;
      }
      //console.log(mPoint);
      return mPoint;
    },
    getRealElevation:function(cell){
      if(cell.water && cell.lakeElevation != null){
        return cell.lakeElevation;
      }else if(cell.water && cell.elevation < 0){
        return 0;
      }else{
        return cell.elevation;
      }
    },
   // The Perlin-based island combines perlin noise with the radius and the distance away from the mountain center
   getElevation:function (point, mPoint, perlin){
     var p1={x:point.x/C.DIM, y:point.y/C.DIM};//convert this point from the actual dimension to a % of the width/height
     var p2={x:mPoint.x/C.DIM, y:mPoint.y/C.DIM};//convert the center Mountain point from actual dimension the a * of the width/height
     
     var distance2 = this.calcDistance(p1,p2,.3);//%distance from this point to the center Mountain point decreased to 60%
     var distance = this.calcDistance(p1, {x:.5,y:.5}, 2); //%distance from this point to the center increased to 150%
     var c = this.getPerlinValue(point, perlin);
  
     return c - (distance+distance2)/2;
     // return c - (0.3 + 0.3 * distance * distance);
   },
    getPerlinValue:function (point, perlin){
      var x = ((point.x / C.DIM) * perlin.width) | 0;
      var y = ((point.y / C.DIM) * (perlin.height-5)) | 0;
      var pos = (x + y * perlin.width) * 4;
      var data = perlin.data;
      var val = data[pos + 0] << 16 | data[pos + 1] << 8 | data[pos + 2]; // rgb to hex

      return (val & 0xff) / 255.0;
    }
  };
});