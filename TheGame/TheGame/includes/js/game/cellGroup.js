//Version History
/* * * * * * * *
 *  Version 1.0.0
 *    -2016-2-28  -pulled cell group variables and functions into an object
 *  Version 1.0.1
 *    -2016-2-29  -added conquestCost (cost) to the object
 * * * * * * * */
define([
        'game/biomes',
        'dojo/_base/declare'
        ], function(B,declare){
  return declare(null, {
    cells:[],
    ids:[],
    edges:[],
    biomes:{},
    id:'',
    cost:0,
    neighbors : {},
    constructor : function(i){
      this.cells=[];
      this.ids= [];
      this.edges = [];
      this.biomes = {};
      this.id = i;
      this.cost = 0;
    },
    setEdges: function(){
      var groupEdges = [];
      var idList = this.ids;
      $.each(this.cells, function(index, cell){
        $.each(cell.halfedges, function(index, halfedge){
          var edge = halfedge.edge
          if((edge.lSite==null)||
              (edge.rSite==null)||
              ($.inArray(edge.lSite.voronoiId, idList)==-1)||
              ($.inArray(edge.rSite.voronoiId, idList)==-1)
            ){
            groupEdges.push(edge);
          }
        });
      });
      this.edges = groupEdges;
    },
    setNeighbors:function(cellIndex){
      var neighborList = {};
      $.each(this.edges, function(index, edge){
        var lId = cellIndex[edge.lSite.voronoiId];
        if(lId!=undefined){
          neighborList[lId]=lId;
        }
        var rId = cellIndex[edge.rSite.voronoiId];
        if(rId!=undefined){
          neighborList[rId]=rId;
        }
      });
      this.neighbors = neighborList;
    },
    setCost:function(){
      var c=0;
      $.each(this.cells,function(index, cell){
        c+=cell.biome.cost;
        if(cell.river){
          c--;
        }
      });
      this.cost = c;
    }
  });
});