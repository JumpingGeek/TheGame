//Version History
/* * * * * * * *
 * Version 1.0.0
 *  -2016-2-6   -Island map generator as pulled from https://github.com/lebesnec/island.js
 * Version 1.0.1
 *  -2016-2-?   -allowed init with specified seed
 * Version 1.1.0
 *  -2016-2-?  -added impassible borders (Ocean, Mountian, and Desert)
 * Version 1.1.1
 *  -2016-2-19 -added click-to highlight cell functionality
 * * * * * * * */

var DISPLAY_COLORS = {
  OCEAN : new paper.Color('#82caff'),
  BEACH : new paper.Color('#ffe98d'),
  LAKE : new paper.Color('#2f9ceb'),
  RIVER : new paper.Color('#369eea'),
  SOURCE : new paper.Color('#00f'),
  MARSH : new paper.Color('#2ac6d3'),
  ICE : new paper.Color('#b3deff'),
  ROCK : new paper.Color('#535353'),
  LAVA : new paper.Color('#e22222'),

  SNOW : new paper.Color('#f8f8f8'),
  TUNDRA : new paper.Color('#ddddbb'),
  BARE : new paper.Color('#bbbbbb'),
  SCORCHED : new paper.Color('#999999'),
  TAIGA : new paper.Color('#ccd4bb'),
  SHRUBLAND : new paper.Color('#c4ccbb'),
  TEMPERATE_DESERT : new paper.Color('#e4e8ca'),
  TEMPERATE_RAIN_FOREST : new paper.Color('#a4c4a8'),
  TEMPERATE_DECIDUOUS_FOREST : new paper.Color('#b4c9a9'),
  GRASSLAND : new paper.Color('#c4d4aa'),
  TROPICAL_RAIN_FOREST : new paper.Color('#9cbba9'),
  TROPICAL_SEASONAL_FOREST : new paper.Color('#a9cca4'),
  SUBTROPICAL_DESERT : new paper.Color('#e9ddc7'),
  IMPASSIBLE_MOUNTIAN : new paper.Color('#00ff00'),
  IMPASSIBLE_DESERT : new paper.Color('#ff1493')
};

