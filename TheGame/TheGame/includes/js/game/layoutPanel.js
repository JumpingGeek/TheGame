//Version History
/* * * * * * * *
 *  Version 1.0.0
 *    -2016-3-1   -Creates a digit layout for an area for the page, and puts a contentPanes with data from a module in it
 * * * * * * * */
//TODO: get width of moving panels dynamically subtracting swidth div width
//TODO: write CSS for tab panel and children
define([
        'jquery',
        
        'dojo/_base/declare',

        'dijit/layout/ContentPane',
        'dijit/layout/TabContainer'
        ], function($, declare, ContentPane, TabContainer){
  return declare(null, {
  /**Mandatory variables passed in an object to the constructor**/
    name:undefined,           //name of this layoutPanel
    parent : undefined,       //jquery DOM object: the div that all of the layoutPanels live in
  /**Optional variables passed in an object to the constructor**/
    contentStyle : undefined, //how new contentPanes are added {'', 'tab'}
    movement : false,         //if the layout panel hides itself at the edge of the screen
    openDirection : undefined,//defines the opening direction if movement=true
    text : undefined,         //content of an optional, first and default contentPanel
    /**Variables set locally**/
    container : undefined,    //jqueryDomObject: the tabPanel, etc div
    click : undefined,        //on('click') function for the movement trigger div
    div : undefined,          //jquery DOM object: this layoutPanel
    symbolClose : undefined,  //only defined when movement=true
    symbolOpen : undefined,   //only defined when movement=true
    
    constructor : function(args){
      this.contentPanes = [];        //list of all the contentPanes in theis LayoutPanel
      dojo.safeMixin(this, args); 
      this.parent.append('<div id="'+this.name+'"> </div>');
      this.div = $('#'+this.name);
      if(this.movement){
        
      }
      switch(this.contentStyle){
        case 'tab':
          this.container = new TabContainer({
            doLayout:false
          });
          this.container.placeAt(this.name);
          break;
      }
      if(this.text!=undefined&&this.text!=''){
        this.addContent('<p>'+this.text+'</p>', 'text');
      }
      if(this.container!=undefined){
        this.container.startup();
      }
      if(this.movement){
        this.div.append('<div id="switch-'+this.name+'" class="panelSwitch"></div>');
        this.switchDiv = $('#switch-'+this.name);
        var margin;
        var dist;
        switch(this.openDirection){
          case 'right':
            this.symbolOpen='><br />><br />>',
            this.symbolClose='<<br /><<br /><',
            margin = 'margin-left';
            dist = '-620px';
            break;
          case 'left':
            this.symbolOpen='<<br /><<br /><',
            this.symbolClose='><br />><br />>',
            margin = 'margin-right';
            dist = '-550px';
            break;
          case 'up':
            this.symbolOpen='^ ^ ^',
            this.symbolClose='v v v',
            margin = 'margin-bottom';
            dist = '-300px';
            break;
          //No down built because I havn't needed it
        }
        this.click = function(event){
          var div = event.data.cur.div;
          var switchDiv = event.data.cur.switchDiv;
          if(div.css(margin)=='0px'){
            div.css(margin,dist);
            switchDiv.html(event.data.cur.symbolOpen);
          }else{
            div.css(margin,'0px');
            switchDiv.html(event.data.cur.symbolClose);
          }
        }
        this.switchDiv.html(this.symbolOpen);
        this.switchDiv.on('click',{cur:this},this.click);
      }
    },
    addContent : function(content, title, style){
      var cPane = new ContentPane({
        content : content,
        title:title,
        style:style
      });
      switch(this.contentStyle){
        case 'tab':
          this.container.addChild(cPane);
          break;
        default:
          cPane.placeAt(this.name);
      }
      var index = this.contentPanes.push(cPane);
      return index-1;//pass back the array index of this comtent pane, not the length of the array
    },
    resize:function(panelId){
      this.contentPanes[panelId].resize();
    }
  });
});