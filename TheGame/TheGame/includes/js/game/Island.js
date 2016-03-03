//Version History
/* * * * * * * *
 *  Version 1.0.0
 *    -2016-2-6   -Island map generator as pulled from https://github.com/lebesnec/island.js
 *  Version 1.0.1
 *    -2016-2-?   -allowed init with specified seed
 *  Version 1.1.0
 *    -2016-2-?   -added impassible borders (Ocean, Mountian, and Desert) to convert island to section of landmass
 *  Version 1.1.1
 *    -2016-2-19  -added click-to highlight cell functionality
 *  Version 1.2.0
 *    -2016-2-20  -converted to dojo style file for use in other dojo files
 *  Version 1.2.1
 *    -2016-2-22  -skew island elevation toward impass mountains
 *  Version 1.2.2
 *    -2016-2-23  -group impass areas
 *                -highlight outer edges of group if a group is clicked
 *  Version 1.3.0
 *    -2016-2-23  -converted map config from number of sites based to number of cells across based
 *    -2016-2-24  -always a square map (only needs 1 dimension)
 *                -always hexagon cells with 0 randomness
 *  Version 1.3.1
 *    -2016-2-24  -put shaded cells in separate layer and allow it to be shown/hidden
 *  Version 1.3.2
 *    -2006-2-24  -update highlightCell to account for possible zoom changes
 *  Version 1.4.0
 *    -2016-2-24  -moved constants (including config) to external file
 *  Version 1.4.1
 *    -2016-2-25  -prevented moisture from spreading across cliff and allowed rivers to spawn in ImpassM
 *  Version 1.4.2
 *    -2016-2-25  -converted to using dojo version of perlin.js (which uses dojo version of Simplex.js)
 *  Version 1.4.3
 *    -2016-2-25  -group all regular land cells into territories
 *  Version 1.4.4
 *    -2016-2-26  -pulled most of the math and object manipulation functions out and put them in islandFunctions.js
 *  Version 1.5.0
 *    -2016-2-27  -picks random city start point from territories
 *                -finds groups adjacent to city for conquest and increases city by that group, removing it from the master group list
 *  Version 1.5.1
 *    -2016-2-29  -smoothed edges of group border
 *                -groups defined as an object, and biomes are objects biomes.js
 *      needs cellGroup_1.0.0
 * * * * * * * */
