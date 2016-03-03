//Version History
/* * * * * * * *
 *  Version 1.0.0
 *    -2016-2-?   -displays island map
 *     needs Island_1.2.0+
 *  Version 1.0.1
 *    -2016-2-23  -auto clear highlight on timeout
 *  Version 1.0.1
 *    -2016-2-23  -needs Island_1.3.0+
 *  Version 1.0.1
 *    -2016-2-24  -needs Island_1.3.1+
 *  Version 1.1.0
 *    -2016-2-24  -Scroll around map bigger than view
 *  Version 1.1.1
 *    -2016-2-24  -Zoom map
 *     needs Island_1.3.2
 *  Version 1.2.1
 *    -2016-2-24  -moved constants to external file
 *    needs Island_1.4.0
 *  Version 1.2.2
 *    -2016-2-26  -added button to details to add selected adjacent group to the city
 *      needs Island_1.5.0
 *  Version 1.2.3
 *    -2016-2-29  -display group info on highlight
 *      needs Island_1.5.1
 * * * * * * * */
//TODO: create legend
//TODO: Zoom and scroll on click or on hold
//TODO: clear details area when add territory button unclicked
//TODO: clear addTeritory when addgroup clicked
//TODO: decide scale jump for new city location
//ENHANCE: let user pick city color for border/inner -- pass it in via init with seed
define([
        'jquery',
        
        'game/Island',
        'game/constants',

        'dojo/topic',
        'paper'
], function($,Island, C, topic){
  var subscriptions = {};
  var timeoutHandle;
  var shaded = false;
  var sUp, sDown, sRight, sLeft, canvas, zIn, zOut, zP, zM;//variables for DOM objects
  var growingCity = false;
  var selectedCell;
  function createIsland(){
    paper.setup('island');

    var islandCanvas = document.getElementById('island');
    var perlinCanvas = document.getElementById('perlin');

    Island.init(/*0.514391936827451*/);

    var tool = new Tool();
    tool.onMouseUp = function(event){
      var point = event.point;
        selectedCell = Island.getSelectedCell(point, canvas.outerHeight());
        if(selectedCell!=null){
        console.log(selectedCell);
        var context;
        var output=''
        if(growingCity){
          Island.showAdjoiningTerritories();
          context = 'adj';
          output+='  <button type="button" id="confirmAddition">addGroup</button> \n';
        }else{
          context = 'all'
          clearTimeout(timeoutHandle);
          timeoutHandle=setTimeout(function(){
            clearHighlight();
          }, (5*1000));
        }
        var selectedGroup = Island.highlightGroup(selectedCell, context);
        if(selectedGroup){
          output+='<table>\n'+
          '  <tr> <td>Cost:</td>     <td>'+selectedGroup.cost+'</td>     </tr>\n'+
                  '  <tr> <td>Biomes:</td>      <td><div>\n';
          $.each(selectedGroup.biomes,function(name, count){
            output+=name+': '+count+'<br />\n';
          });
          output+='    </div></td></tr>\n'+
                  '  <tr> <td>Site:</td>      <td><div>\n';
          $.each(selectedCell.site,function(name, value){
            output+=name+': '+value+'<br />\n';
          });
          output+='    </div></td></tr>\n'+
                  '  <tr> <td>Water:</td>     <td>'+selectedCell.water+'</td>     </tr>\n'+
                  '  <tr> <td>Ocean:</td>     <td>'+selectedCell.ocean+'</td>     </tr>\n'+
                  '  <tr> <td>Coast:</td>     <td>'+selectedCell.coast+'</td>     </tr>\n'+
                  '  <tr> <td>Beach:</td>     <td>'+selectedCell.beach+'</td>     </tr>\n'+
                  '  <tr> <td>ImpassM:</td>   <td>'+selectedCell.impassM+'</td>   </tr>\n'+
                  '  <tr> <td>ImpassD:</td>   <td>'+selectedCell.impassD+'</td>   </tr>\n'+
                  '  <tr> <td>Moisture:</td>  <td>'+selectedCell.moisture+'</td>  </tr>\n'+
                  '  <tr> <td>Elevation:</td> <td>'+selectedCell.elevation+'</td> </tr>\n'+
                  '  <tr> <td>Biome:</td>     <td>'+selectedCell.biome.name+'</td>     </tr>\n'+
                  '  <tr> <td>Border:</td>    <td>'+selectedCell.border+'</td>    </tr>\n'+
                  '</table>';
          $('#areaDetails').html(output);
          $('#confirmAddition').on('click', function(){
            Island.addGroupToCity(selectedCell);
          });
        }
      }
    }//tool.MouseUp
  }//createIsland
  function assignClicks(){
    $('#showHideShade').on('click', function(){
      if(shaded){
        Island.hideShades();
        shaded = false;
      }else{
        Island.showShades();
        shaded = true;
      }
    });
    $('#addTerritory').on('click', function(){
      growingCity = !growingCity;
      if(growingCity){
        Island.showAdjoiningTerritories();
      }else{
        Island.hideAdjoiningTerritories()
      }
    });
    sUp.on('click', {direction:'up'}, shiftCanvas);
    sLeft.on('click', {direction:'left'}, shiftCanvas);
    sRight.on('click', {direction:'right'}, shiftCanvas);
    sDown.on('click', {direction:'down'}, shiftCanvas);
    zP.on('click', {code:'in'}, zoomCanvas);
    zM.on('click', {code:'out'}, zoomCanvas);
    zIn.on('click', {code:'max'}, zoomCanvas);
    zOut.on('click', {code:'min'}, zoomCanvas);
  }//assignClicks
  function zoomCanvas(event){
    var newDim = canvas.outerHeight();
    switch(event.data.code){
    case 'out'://less of the canvas fits in the view
      newDim-=C.ZOOM_STEP;
      if(newDim<C.VIEW_SIZE){
        newDim=C.VIEW_SIZE;
      }
      break;
    case 'in'://more of the canvas fits in the view
      newDim+=C.ZOOM_STEP;
      if(newDim>C.DIM){
        newDim=C.DIM;
      }
      break;
    case 'max':
      newDim = C.DIM;
      break;
    case 'min':
      newDim = C.VIEW_SIZE;
      break;
    }
    canvas.css({width:newDim, height:newDim});
    checkZoom();
  }//zoom
  function shiftCanvas(event){
    var cS = canvas.outerWidth();
    switch(event.data.direction){
    case 'up':
      var newMargin = parseInt(canvas.css('margin-top'))+C.SCROLL_DIST;
      if(newMargin>0){
        newMargin = 0;
      }
      canvas.css({'margin-top':newMargin});
      break;
    case 'down':
      var newMargin = parseInt(canvas.css('margin-top'))-C.SCROLL_DIST;
      if((cS-C.VIEW_SIZE)<Math.abs(newMargin)){
        newMargin = C.VIEW_SIZE-cS;
      }
      canvas.css({'margin-top':newMargin});
      break;
    case 'left':
      var newMargin = parseInt(canvas.css('margin-left'))+C.SCROLL_DIST;
      if(newMargin>0){
        newMargin = 0;
      }
      canvas.css({'margin-left':newMargin});
      break;
    case 'right':
      var newMargin = parseInt(canvas.css('margin-left'))-C.SCROLL_DIST;
      if((cS-C.VIEW_SIZE)<Math.abs(newMargin)){
        newMargin = C.VIEW_SIZE-cS;
      }
      canvas.css({'margin-left':newMargin});
      break;
    }
    checkZoom();
  }//shiftCanvas
  function checkZoom(){
    if(canvas.outerHeight()==C.VIEW_SIZE){
      sUp.css({visibility:'hidden'});
      sDown.css({visibility:'hidden'});
      sLeft.css({visibility:'hidden'});
      sRight.css({visibility:'hidden'});
      canvas.css({'margin-top':0,'margin-left':0});
      zOut.prop('disabled',true);
      zM.prop('disabled',true);
      zIn.prop('disabled',false);
      zP.prop('disabled',false);
    }else if(canvas.outerHeight()>C.VIEW_SIZE){
      zOut.prop('disabled',false);
      zM.prop('disabled',false);
      if(canvas.outerHeight()==C.DIM){
        zIn.prop('disabled',true);
        zP.prop('disabled',true);
      }else{
        zIn.prop('disabled',false);
        zP.prop('disabled',false);
      }
      var top = canvas.css('margin-top');
      top = parseInt(top.substring(0, top.length - 2));
      var left = canvas.css('margin-left');
      left = parseInt(left.substring(0, left.length - 2));
      
      var right = left+canvas.outerHeight();
      var bottom = top+canvas.outerHeight();
      if(left<0){
        sLeft.css({visibility:'visible'});
      }else{
        sLeft.css({visibility:'hidden'});
        canvas.css({'margin-left':0});
      }
      if(top<0){
        sUp.css({visibility:'visible'});
      }else{
        sUp.css({visibility:'hidden'});
        canvas.css({'margin-top':0});
      }
      if(right>C.VIEW_SIZE){
        sRight.css({visibility:'visible'});
      }else{
        sRight.css({visibility:'hidden'});
        left = left+C.VIEW_SIZE-right;
        canvas.css({'margin-left':left});
      }
      if(bottom>C.VIEW_SIZE){
        sDown.css({visibility:'visible'});
      }else{
        sDown.css({visibility:'hidden'});
        top = top+C.VIEW_SIZE-bottom;
        canvas.css({'margin-top':top});
      }
    }
    paper.view.draw();
  }
  function clearHighlight(){
    Island.clearHightlight();
    $('#areaDetails').html('');
    paper.view.draw();
  }
  function createHandles(){
    sUp = $('#scrollup');
    sDown = $('#scrolldown');
    sLeft = $('#scrollleft');
    sRight = $('#scrollright');
    canvas = $('#island');
    zOut = $('#zoomOut');
    zIn = $('#zoomIn');
    zM = $('#zoomM');
    zP = $('#zoomP');
  }
  return {// functions accessable to the outside
    updateDisplays : function(){},
    start : function(){
      createIsland();
      createHandles();
      assignClicks();
      zOut.trigger('click');//start Zoomed all the way out
    },
    build:function(){
      output= '<div id="mapViewContainer">\n'+
              '  <div id="scrollup"></div>\n'+
              '  <div id="scrollleft"></div>\n'+
              '  <div id="scrollright"></div>\n'+
              '  <div id="mapView">\n'+
              '    <canvas id="island" width="'+C.DIM+'" height="'+C.DIM+'"></canvas>\n'+
              '  </div>\n'+
              '  <div id="scrolldown"></div>\n'+
              '</div>\n'+
              '<canvas id="perlin" hidden="true"></canvas>\n'+
              '<div id="mapTools">\n'+
              '  <button type="button" id="addTerritory">addTerritory</button> \n'+
              '  <button type="button" id="showHideShade">show</button> \n'+
              '  <button type="button" id="zoomIn">zoomIn</button> \n'+
              '  <button type="button" id="zoomP">zoom +</button> \n'+
              '  <button type="button" id="zoomM">zoom -</button> \n'+
              '  <button type="button" id="zoomOut">zoomOut</button> \n'+
              '</div>\n'+
              '<div id="areaDetails"></div>\n';
      return output;
    },
    values:function(){
      var vals = {land:8};
      return vals;
    }
  };// return
});