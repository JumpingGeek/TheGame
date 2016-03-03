//Version History
/* * * * * * * *
 *  Version 0.0.1
 *   POCs and Core functionalities 
 *    -2016-2-6 encode game variable and save it to cookie
 *    -2016-2-6 load and decode game variable from cookie
 *  Version 0.0.2
 *    -2016-2-19 add, build, and start modules
 *      needs layout_1.0.0+
 *      needs map_1.0.0+
 *  Version 0.0.3 (compatible with 0.0.2+ saves)
 *    needs layout_1.1.0
 * * * * * * * */
//TODO: save map to cookie
//TODO: retrieve map from cookie and display it
//ENHANCE: add help button to display help tooltips
//FIXME: need resize funcion on each module
define([
  'jquery',
  'jquery-timer',
        
  'library/base64',
  
  'game/layout',
  'game/map',
  'game/statistics',
  'game/constants',
  
  'dojo/cookie',
  'dojo/topic'
], function($, timer, b64, layout, map, stats, C, cookie, topic){
  var VERSION = '0.0.3';
  var subscriptions = {};
  var gameLoop = $.timer(function(){
    console.log(new Date());
    }, 1000*3, false);;
  var modules = {
                 map:   {
                          name  : 'map',
                          loc   : 'leftPanel',
                          style : 'overflow:hidden',
                          build : map.build,
                          start : map.start,
                          update: map.updateDisplay,
                          values: map.values
                        },
                 statistic:{
                          name  : 'statistic',
                          loc   : 'centerPanel',
                          build : stats.build,
                          start : stats.start
                 }
                };
  var Game = {};
  
  function addModule(name, value){
    console.log('got Here');
    //TODO: add each of the module's values to the Game
  }
  function saveGame(){
    var gameString = JSON.stringify(Game);// convert save file to jason str
    var encodedSave = b64.encode(gameString);
    cookie('TheGameCookie', encodedSave, {});
  }
  function loadGame(){
    var loadCookie = cookie('TheGameCookie');
    if(loadCookie == undefined){//no cookie exists
      initilizeGame();
    }else{
      var save = b64.decode(loadCookie);//convert decoded json to the save data
      parseSave(save);
    }
  }
  function initilizeGame(){
    Game.version = VERSION;
    //set game values to default/blank values
  }
  function parseSave(save){
    var loadedGame = JSON.parse(save);
    if(save=='{}'){
      initilizeGame();
    }else{
      if(loadedGame.version==VERSION){
        console.log("Loading save from this version of the game.")
        Game = loadedGame;
      }else{
        alert('Incorrect Game Version');
        //FIXME:clean up error message
      }
    }
  }
  return {// functions accessable to the outside
    addModule : function(name, value){return addModule(name, value);},
    save : function(){return saveGame();},
    load : function(){return loadGame();},
    setDiagram : function(diagram){
      Game.diagram = diagram;
    },
    start:function(){
      C.calculate();
      document.title+= ' | DEMO ver {' + VERSION + '}';
      layout.build(content);
      $.each(modules,function(index, module){//set up HTML for the module
          layout.addContent(module.loc, module.build(module.loc), module.style);
      });
      $.each(modules,function(index, module){//run the module
        module.start();
      });
      console.log(modules.map.values());
      stats.add("example");
      stats.add("example2");
      stats.add("example3");
      stats.add("example4");
      stats.add("example5");
      stats.add("example6");
      stats.add("example7");
      stats.add("example8");
      stats.add("example9");
      stats.add("example10");
      //Start the game loop here
      //gameLoop.play();
    }
  };// return
});