//TODO: attempt to relax the border between impassable mountains and the rest
//TODO: make impass borders less straight
//TODO: compute "bonuses" of conquest groups
//FIXME: what to do about islands in ocean or other impassable areas
//FIXME: remove cost from impass highlight
define([
        'jquery',
        
      //constants
        'game/constants',
        'game/biomes',
      //functions
        'game/islandFunctions',
      //objects
        'game/cellGroup',
        
        'library/perlin',
        'dojo/topic',
        'paper',
        'voroniCore'
], function($, C, B, fn, CellGroup, perlin, topic){
var subscriptions = {};
var diagram = null;
var voronoi = new Voronoi();
var sites = [];
var seed = -1;//map generator seed, gets set in Init() to random or user defined value

var cellsLayer = null;
var shadeLayer = null;
var riversLayer = null;
var cliffLayer = null;
var edgeLayer = null;
var cityLayer = null;
var highlightLayer = null;

var nbSites = -1;
var mPoint = {};
var delta = -1;
var territories = {total:0,size:0};
var city = new  CellGroup('C');
var cellIndex = {};

function randomSites(){
  var order = fn.getCharOrder();
  var sites = [];

  var mLocs = [];
  // create vertices
  delta = C.DIM/(C.CELL_WIDTH-1);
  nbSites=(C.CELL_WIDTH+C.CELL_WIDTH-1)*(Math.floor(C.CELL_WIDTH/2));
  if((C.CELL_WIDTH%2)==1){
    nbSites += C.CELL_WIDTH;
  }
  var x = 0;
  var y = 0;
  for(var i = 0; i < nbSites; i++){
    var curX = Math.max(Math.min(Math.round(x * delta), C.DIM), 0);
    var curY = Math.max(Math.min(Math.round(y * delta), C.DIM), 0);
    var type = decideBorderValue(delta, curX, curY, order, x, y, mLocs);
    sites.push({
      x : curX,
      y : curY,
      v : type
    });
    x = x + 1;
    if(x * delta > C.DIM){
      x = (!(y % 2)? 0.5:0);
      y = y + 1;
    }
  }
  mLocs.sort();
  mPoint = fn.computeMCenter(mLocs);
  
  compute(sites);
  /****output grid**** uncomment to print grid of impass characters
  var disY = 0;
  var output = '';
  for(var i = 0; i < nbSites; i++){
    var cell = diagram.cells[i].site;
    if(cell.y != disY){
      console.log(output);
      disY = cell.y;
      output = '';
    }else{
      output += cell.v + ' ';
    }
  }
  console.log(output);
  /**end output grid**/
  return delta;
}

function decideBorderValue(delta, realX, realY, order, x, y, mLocs){
  var adjX = realX + 1;// avoid div by 0
  var adjY = realY + 1;// avoid div by 0
  /*
   * Account for non-square grids.
   * If the grid is non-square, we must strech the values of the shorter side for when
   * when we calculate the diagonals to keep half above and half below the angle
   */
  if(C.DIM > C.DIM){
    perc = C.DIM / C.DIM;
    adjY = adjY * perc;
  }else{
    perc = C.DIM / C.DIM;
    adjX = adjX * perc
  }
  /*
   * Decide to which area (one eighth of the grid) this point belongs 
   * Areas are divided up radially around the midpoint (a0-a7).
   * If the grid were a clock face, the areas would be 1 1/2 hours long 
   *     10:30  12:00   1:30 
   *        \     |     / 
   *         \ a1 | a2 /
   *          \   |   / 
   *       a0  \  |  / a3 
   *            \ | / 
   * 9:00---------+---------3:00
   *            / | \ 
   *       a7  /  |  \  a4 
   *          /   |   \ 
   *         / a6 | a5 \ 
   *        /     |     \ 
   *      7:30   6:00   4:30
   */
  // Top-Left to Bottom-Right diagonal
  var val1 = -5; // default/error value
  if((adjX / adjY) < 1){
    val1 = 1; // bottom-left half [a0, a7, a6, a5]
  }else if((adjX / adjY) > 1){
    val1 = 0; // top-right half [a1, a2, a3, a4]
  }else{
    if(y < (C.DIM / 2)){
      val1 = 0; // top half of the axis belongs to the top-right
    }else{
      val1 = 1; // bottom half of the axis belongs to the bottom-left
    }
  }
  // Top-Right to Bottom-Left diagonal
  var val2 = -5; // default/error value
  if((adjX + adjY) < Math.max(C.DIM, C.DIM) + 1){
    val2 = 4 // bottom-left half [a7, a0, a1, a2]
  }else if((adjX + adjY) > Math.max(C.DIM, C.DIM) + 1){
    val2 = 2; // top-right half [a6, a5, a4, a3]
  }else{
    if(y < (C.DIM / 2)){
      val2 = 4; // top half of the axis belongs to the bottom-left
    }else{
      val2 = 2; // bottom half of the axis belongs to the top right
    }
  }
  // Vertical midpoint
  var val3 = 1; // left half and center [a1, a0, a7, a6]
  if(adjX > (C.DIM / 2)){
    val3 = 0; // right half [a2, a3, a4, a5]
  }
  // Horizontal midpoint
  var val4 = 0; // top half and center [a0, a1, a2, a3]
  if(adjY > (C.DIM / 2)){
    val4 = 5; // bottom half [a7, a6, a5, a4]
  }
  var type = '_';// default value
  // values for each half-division of the grid are picked in such a way that the sum of the 4 numbers will give unique
  // results for each area of the grid
  switch(val1 + val2 + val3 + val4){
  case 6:// a0
    type = order[0];
    if((type=='M') && $.inArray(0, mLocs)==-1){
      mLocs.push(0);
    }
    break;
  case 5:// a1
    type = order[1];
    if((type=='M') && $.inArray(1, mLocs)==-1){
      mLocs.push(1);
    }
    break;
  case 4:// a2
    type = order[2];
    if((type=='M') && $.inArray(2, mLocs)==-1){
      mLocs.push(2);
    }
    break;
  case 2:// a3
    type = order[3];
    if((type=='M') && $.inArray(3, mLocs)==-1){
      mLocs.push(3);
    }
    break;
  case 7:// a4
    type = order[4];
    if((type=='M') && $.inArray(4, mLocs)==-1){
      mLocs.push(4);
    }
    break;
  case 8:// a5
    type = order[5];
    if((type=='M') && $.inArray(5, mLocs)==-1){
      mLocs.push(5);
    }
    break;
  case 9:// a6
    type = order[6];
    if((type=='M') && $.inArray(6, mLocs)==-1){
      mLocs.push(6);
    }
    break;
  case 11:// a7
    type = order[7];
    if((type=='M') && $.inArray(7, mLocs)==-1){
      mLocs.push(7);
    }
    break;
  default:// error value
    type = '_';
  }
  
  return type;
}

function compute(s){
  sites = s;
  voronoi.recycle(diagram);
  var bbox = {
    xl : 0,
    xr : C.DIM,
    yt : 0,
    yb : C.DIM
  };
  diagram = voronoi.compute(s, bbox);
}

function assignOceanCoastAndLand(){
  var queue = new Array();
  // find border cells and add them to the queue to deal with neighbors
  for(var i = 0; i < diagram.cells.length; i++){
    var cell = diagram.cells[i];
    cell.elevation = fn.getElevation(cell.site, mPoint, perlin);
    cell.water = (cell.elevation <= 0);
    var numWater = 0;
    for(var j = 0; j < cell.halfedges.length; j++){
      var hedge = cell.halfedges[j];
      // border
      if(hedge.edge.rSite == null){
        cell.border = true;// if one of this cell's adjoining cells is null, it is a border cell and this sets it to ocean, impassM, or impassD
        cell.outside = true;
        if(cell.site.v == 'M'){
          setM(cell);
        }else if(cell.site.v == 'D'){
          setD(cell);
        }else{
          setO(cell);
        }
        queue.push(cell);
      }
    }
  }

  // impass
  while(queue.length > 0){
    var cell = queue.shift();// aka pop();
    var neighbors = cell.getNeighborIds();
    for(var i = 0; i < neighbors.length; i++){
      var nId = neighbors[i];
      var neighbor = diagram.cells[nId];
      if(cell.border){
        neighbor.outside=true;
      }
      var processed = neighbor.ocean || neighbor.impassM || neighbor.impassD;
      if(processed == undefined){
        if(neighbor.water||neighbor.outside){
          if(neighbor.site.v == 'M'){
            setM(neighbor);
          }else if(neighbor.site.v == 'D'){
            setD(neighbor);
          }else{
            setO(neighbor);
          }
          queue.push(neighbor);
        }
      }
    }
  }

  // coast
  for(var i = 0; i < diagram.cells.length; i++){
    var cell = diagram.cells[i];
    var numOcean = 0;
    var numImpass=0;
    var neighbors = cell.getNeighborIds();
    for(var j = 0; j < neighbors.length; j++){
      var nId = neighbors[j];
      var neighbor = diagram.cells[nId];
      if(neighbor.ocean){
        numOcean++;
      }
      if(neighbor.impassD||neighbor.impassM){
        numImpass++;
      }
    }
    cell.numOcean = numOcean;
    cell.coast = (numOcean > 0) && (!cell.water);
    cell.beach = (cell.coast && cell.elevation < C.CLIFF_THRESHOLD) && !cell.impassD && !cell.impassM;
  }

  // cliff
  for(var i = 0; i < diagram.edges.length; i++){
    var edge = diagram.edges[i];
    if(edge.lSite != null && edge.rSite != null){
      var lCell = diagram.cells[edge.lSite.voronoiId];
      var rCell = diagram.cells[edge.rSite.voronoiId];
      edge.cliff = (!(lCell.water && rCell.water) && (Math.abs(fn.getRealElevation(lCell)
          - fn.getRealElevation(rCell)) >= C.CLIFF_THRESHOLD));
    }
  }
}

function setM(cell){
  while(cell.elevation<1){
    cell.elevation += 1;
  }
  cell.water = false;
  cell.impassM = true;
}
function setD(cell){
  while(cell.elevation<0){
    cell.elevation+=.1;
  }
  while(cell.elevation>0.01){
    cell.elevation = cell.elevation/10;
    }
  cell.water = false;
  cell.impassD = true;
}
function setO(cell){
  cell.ocean = true;
  cell.elevation = Math.min(cell.elevation, 0);
}

function assignRivers(){
  for(var i = 0; i < (nbSites/50);){
    var cell = diagram.cells[fn.getRandomInt(0, diagram.cells.length - 1)];
    if(!cell.coast && !cell.impassD ){//}&& !cell.impassM){
      if(setAsRiver(cell, 1)){
        cell.source = true;
        i++;
      }
    }
  }
}

function setAsRiver(cell, size){
  //console.log(cell.site);
  if(!cell.water && !cell.river){
    cell.river = true;
    cell.riverSize = size;
    if(!cell.impassD){//don't let the river carry on into the desert
      var lowerCell = null;
      var neighbors = cell.getNeighborIds();
      // we choose the lowest neighbour cell :
      for(var j = 0; j < neighbors.length; j++){
        var nId = neighbors[j];
        var neighbor = diagram.cells[nId];
        if((lowerCell == null || neighbor.elevation < lowerCell.elevation)){
          lowerCell = neighbor;
        }
      }
      if(lowerCell.elevation < cell.elevation){
        // we continue the river to the next lowest cell :
        setAsRiver(lowerCell, size);
        cell.nextRiver = lowerCell;
      }else{
        // we are in a hole, so we create a lake :
        cell.water = true;
      }
    }
  }else if(cell.water && !cell.ocean){
    // we ended in a lake, the water level rise :
    cell.lakeElevation = fn.getRealElevation(cell) + (C.LAKE_THRESHOLD * size);
    fillLake(cell);
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
}
function getNeighborIdsCliff(cell){
  var a = [], b = cell.halfedges.length, c;
  while(b--){
    c = cell.halfedges[b].edge;
    if(!c.cliff){
      if(c.lSite !== null && c.lSite.voronoiId != cell.site.voronoiId){
        a.push(c.lSite.voronoiId)
      }else{
        if(c.rSite !== null && c.rSite.voronoiId != cell.site.voronoiId){
          a.push(c.rSite.voronoiId)
        }
      }
    }
  }
  return a
}
function getNeighborIdsIn(cell, array){
  var a = [], b = cell.halfedges.length, c;
  while(b--){
    c = cell.halfedges[b].edge;
      if(c.lSite !== null && c.lSite.voronoiId != cell.site.voronoiId){
        if($.inArray(c.lSite.voronoiId, array)!=-1){
          a.push(c.lSite.voronoiId)
        }
      }else{
        if(c.rSite !== null && c.rSite.voronoiId != cell.site.voronoiId){
          if($.inArray(c.rSite.voronoiId, array)!=-1){
            a.push(c.rSite.voronoiId)
          }
        }
      }
  }
  return a
}
function getNeighborIdsInOut(cell, inArray, outArray){
  var a = [], b = cell.halfedges.length, c;
  while(b--){
    c = cell.halfedges[b].edge;
      if(c.lSite !== null && c.lSite.voronoiId != cell.site.voronoiId){
        if($.inArray(c.lSite.voronoiId, inArray)!=-1&&$.inArray(c.lSite.voronoiId, outArray)==-1){
          a.push(c.lSite.voronoiId)
        }
      }else{
        if(c.rSite !== null && c.rSite.voronoiId != cell.site.voronoiId){
          if($.inArray(c.rSite.voronoiId, inArray)!=-1&&$.inArray(c.rSite.voronoiId, outArray)==-1){
            a.push(c.rSite.voronoiId)
          }
        }
      }
  }
  return a
}
function fillLake(cell){
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
        var neighbor = diagram.cells[nId];

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
      setAsRiver(exitRiver, 2);
      // we mark all the lake as having an exit river :
      while(lake.length > 0){
        var c = lake.shift();
        c.exitRiver = exitRiver;
      }
    }
  }
}

// Calculate moisture. Freshwater sources spread moisture: rivers and lakes (not ocean).
function assignMoisture(){
  var queue = new Array();
  // lake and river
  for(var i = 0; i < diagram.cells.length; i++){
    var cell = diagram.cells[i];
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
    var neighbors = getNeighborIdsCliff(cell);
    for(var i = 0; i < neighbors.length; i++){
      var nId = neighbors[i];
      var neighbor = diagram.cells[nId];
      var newMoisture = cell.moisture * 0.9;
      if((neighbor.moisture == null || newMoisture > neighbor.moisture) && !neighbor.ocean && !neighbor.impassD){
        neighbor.moisture = newMoisture;
        queue.push(neighbor);
      }
    }
  }
}

function assignBiomes(){
  for(var i = 0; i < diagram.cells.length; i++){
    var cell = diagram.cells[i];
    cell.biome = getBiome(cell);
  }
}

function getBiome(cell){
  if(cell.ocean){
    return B.OCEAN;
  }else if(cell.water){
    if(fn.getRealElevation(cell) < 0.05)
      return B.MARSH;
    if(fn.getRealElevation(cell) > 0.4)
      return B.ICE;
    return B.LAKE;
  }else if(cell.beach){
    return B.BEACH;
  }else if(cell.impassD){
    return B.IMPASSIBLE_DESERT;
  }else if(cell.elevation > 0.4){ //Mountainous
    if(cell.moisture > 0.50)
      return B.SNOW;
    else if(cell.moisture > 0.33)
      return B.TUNDRA;
    else if(cell.moisture > 0.16)
      return B.BARE;
    else
      return B.SCORCHED;
  }else if(cell.elevation > 0.3){ //Foothills
    if(cell.moisture > 0.66)
      return B.TAIGA;
    else if(cell.moisture > 0.33)
      return B.SHRUBLAND;
    else
      return B.TEMPERATE_DESERT;
  }else if(cell.elevation > 0.15){//Normal Elevation
    if(cell.moisture > 0.83)
      return B.TEMPERATE_RAIN_FOREST;
    else if(cell.moisture > 0.50)
      return B.TEMPERATE_DECIDUOUS_FOREST;
    else if(cell.moisture > 0.16)
      return B.GRASSLAND;
    else
      return B.TEMPERATE_DESERT;
  }else{                          //Lowlands
    if(cell.moisture > 0.66)
      return B.TROPICAL_RAIN_FOREST;
    else if(cell.moisture > 0.33)
      return B.TROPICAL_SEASONAL_FOREST;
    else if(cell.moisture > 0.16)
      return B.GRASSLAND;
    else
      return B.SUBTROPICAL_DESERT;
  }
}

function assignGroups(){
  $.each(diagram.cells,function(index, cell){
    if(cell.impassM){
      diagram.cellGroups.impassM.ids.push(cell.site.voronoiId);
      diagram.cellGroups.impassM.cells.push(cell);
    }else if(cell.impassD){
      diagram.cellGroups.impassD.ids.push(cell.site.voronoiId);
      diagram.cellGroups.impassD.cells.push(cell);
    }else if(cell.ocean){
      diagram.cellGroups.ocean.ids.push(cell.site.voronoiId);
      diagram.cellGroups.ocean.cells.push(cell);
    }else if(cell.biome.name=='LAKE'){
      diagram.cellGroups.lakes.ids.push(cell.site.voronoiId);
      diagram.cellGroups.lakes.cells.push(cell);
    }else{
      diagram.cellGroups.other.ids.push(cell.site.voronoiId);
      diagram.cellGroups.other.cells.push(cell);
    }
  });

  $.each(diagram.cellGroups, function(index, group){
    group.setEdges();//gets the outer edges of the group
  });
}

function splitLakes(){
  var count=1;
  var lake = new CellGroup(count);
  var lakeIds = diagram.cellGroups.lakes.ids;
  var lakeCells = diagram.cellGroups.lakes.cells;
  while (lakeCells.length>0){
    var id = lakeIds.shift();
    var cell = lakeCells.shift();
    lake.cells.push(cell);
    lake.ids.push(id);
    var queue = [];
    queue.push(cell);
    while(queue.length>0){
      var c = queue.shift();
      var neighbors = getNeighborIdsIn(c, lakeIds);
      for(var i = 0; i < neighbors.length; i++){
        var nId = neighbors[i];
        var nLoc = $.inArray(nId, lakeIds);
        neighbor = lakeCells.splice(nLoc,1)[0];
        neighborId = lakeIds.splice(nLoc, 1)[0];
        lake.cells.push(neighbor);
        lake.ids.push(neighborId);
        queue.push(neighbor);
      }
    }
    lake.setEdges();
    diagram.cellGroups['lake'+count] = lake;
    lake=new CellGroup(count);
    count++;
  }
  delete diagram.cellGroups.lakes;
}

function splitOther(){
  var count=1;
  var allCells = diagram.cellGroups.other.cells;
  var allIds = diagram.cellGroups.other.ids;
  while(allCells.length>0){
    var group = new CellGroup(count);
    var id = allIds.pop();
    var cell = allCells.pop();
    group.ids.push(id);
    group.cells.push(cell);
    if(group.biomes[cell.biome.name]==undefined){
      group.biomes[cell.biome.name] = 1;
    }else{
      group.biomes[cell.biome.name]++;
    }
    cellIndex[id] = count;
    var queue=[];
    while(group.cells.length<C.MAX_GROUP_SIZE&&allCells.length>0){
      var neighbors = getNeighborIdsInOut(cell, allIds, queue);
      queue = queue.concat(neighbors);
      if(queue.length==0){
        break;
      }
      var loc = $.inArray(queue.shift(), allIds);
      id = allIds.splice(loc, 1)[0];
      cell = allCells.splice(loc, 1)[0];
      group.ids.push(id);
      group.cells.push(cell);
      if(group.biomes[cell.biome.name]==undefined){
        group.biomes[cell.biome.name] = 1;
      }else{
        group.biomes[cell.biome.name]++;
      }
      cellIndex[id] = count;
    }
    queue=[];
    group.setEdges();
    group.setCost();
    
    territories[count] = group;
    territories.total++;
    territories.size++;
    count++;
    var group = new CellGroup(count);
  }
  delete diagram.cellGroups.other;
}

function render(){
  if(!diagram){
    return;
  }
  renderCells();
  renderRivers();
  renderCliffs();
  paper.view.draw();
}

function renderCells(){
  for( var cellid in diagram.cells){
    var cell = diagram.cells[cellid];
    cellsLayer.activate();
    renderCell(cell, B[cell.biome.name].color, 1, true);
    shadeLayer.activate();
    renderCell(cell, getShadedCellColor(cell), 1, true);
  }
}

function renderRivers(){
  for( var cellid in diagram.cells){
    var cell = diagram.cells[cellid];
    if(cell.nextRiver){
      riversLayer.activate();
      var riverPath = new Path();
      riverPath.strokeWidth = Math.min(cell.riverSize, C.MAX_RIVER_SIZE);
      var riverColor = new paper.Color(C.RIVER);
      riverColor.brightness = riverColor.brightness - getShade(cell);
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
  }
}

function renderCliffs(){
    cliffLayer.activate();
    var edges = diagram.edges, iEdge = edges.length, edge, v;
    while(iEdge--){
      edge = edges[iEdge];
      var edgePath = new Path();
      edgePath.strokeWidth = 1;
      if(edge.cliff){
        edgePath.strokeWidth = 1;
        edgePath.strokeCap = 'round';
        edgePath.strokeColor = C.ROCK;
        v = edge.va;
        edgePath.add(new Point(v.x, v.y));
        v = edge.vb;
        edgePath.add(new Point(v.x, v.y));
      }else{
      }
    }
}

function renderCell(cell, color, stroke, fill){
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
}

function renderBorder(array, color, stroke, cost){
  //FIXME: doesn't take into account multiple split areas in impass areas, or islands within them
  var edges = array.edges.slice();//get a copy of the array, so we don't clear it out
  var path = new Path();
  path.strokeWidth = stroke;
  path.strokeColor = color;
  path.strokeJoin = 'round';
  if(array.id=='C'){//the city gets a transparent fill
    path.fillColor=color;
    path.fillColor.alpha=.25;
  }
  if(array.edgePath==undefined){
    var edgePath = [];
    var edge = edges.shift();
    var end = edge.vb;
    path.add(edge.va);
    edgePath.push(edge.va);
    path.add(end);
    edgePath.push(end);
    for(var i=0;i<edges.length; i++){
      edge = edges[i];
      if(end.x == edge.va.x && end.y == edge.va.y){//vertexA matches our current path end
        edges.splice(i, 1);
        end = edge.vb;
        path.add(end);
        edgePath.push(end);
        i=-1;//next iteration of the loop  will start by looking at the first element of it
      }else if(end.x == edge.vb.x && end.y == edge.vb.y){//vertexB matches out current path end
        edges.splice(i,1);
        end = edge.va;
        path.add(end);
        edgePath.push(end)
        i=-1;//next iteration of the loop  will start by looking at the first element of it
      }
    }
    array.edgePath = edgePath;
  }else{
    $.each(array.edgePath, function(index, point){
      path.add(point);
    });
  }
  path.closed = true;
  if(cost){
    //FIXME: ensure that outer bounds of text are inside the path probable with each corner checked for path.contains(point)
    var text = new PointText(path.bounds.center);
    text.content = array.cost;
    text.fillColor = color;
    text.justification = 'center';
    var costHeight = text.bounds.height;
    text.position.y+=(costHeight/4);
  }
}

function getShadedCellColor(cell){
  var c = new paper.Color(B[cell.biome.name].color);
  var shade = getShade(cell);
  c.brightness = c.brightness - shade;
  return c;
}

function getShade(cell){
  if(C.SHADING == 0){
    return 0;
  }else if(cell.ocean){
    return (C.SHADE_OCEAN ? -cell.elevation : 0);
  }else if(cell.water){
    return 0;
  }else{
    var lowerCell = null;
    var upperCell = null;
    var neighbors = cell.getNeighborIds();
    for(var j = 0; j < neighbors.length; j++){
      var nId = neighbors[j];
      var neighbor = diagram.cells[nId];
      var dElev = Math.abs(cell.elevation-neighbor.elevation);
      if(dElev<C.CLIFF_THRESHOLD){
        if(lowerCell == null || neighbor.elevation < lowerCell.elevation){
          lowerCell = neighbor;
        }
        if(upperCell == null || neighbor.elevation > upperCell.elevation){
          upperCell = neighbor;
        }
      }
    }
    if(lowerCell!=null&&upperCell!=null){
      var angleRadian = Math.atan2(upperCell.site.x - lowerCell.site.x, upperCell.site.y - lowerCell.site.y);
      var angleDegree = angleRadian * (180 / Math.PI);
      var diffElevation = (fn.getRealElevation(upperCell) - fn.getRealElevation(lowerCell));
  
      if(diffElevation + C.SHADING < 1){
        diffElevation = diffElevation + C.SHADING;
      }
      var mult=1;
      if(cell.impassD){
        mult = .5;
      }
      return (Math.abs(angleDegree) / 180) * diffElevation*mult;
    }else{
      return 0;
    }
  }
}
function pickCityStart(){
  var loc = fn.getRandomInt(1,territories.size);
  var group = territories[loc];
  while(group.cells.length<C.MAX_GROUP_SIZE ||(
    group.biomes.GRASSLAND==undefined &&
    group.biomes.TEMPERATE_DECIDUOUS_FOREST==undefined &&
    group.biomes.TEMPERATE_RAIN_FOREST==undefined &&
    group.biomes.TROPICAL_SEASONAL_FOREST==undefined &&
    group.biomes.TROPICAL_RAIN_FOREST==undefined)
  ){
    loc = (loc+1)%territories.size;
    group = territories[loc];
  }
  updateCity(group);
  if(Object.keys(city.neighbors)<3){
    city = new CellGroup();
    pickCityStart();
  }
  paper.view.draw();
}
function updateCity(group){
  $.merge(city.cells, group.cells);
  $.merge(city.ids, group.ids);
  delete city.edgePath;
  city.setEdges();
  $.each(group.biomes,function(name, count){
    if(city.biomes[name]==undefined){
      city.biomes[name] = count;
    }else{
      city.biomes[name]+=count;
    }
  });
  delete territories[group.id];
  $.each(group.ids, function(index, id){
    delete cellIndex[id];
  });
  cityLayer.activate();
  highlightLayer.removeChildren();
  cityLayer.removeChildren();
  renderBorder(city, C.CITY_BORDER, 5);
  city.setNeighbors(cellIndex);
  edgeLayer.activate();
  edgeLayer.removeChildren();
  $.each(city.neighbors, function(index, groupId){
      renderBorder(territories[groupId], C.EDGE_COLOR, 1, true);
  });
}

return {// functions & variables accessible to the outside
  init : function(sd){
    if(sd != undefined){
      seed = sd;
    }else{
      seed=Math.random();
    }
    console.log(seed);
    //create them in the order they will be displayed, first on the bottom
    cellsLayer     = new paper.Layer({name : 'cell'});
    shadeLayer     = new paper.Layer({name : 'shade', visible : C.SHOW_SHADE});
    riversLayer    = new paper.Layer({name : 'rivers'});
    cliffLayer     = new paper.Layer({name : 'cliff'});
    edgeLayer      = new paper.Layer({name : 'edge', visible : C.SHOW_GROUPS});
    cityLayer      = new paper.Layer({name:'city'});
    highlightLayer = new paper.Layer({name : 'highlight'});

    perlinCanvas = document.getElementById('perlin');
    perlinCanvas.width = C.PERLIN_DIM;
    perlinCanvas.height = C.PERLIN_DIM+5;
    perlin.perlinNoise(perlinCanvas, 64, 64, seed);
    delta = randomSites();// build the diagram
    
    diagram.cellGroups = {
      impassD:new CellGroup(),
      impassM:new CellGroup(),
      ocean:new CellGroup(),
      lakes:new CellGroup(),
      other:new CellGroup()
    };

    assignOceanCoastAndLand();
    assignRivers();
    assignMoisture();
    assignBiomes();
    assignGroups();
    splitLakes();
    splitOther();
    pickCityStart();

    render();
  },
  getSelectedCell:function(point, realDim){
    var scale = C.DIM/realDim;//adjust for possible zoom changes
    point.x = point.x*scale;
    point.y = point.y*scale;
    
    if(point.x < C.DIM && point.y < C.DIM){
      var closest;
      $.each(diagram.cells, function(index, cell){
        var x = cell.site.x;
        var y = cell.site.y;
        if(Math.abs(x - point.x) < (delta / 2) && Math.abs(y - point.y) < (delta / 2)){
          closest = cell;
          return;//break
        }
      });

      if(closest != undefined){
        return closest;
      }else{
        return null;
      }
    }else{
      return null;
    }
  },
  highlightGroup : function(cell, context){
    var id = cell.site.voronoiId;
    var array;
    if(context=='all'){
      $.each(diagram.cellGroups, function(index, group){
        if($.inArray(id, group.ids) != -1){
          array = group;
        }
      });
      $.each(territories, function(index, group){
        if($.inArray(id, group.ids) != -1){
          array = group;
        }
      });
    }else if(context=='adj'){
      $.each(city.neighbors, function(index, groupId){
        var group = territories[groupId];
        if($.inArray(id, group.ids) != -1){
          array = group;
        }
      });
    }
    if(array != undefined){
      highlightLayer.activate();
      highlightLayer.removeChildren();
      console.log(array);
      renderBorder(array, C.HIGHLIGHT, 2, true);
      renderCell(cell, C.HIGHLIGHT, 2, false);//uncomment to highlight clicked cell in the group
      return array;
    }else{
      return false;
    }
  },
  clearHightlight:function(){
    highlightLayer.removeChildren();
  },
  hideShades:function(){
    shadeLayer.visible = false;
    paper.view.draw();
  },
  showShades:function(){
    shadeLayer.visible = true;
    paper.view.draw();
  },
  hideAdjoiningTerritories:function(){
    highlightLayer.removeChildren();
    edgeLayer.visible = false;
    paper.view.draw();
  },
  showAdjoiningTerritories:function(){
    highlightLayer.removeChildren();
    edgeLayer.visible = true;
    paper.view.draw();
  },
  addGroupToCity:function(cell){
    console.log('AddGroupToCity');
    var groupId = cellIndex[cell.site.voronoiId];
    var group = territories[groupId];
    console.log(group);
    console.log(city);
    
    updateCity(group);
    paper.view.draw();
  }
};// return
});