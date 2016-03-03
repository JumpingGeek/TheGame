define([
], function(){
  return {
  //map constants
    DIM : -1,
    CELL_WIDTH : 35,
    PERLIN_DIM : 128,
    CLIFF_THRESHOLD : 0.15,
    LAKE_THRESHOLD : 0.005,
    MAX_RIVER_SIZE : 4,
    MAX_GROUP_SIZE : 8,
    SHADING : 0.35,
    SHADE_OCEAN : true,
    SHOW_SHADE : false,
    SHOW_GROUPS : false,
    CHARS : ['O', 'D', 'M'],
    
    EDGE_COLOR : '#D500D5',
    HIGHLIGHT : '#ff6600',
    CITY_BORDER : '#74797F',
    RIVER : '#369eea',
    ROCK : '#535353',
    
  //display constants
    ZOOM_STEP : 25,
    SCROLL_DIST : 25,
    VIEW_SIZE : 500,//same as mapView in css
    TOP_HEIGHT : 200,//same as CSS #topPanel
    MIN_WIDTH : 1280,
    MIN_HEIGHT : 800,
    STATISTICS_WIDTH : 400,//same as CSS .statistic
    calculate:function(){
      this.DIM = 25*(this.CELL_WIDTH-1);
      //TODO: calculate perlin_dim and iteration step changes here
    }
  };
});