var Island = {
  config : {
    width : 500,
    height : 500,
    perlinWidth : 256,
    perlinHeight : 256,
    allowDebug : false, // if set to true, you can clic on the map to enter "debug" mode. Warning : debug mode is slow
                        // to initialize, set to false for faster rendering.
    nbSites : 10000, // nb of voronoi cell
    sitesDistribution : 'hexagon', // distribution of the site : random, square or hexagon
    sitesRandomisation : 80, // will move each site in a random way (in %), for the square or hexagon distribution to
                              // look more random
    nbGraphRelaxation : 0, // nb of time we apply the relaxation algo to the voronoi graph (slow !), for the random
                            // distribution to look less random
    cliffsThreshold : 0.15,
    lakesThreshold : 0.005, // lake elevation will increase by this value (* the river size) when a new river end inside
    nbRivers : (10000 / 200),
    maxRiversSize : 4,
    shading : 0.35,
    shadeOcean : true
  },
  debug : false, // true if "debug" mode is activated
  voronoi : new Voronoi(),
  diagram : null,
  sites : [],
  seed : -1,
  perlin : null,
  cellsLayer : null,
  riversLayer : null,
  debugLayer : null,
  highlightLayer : null,

  init : function(userConfig){
    if(userConfig == undefined){
      userConfig = {};
    }
    this.config.width =             (userConfig.width             != undefined ? userConfig.width             : view.viewSize.width);
    this.config.height =            (userConfig.height            != undefined ? userConfig.height            : view.viewSize.height);
    this.config.perlinWidth =       (userConfig.perlinWidth       != undefined ? userConfig.perlinWidth       : (this.config.width / 3));
    this.config.perlinHeight =      (userConfig.perlinHeight      != undefined ? userConfig.perlinHeight      : (this.config.height / 3));
    this.config.allowDebug =        (userConfig.allowDebug        != undefined ? userConfig.allowDebug        : false);
    this.config.nbSites =           (userConfig.nbSites           != undefined ? userConfig.nbSites           : ((this.config.width * this.config.height) / 100));
    this.config.sitesDistribution = (userConfig.sitesDistribution != undefined ? userConfig.sitesDistribution : 'hexagon');
    this.config.sitesRandomisation =(userConfig.sitesRandomisation!= undefined ? userConfig.sitesRandomisation: 80);
    this.config.nbGraphRelaxation = (userConfig.nbGraphRelaxation != undefined ? userConfig.nbGraphRelaxation : 0);
    this.config.cliffsThreshold =   (userConfig.cliffsThreshold   != undefined ? userConfig.cliffsThreshold   : 0.15);
    this.config.lakesThreshold =    (userConfig.lakesThreshold    != undefined ? userConfig.lakesThreshold    : 0.005);
    this.config.nbRivers =          (userConfig.nbRivers          != undefined ? userConfig.nbRivers          : (this.config.nbSites / 200));
    this.config.maxRiversSize =     (userConfig.maxRiversSize     != undefined ? userConfig.maxRiversSize     : 4);
    this.config.shading =           (userConfig.shading           != undefined ? userConfig.shading           : 0.35);
    this.config.shadeOcean =        (userConfig.shadeOcean        != undefined ? userConfig.shadeOcean        : true);
    this.seed =                     (userConfig.seed              != undefined ? userConfig.seed              : Math.random());
    this.cellsLayer     = new paper.Layer({name : 'cell'});
    this.riversLayer    = new paper.Layer({name : 'rivers'});
    this.highlightLayer = new paper.Layer({name : 'highlight'});
    this.debugLayer     = new paper.Layer({name : 'debug',visible : false});

    // this.seed = Math.random();
    this.perlinCanvas = document.getElementById('perlin');
    this.perlinCanvas.width = this.config.perlinWidth;
    this.perlinCanvas.height = this.config.perlinHeight;
    this.perlin = perlinNoise(this.perlinCanvas, 64, 64, this.seed);
    this.config.delta = this.randomSites();// build the diagram

    this.assignOceanCoastAndLand();
    console.log('Done with oceanCoastAndLand');
    this.assignRivers();
    console.log('Done with rivers');
    this.assignMoisture();
    console.log('Done with moisture');
    this.assignBiomes();
    console.log('Done with biomes');

    this.render();
  },

  randomSites : function(n){
    var maxX = this.config.width;
    var maxY = this.config.height;

    var chars = ['O', 'D', 'M'];
    var maxRand = 4;
    var last = '_';
    var charList = [];
    /*******************************************************************************************************************
     * Put the chars for the border tiles into a list in a random order. Chars must be grouped by kind. Chars can only
     * be put in once. Chars must be in groups of 2-4 to fill the 8 position array. if one char has 4 positions, the
     * others must have 2. if one char has 3 positions, the others can have 3 or 2
     ******************************************************************************************************************/
    while(charList.length < 8){
      if(chars.length != 0){
        var index = 0 + this.getRandomInt(0, chars.length - 1);
        var numberToAdd = this.getRandomInt(2, maxRand);
        if(numberToAdd == 4){
          maxRand = 2;
        }else{
          maxRand = 3;
        }
        for(var i = 0; i < numberToAdd && charList.length < 8; i++){
          last = chars[index];
          charList.push(last);
        }
        chars.splice(index, 1);
      }else{
        charList.push(last);
      }
    }

    console.log(charList);
    /**
     * Decide the order the charList is going to be applied to the grid areas.
     */
    var start = this.getRandomInt(0, 8);
    var order = [];
    for(var i = 0; i < 8; i++){
      if(start >= 8){
        start = 0;
      }
      order.push(start);
      start++;
    }
    console.log(order);
    var sites = [];

    // create vertices
    if(this.config.sitesDistribution == 'random'){
      for(var i = 0; i < this.config.nbSites; i++){
        var curX = Math.round(Math.random() * maxX);
        var curY = Math.round(Math.random() * maxY);
        var type = this.decideBorderValue(delta, curX, curY, maxX, maxY, charList, order, x, y);
        sites.push({
          x : curX,
          y : curY,
          v : type
        });
      }
    }else{
      var delta = Math.sqrt(this.config.width * this.config.height / this.config.nbSites);
      var rand = this.config.sitesRandomisation * delta / 100;
      var x = 0;
      var y = 0;
      for(var i = 0; i < this.config.nbSites; i++){
        var curX = Math.max(Math.min(Math.round(x * delta + (Math.random() * rand)), maxY), 0);
        var curY = Math.max(Math.min(Math.round(y * delta + (Math.random() * rand)), maxY), 0);
        var type = this.decideBorderValue(delta, curX, curY, maxX, maxY, charList, order, x, y);
        sites.push({
          x : curX,
          y : curY,
          v : type
        });
        x = x + 1;
        if(x * delta > this.config.width){
          x = (y % 2 == 1 || this.config.sitesDistribution == 'square' ? 0 : 0.5);
          y = y + 1;
        }
      }
    }
    this.compute(sites);
    for(var i = 0; i < this.config.nbGraphRelaxation; i++){
      this.relaxSites();
    }
    /** **output*** */
    var disY = 0;
    var output = '';
    for(var i = 0; i < this.config.nbSites; i++){
      var cell = this.diagram.cells[i].site;
      if(cell.y != disY){
        console.log(output);
        disY = cell.y;
        output = '';
      }else{
        output += cell.v + ' ';
      }
    }
    console.log(output);
    /** end output* */
    return delta;
  },

  decideBorderValue : function(delta, realX, realY, maxX, maxY, charList, order, x, y){
    var adjX = realX + 1;// avoid div by 0
    var adjY = realY + 1;// avoid div by 0

    /**
     * Account for non-square grids. If the grid is non-square, we must strech the values of the shorter side for when
     * when we calculate the diagonals to keep half above and half below the angle
     */
    if(maxX > maxY){
      perc = maxX / maxY;
      adjY = adjY * perc;
    }else{
      perc = maxY / maxX;
      adjX = adjX * perc
    }

    /**
     * Decide to which area (one eighth of the grid) this point belongs Areas are divided up radially around the
     * midpoint (a0-a7). If the grid were a clock face, the areas would be 1 1/2 hours long 10:30 12:00 1:30 \ | / \ a1 |
     * a2 / \ | / a0 \ | / a3 \ | / 9:00---------+---------3:00 / | \ a7 / | \ a4 / | \ / a6 | a5 \ / | \ 7:30 6:00 4:30
     */
    // Top-Left to Bottom-Right diagonal
    var val1 = -5; // default/error value
    if((adjX / adjY) < 1){
      val1 = 1; // bottom-left half [a0, a7, a6, a5]
    }else if((adjX / adjY) > 1){
      val1 = 0; // top-right half [a1, a2, a3, a4]
    }else{
      if(y < (maxY / 2)){
        val1 = 0; // top half of the axis belongs to the top-right
      }else{
        val1 = 1; // bottom half of the axis belongs to the bottom-left
      }
    }

    // Top-Right to Bottom-Left diagonal
    var val2 = -5; // default/error value
    if((adjX + adjY) < Math.max(maxX, maxY) + 1){
      val2 = 4 // bottom-left half [a7, a0, a1, a2]
    }else if((adjX + adjY) > Math.max(maxX, maxY) + 1){
      val2 = 2; // top-right half [a6, a5, a4, a3]
    }else{
      if(y < (maxY / 2)){
        val2 = 4; // top half of the axis belongs to the bottom-left
      }else{
        val2 = 2; // bottom half of the axis belongs to the top right
      }
    }

    // Vertical midpoint
    var val3 = 1; // left half and center [a1, a0, a7, a6]
    if(adjX > (maxX / 2)){
      val3 = 0; // right half [a2, a3, a4, a5]
    }

    // Horizontal midpoint
    var val4 = 0; // top half and center [a0, a1, a2, a3]
    if(adjY > (maxY / 2)){
      val4 = 5; // bottom half [a7, a6, a5, a4]
    }

    var type = '_';// default value
    // values for each half-division of the grid are picked in such a way that the sum of the 4 numbers will give unique
    // results for each area of the grid
    switch(val1 + val2 + val3 + val4){
    case 6:// a0
      type = charList[order[0]];
      break;
    case 5:// a1
      type = charList[order[1]];
      break;
    case 4:// a2
      type = charList[order[2]];
      break;
    case 2:// a3
      type = charList[order[3]];
      break;
    case 7:// a4
      type = charList[order[4]];
      break;
    case 8:// a5
      type = charList[order[5]];
      break;
    case 9:// a6
      type = charList[order[6]];
      break;
    case 11:// a7
      type = charList[order[7]];
      break;
    default:// error value
      type = '_';
    }
    return type;
  },

  compute : function(sites){
    this.sites = sites;
    this.voronoi.recycle(this.diagram);
    var bbox = {
      xl : 0,
      xr : this.config.width,
      yt : 0,
      yb : this.config.height
    };
    this.diagram = this.voronoi.compute(sites, bbox);
  },

  relaxSites : function(){
    if(!this.diagram){
      return;
    }
    var cells = this.diagram.cells, iCell = cells.length, cell, site, sites = [], rn, dist;
    var p = 1 / iCell * 0.1;
    while(iCell--){
      cell = cells[iCell];
      rn = Math.random();
      // probability of apoptosis
      if(rn < p){
        continue;
      }
      site = this.cellCentroid(cell);
      dist = this.distance(site, cell.site);
      // don't relax too fast
      if(dist > 2){
        site.x = (site.x + cell.site.x) / 2;
        site.y = (site.y + cell.site.y) / 2;
      }
      // probability of mytosis
      if(rn > (1 - p)){
        dist /= 2;
        sites.push({
          x : site.x + (site.x - cell.site.x) / dist,
          y : site.y + (site.y - cell.site.y) / dist
        });
      }
      sites.push(site);
    }
    this.compute(sites);
  },

  cellArea : function(cell){
    var area = 0, halfedges = cell.halfedges, iHalfedge = halfedges.length, halfedge, p1, p2;
    while(iHalfedge--){
      halfedge = halfedges[iHalfedge];
      p1 = halfedge.getStartpoint();
      p2 = halfedge.getEndpoint();
      area += p1.x * p2.y;
      area -= p1.y * p2.x;
    }
    area /= 2;
    return area;
  },

  cellCentroid : function(cell){
    var x = 0, y = 0, halfedges = cell.halfedges, iHalfedge = halfedges.length, halfedge, v, p1, p2;
    while(iHalfedge--){
      halfedge = halfedges[iHalfedge];
      p1 = halfedge.getStartpoint();
      p2 = halfedge.getEndpoint();
      v = p1.x * p2.y - p2.x * p1.y;
      x += (p1.x + p2.x) * v;
      y += (p1.y + p2.y) * v;
    }
    v = this.cellArea(cell) * 6;
    return {
      x : x / v,
      y : y / v
    };
  },

  assignOceanCoastAndLand : function(){
    // water
    var queue = new Array();
    // find border cells and add them to the queue to deal with neighbors
    for(var i = 0; i < this.diagram.cells.length; i++){
      var cell = this.diagram.cells[i];
      cell.elevation = this.getElevation(cell.site);
      cell.water = (cell.elevation <= 0);
      var numWater = 0;
      for(var j = 0; j < cell.halfedges.length; j++){
        var hedge = cell.halfedges[j];
        // border
        if(hedge.edge.rSite == null){
          cell.border = true;// if one of this cell's adjoining cells is null, it is a border cell and this sets it to
                              // water
          if(cell.site.v == 'M'){
            cell.elevation += 1;
            cell.water = false;
            cell.impassM = true;
          }else if(cell.site.v == 'D'){
            cell.elevation = Math.max(cell.elevation, 0);
            cell.water = false;
            cell.impassD = true;
          }else{
            cell.water = true;
            cell.ocean = true;
            cell.elevation = Math.min(cell.elevation, 0);
          }
          queue.push(cell);
        }
      }
    }

    // ocean
    while(queue.length > 0){
      var cell = queue.shift();// aka pop();
      var neighbors = cell.getNeighborIds();
      for(var i = 0; i < neighbors.length; i++){
        var nId = neighbors[i];
        var neighbor = this.diagram.cells[nId];
        if(neighbor.water && !neighbor.ocean && !neighbor.impassM && !neighbor.impassD){
          if(neighbor.site.v == 'M'){
            neighbor.elevation += 1;
            neighbor.water = false;
            neighbor.impassM = true;
          }else if(neighbor.site.v == 'D'){
            neighbor.elevation = Math.max(neighbor.elevation, 0);
            neighbor.water = false;
            neighbor.impassD = true;
          }else{
            neighbor.ocean = true;
          }
          queue.push(neighbor);
        }
      }
    }

    // coast
    for(var i = 0; i < this.diagram.cells.length; i++){
      var cell = this.diagram.cells[i];
      var numOcean = 0;
      var neighbors = cell.getNeighborIds();
      for(var j = 0; j < neighbors.length; j++){
        var nId = neighbors[j];
        var neighbor = this.diagram.cells[nId];
        if(neighbor.ocean){
          numOcean++;
        }
      }
      cell.coast = (numOcean > 0) && (!cell.water);
      cell.beach = (cell.coast && cell.elevation < this.config.cliffsThreshold);
    }

    // cliff
    for(var i = 0; i < this.diagram.edges.length; i++){
      var edge = this.diagram.edges[i];
      if(edge.lSite != null && edge.rSite != null){
        var lCell = this.diagram.cells[edge.lSite.voronoiId];
        var rCell = this.diagram.cells[edge.rSite.voronoiId];
        edge.cliff = (!(lCell.water && rCell.water) && (Math.abs(this.getRealElevation(lCell)
            - this.getRealElevation(rCell)) >= this.config.cliffsThreshold));
      }
    }
  },

  assignRivers : function(){
    for(var i = 0; i < this.config.nbRivers;){
      var cell = this.diagram.cells[this.getRandomInt(0, this.diagram.cells.length - 1)];
      if(!cell.coast && !cell.impassD){
        if(this.setAsRiver(cell, 1)){
          cell.source = true;
          i++;
        }
      }
    }
  },

  setAsRiver : function(cell, size){
    if(!cell.water && !cell.river){
      cell.river = true;
      cell.riverSize = size;
      var lowerCell = null;
      var neighbors = cell.getNeighborIds();
      // we choose the lowest neighbour cell :
      for(var j = 0; j < neighbors.length; j++){
        var nId = neighbors[j];
        var neighbor = this.diagram.cells[nId];
        if((lowerCell == null || neighbor.elevation < lowerCell.elevation) && !neighbor.impassD){
          lowerCell = neighbor;
        }
      }
      if(lowerCell.elevation < cell.elevation){
        // we continue the river to the next lowest cell :
        this.setAsRiver(lowerCell, size);
        cell.nextRiver = lowerCell;
      }else{
        // we are in a hole, so we create a lake :
        cell.water = true;
        this.fillLake(cell);
      }
    }else if(cell.water && !cell.ocean){
      // we ended in a lake, the water level rise :
      cell.lakeElevation = this.getRealElevation(cell) + (this.config.lakesThreshold * size);
      this.fillLake(cell);
    }else if(cell.river){
      // we ended in another river, the river size increase :
      cell.riverSize++;
      var nextRiver = cell.nextRiver;
      while(nextRiver){
        nextRiver.riverSize++;
        nextRiver = nextRiver.nextRiver;
      }
    }

    return cell.river;
  },

  fillLake : function(cell){
    // if the lake has an exit river he can not longer be filled
    if(cell.exitRiver == null){
      var exitRiver = null;
      var exitSource = null;
      var lake = new Array();
      var queue = new Array();
      queue.push(cell);

      while(queue.length > 0){
        var c = queue.shift();
        lake.push(c);
        var neighbors = c.getNeighborIds();
        for(var i = 0; i < neighbors.length; i++){
          var nId = neighbors[i];
          var neighbor = this.diagram.cells[nId];

          if(neighbor.water && !neighbor.ocean){ // water cell from the same lake
            if(neighbor.lakeElevation == null || neighbor.lakeElevation < c.lakeElevation){
              neighbor.lakeElevation = c.lakeElevation;
              queue.push(neighbor);
            }
          }else if(!neighbor.impassD){ // ground cell adjacent to the lake that's not an impassible desert
            if(c.elevation < neighbor.elevation){
              if(neighbor.elevation - c.lakeElevation < 0){// neighbor is heigher than the current cell, but lower than
                                                            // the level of the water
                // we fill the ground with water
                neighbor.water = true;
                neighbor.lakeElevation = c.lakeElevation;
                queue.push(neighbor);
              }
            }else{// neighbor is lower than the current cell
              // neighbor.source = true;
              // we found an new exit for the lake :
              if(exitRiver == null || exitRiver.elevation > neighbor.elevation){
                exitSource = c;
                exitRiver = neighbor;
              }
            }
          }
        }
      }

      if(exitRiver != null){
        // we start the exit river :
        exitSource.river = true;
        exitSource.nextRiver = exitRiver;
        this.setAsRiver(exitRiver, 2);
        // we mark all the lake as having an exit river :
        while(lake.length > 0){
          var c = lake.shift();
          c.exitRiver = exitRiver;
        }
      }
    }
  },

  // Calculate moisture. Freshwater sources spread moisture: rivers and lakes (not ocean).
  assignMoisture : function(){
    var queue = new Array();
    // lake and river
    for(var i = 0; i < this.diagram.cells.length; i++){
      var cell = this.diagram.cells[i];
      if((cell.water || cell.river) && !cell.ocean && !cell.impassD){
        cell.moisture = (cell.water ? 1 : 0.9);
        queue.push(cell);
      }else if(cell.ocean){
        cell.moisture = 1;
      }else if(cell.impassD){
        cell.moisture = 0;
      }
    }

    while(queue.length > 0){
      var cell = queue.shift();// pop
      var neighbors = cell.getNeighborIds();
      for(var i = 0; i < neighbors.length; i++){
        var nId = neighbors[i];
        var neighbor = this.diagram.cells[nId];
        var newMoisture = cell.moisture * 0.9;
        if((neighbor.moisture == null || newMoisture > neighbor.moisture) && !neighbor.ocean && !neighbor.impassD){
          neighbor.moisture = newMoisture;
          queue.push(neighbor);
        }
      }
    }
  },

  assignBiomes : function(){
    for(var i = 0; i < this.diagram.cells.length; i++){
      var cell = this.diagram.cells[i];
      cell.biome = this.getBiome(cell);
    }
  },

  getBiome : function(cell){
    if(cell.ocean){
      return 'OCEAN';
    }else if(cell.water){
      if(this.getRealElevation(cell) < 0.05)
        return 'MARSH';
      if(this.getRealElevation(cell) > 0.4)
        return 'ICE';
      return 'LAKE';
    }else if(cell.beach){
      return 'BEACH';
    }else if(cell.impassM){
      return 'IMPASSIBLE_MOUNTIAN';
    }else if(cell.impassD){
      return 'IMPASSIBLE_DESERT';
    }else if(cell.elevation > 0.4){
      if(cell.moisture > 0.50)
        return 'SNOW';
      else if(cell.moisture > 0.33)
        return 'TUNDRA';
      else if(cell.moisture > 0.16)
        return 'BARE';
      else
        return 'SCORCHED';
    }else if(cell.elevation > 0.3){
      if(cell.moisture > 0.66)
        return 'TAIGA';
      else if(cell.moisture > 0.33)
        return 'SHRUBLAND';
      else
        return 'TEMPERATE_DESERT';
    }else if(cell.elevation > 0.15){
      if(cell.moisture > 0.83)
        return 'TEMPERATE_RAIN_FOREST';
      else if(cell.moisture > 0.50)
        return 'TEMPERATE_DECIDUOUS_FOREST';
      else if(cell.moisture > 0.16)
        return 'GRASSLAND';
      else
        return 'TEMPERATE_DESERT';
    }else{
      if(cell.moisture > 0.66)
        return 'TROPICAL_RAIN_FOREST';
      else if(cell.moisture > 0.33)
        return 'TROPICAL_SEASONAL_FOREST';
      else if(cell.moisture > 0.16)
        return 'GRASSLAND';
      else
        return 'SUBTROPICAL_DESERT';
    }
  },

  // The Perlin-based island combines perlin noise with the radius
  getElevation : function(point){

    var x = 1.5 * (point.x / this.config.width - 0.5);
    var y = 1.5 * (point.y / this.config.height - 0.5);
    var distance = Math.sqrt(x * x + y * y);
    var c = this.getPerlinValue(point);

    // console.log('('+point.x+','+point.y+')>'+c+'-'+distance+'='+(c-distance)+(c-distance>0?"<<("+point.x+","+point.y+")":""));
    return c - distance;
    // return c - (0.3 + 0.3 * distance * distance);
  },

  getPerlinValue : function(point){
    var x = ((point.x / this.config.width) * this.perlin.width) | 0;
    var y = ((point.y / this.config.height) * this.perlin.height) | 0;
    var pos = (x + y * this.perlin.width) * 3.75;
    var data = this.perlin.data;
    var val = data[pos + 0] << 16 | data[pos + 1] << 8 | data[pos + 2]; // rgb to hex

    return (val & 0xff) / 255.0;
  },

  getRealElevation : function(cell){
    if(cell.water && cell.lakeElevation != null){
      return cell.lakeElevation;
    }else if(cell.water && cell.elevation < 0){
      return 0;
    }else{
      return cell.elevation;
    }
  },

  render : function(){
    if(!this.diagram){
      return;
    }

    this.renderCells();
    this.renderRivers();
    this.renderEdges();
    this.renderSites();

    paper.view.draw();
  },

  renderCells : function(){
    this.cellsLayer.activate();
    for( var cellid in this.diagram.cells){
      var cell = this.diagram.cells[cellid];
      var color = this.getCellColor(cell);
      this.renderCell(cell, color, 1, true);
    }
  },

  renderRivers : function(){
    for( var cellid in this.diagram.cells){
      var cell = this.diagram.cells[cellid];
      if(cell.nextRiver){
        this.riversLayer.activate();
        var riverPath = new Path();
        riverPath.strokeWidth = Math.min(cell.riverSize, this.config.maxRiversSize);
        var riverColor = DISPLAY_COLORS.RIVER.clone();
        riverColor.brightness = riverColor.brightness - this.getShade(cell);
        riverPath.strokeColor = riverColor;
        riverPath.strokeCap = 'round';
        if(cell.water){
          riverPath.add(new Point(cell.site.x + (cell.nextRiver.site.x - cell.site.x) / 2, cell.site.y
              + (cell.nextRiver.site.y - cell.site.y) / 2));
        }else{
          riverPath.add(new Point(cell.site.x, cell.site.y));
        }
        if(cell.nextRiver && !cell.nextRiver.water){
          riverPath.add(new Point(cell.nextRiver.site.x, cell.nextRiver.site.y));
        }else{
          riverPath.add(new Point(cell.site.x + (cell.nextRiver.site.x - cell.site.x) / 2, cell.site.y
              + (cell.nextRiver.site.y - cell.site.y) / 2));
        }
      }
      // source :
      if(this.config.allowDebug && cell.source){
        this.debugLayer.activate();
        var circle = new Path.Circle(new Point(cell.site.x, cell.site.y), 3);
        circle.fillColor = DISPLAY_COLORS.SOURCE;
      }
    }
  },

  renderEdges : function(){
    if(this.config.allowDebug){
      this.debugLayer.activate();
      var edges = this.diagram.edges, iEdge = edges.length, edge, v;
      while(iEdge--){
        edge = edges[iEdge];
        var edgePath = new Path();
        edgePath.strokeWidth = 1;

        if(edge.cliff){
          edgePath.strokeWidth = 1;
          edgePath.strokeCap = 'round';
          edgePath.strokeColor = DISPLAY_COLORS.ROCK;
        }else{
          edgePath.strokeWidth = 1;
          edgePath.strokeColor = '#000';
        }
        v = edge.va;
        edgePath.add(new Point(v.x, v.y));
        v = edge.vb;
        edgePath.add(new Point(v.x, v.y));
      }
    }
  },

  renderSites : function(){
    if(this.config.allowDebug){
      this.debugLayer.activate();
      // sites :
      var sites = this.sites, iSite = sites.length;
      while(iSite--){
        v = sites[iSite];
        var circle = new Path.Circle(new Point(v.x, v.y), 1);
        circle.fillColor = '#0f0';
      }

      // values :
      for(var i = 0; i < this.diagram.cells.length; i++){
        var cell = this.diagram.cells[i];
        var text = new PointText(new Point(cell.site.x, cell.site.y));
        text.fillColor = '#f00';
        text.fontSize = '8px';
        text.content = Math.ceil(this.getRealElevation(cell) * 100);
      }
    }
  },

  renderCell : function(cell, color, stroke, fill){
    var cellPath = new Path();
    cellPath.strokeWidth = stroke;
    cellPath.strokeColor = color;
    if(fill){
      cellPath.fillColor = color;
    }
    var start = cell.halfedges[0].getStartpoint();
    cellPath.add(new Point(start.x, start.y));
    for(var iHalfedge = 0; iHalfedge < cell.halfedges.length; iHalfedge++){
      var halfEdge = cell.halfedges[iHalfedge];
      var end = halfEdge.getEndpoint();
      cellPath.add(new Point(end.x, end.y));
    }
    cellPath.closed = true;
  },

  getCellColor : function(cell){
    var c = DISPLAY_COLORS[cell.biome].clone();
    c.brightness = c.brightness - this.getShade(cell);

    return c;
  },

  getShade : function(cell){
    if(this.config.shading == 0){
      return 0;

    }else if(cell.ocean){
      return (this.config.shadeOcean ? -cell.elevation : 0);

    }else if(cell.water){
      return 0;

    }else{
      var lowerCell = null;
      var upperCell = null;
      var neighbors = cell.getNeighborIds();
      for(var j = 0; j < neighbors.length; j++){
        var nId = neighbors[j];
        var neighbor = this.diagram.cells[nId];
        if(lowerCell == null || neighbor.elevation < lowerCell.elevation){
          lowerCell = neighbor;
        }
        if(upperCell == null || neighbor.elevation > upperCell.elevation){
          upperCell = neighbor;
        }
      }

      var angleRadian = Math.atan2(upperCell.site.x - lowerCell.site.x, upperCell.site.y - lowerCell.site.y);
      var angleDegree = angleRadian * (180 / Math.PI);
      var diffElevation = (this.getRealElevation(upperCell) - this.getRealElevation(lowerCell));

      if(diffElevation + this.config.shading < 1){
        diffElevation = diffElevation + this.config.shading;
      }

      return ((Math.abs(angleDegree) / 180) * diffElevation);
    }
  },

  toggleDebug : function(){
    this.debug = !this.debug;
    this.debugLayer.visible = this.debug;
  },

  getRandomInt : function(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  distance : function(a, b){
    var dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

};