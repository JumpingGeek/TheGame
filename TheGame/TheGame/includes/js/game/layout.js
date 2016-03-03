//Version History
/* * * * * * * *
 *  Version 1.0.0
 *    -2016-2-9   -created top, center, bottom, left, right layout
 *                -left, right, and bottom area hide and unhide
 *  Version 1.1.0
 *    -2016-3-1   -pulled building the panels and adding new content to them  out and put them in a dojo class that used dijit
 *      needs layoutPanel_1.0.0
 * * * * * * * */

//File Contents
/* * * * * * * *
 * Utilities to handle layout events
 * Utilities to add content to areas
 * * * * * * * */
define([
        'jquery',

        'game/layoutPanel',
        'game/constants',

        'dojo/topic',
        'smartResize',
], function($, LayoutPanel, C, topic){
  
  var container;
  var windowHeight;
  var windowWidth;
  var panels = {};
  var panelConfigs = {topPane:    {
                              name:'topPanel', 
                              text: 'Warnings, Messages, etc. go here'
                            },
                leftPane:   {
                              name:'leftPanel',
                              movement:true,
                              openDirection:'right'
                            },
                centerPane: {
                              name:'centerPanel', 
                              text : 'Testing text from panel config',
                              contentStyle : 'tab'
                            },
                rightPane:  {
                              name:'rightPanel', 
                              text:'Test info to be put here',
                              movement:true,
                              openDirection:'left'
                            },
                bottomPane: {
                              name:'bottomPanel', 
                              text: 'SmartResize jQueryPlugin from Paul Irish {http://www.paulirish.com/2009/throttled-smartresize-jquery-event-handler/}<br />'+
                                    'Map Generator built of off the Island Map Generator by Christophe Le Besnerais {http://lebesnec.github.io/island.js/}<br />'+
                                    'jQuery-Timer by Jason Chavannes {https://github.com/jchavannes/jquery-timer}',
                              movement:true,
                              openDirection:'up'
                            }
                };
  
  function buildLayout(){
    $.each(panelConfigs, function(index, config){
      config.parent = container;
      panels[config.name] = new LayoutPanel(config);
    });
  }
  function adjustSize(){
    windowHeight = $(window).height();
    windowWidth = $(window).width();
    console.log(windowWidth+'X'+windowHeight);
    if(windowHeight<C.MIN_HEIGHT){
      container.css('height',C.MIN_HEIGHT);
      panels.centerPanel.div.css('height',(C.MIN_HEIGHT-C.TOP_HEIGHT-35));
    }else{
      container.css('height', windowHeight);
      panels.centerPanel.div.css('height',(windowHeight-C.TOP_HEIGHT-35));
    }
    if(windowWidth<C.MIN_WIDTH){
      container.css('width',C.MIN_WIDTH);
    }else{
      container.css('width', windowWidth);
    }
  }
  return {// functions accessible to the outside
    build:function(location){
      container = $(location);
      buildLayout();
      adjustSize();
      $(window).smartresize(function(){
        adjustSize();
      });
    },
    addContent:function(areaName, content, title, style){
      panels[areaName].addContent(content, title, style);
    }
  };// return
});
