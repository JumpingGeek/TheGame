define([
  'jquery',
  
  'game/constants',
  
  'dojo/topic',

  'dojo/dnd/Source',
  'dojo/dnd/Manager',
  'dojo/dnd/common'
], function($, C, topic, Source, Manager, dnd){
  var subscriptions = {};
  var maxCpS;// = 3;//calc based on containerWidth/elementWidth
  var sources = [];
  var container;
  function createStat(item, hint){
    var contents = 'SOME TEXT<br />';
    var newDiv = dojo.create('div', {class:'statistic',innerHTML:item});
    newDiv
    if(hint=='avatar'){
      //
    }
    return {node:newDiv, data:item, type:item.type};
  }
  function getRowList(rowId){
    return sources[rowId].getAllNodes();
  }
  function moveLast(target, diff, source){//backward works
    var from = target;
    while(sources[index+diff]!=source){
      var index = parseInt(from.node.id.substring(11));
      var fromNodes = from.getAllNodes();
      from.selectNone();
      
      var lastNode;
      if(diff>0){
        lastNode = fromNodes.pop();
        from.parent.removeChild(lastNode);
        var data = from.getItem(lastNode.id)
        var anchor = sources[index+diff].getAllNodes().shift();
        sources[index+diff].insertNodes(false, [data.data], true, anchor);
      }else{
        lastNode = fromNodes.shift();
        from.parent.removeChild(lastNode);
        sources[index+diff].parent.appendChild(lastNode);
      }
      var last = lastNode.id;
      
      sources[index+diff].sync();
      from = sources[index+diff]
    }
    /*
    var info = from.getItem(last);
    from.delItem(last);
    sources[index+diff].insertNodes(false, info, true, toNodes[0]);*/
  }
  return {// functions accessible to the outside
    updateDisplays : function(){},
    start : function(){
      var width = container.width();
      maxCpS = Math.floor(width/C.STATISTICS_WIDTH);
      
      dojo.declare('Source2', Source, {
            onDropExternal : function(source, nodes, copy){
              this.inherited(arguments);
              // because this event is fired for every source, 
              // we need to make sure we are only making changes on the target
              // source, because the move has happened by now
                var tNum = parseInt(this.node.id.substring(11));
                var sNum = parseInt(source.node.id.substring(11));
                console.log(tNum + " "+ sNum);
                var last = this.node.lastChild;
                var next;
                var diff;
                if(tNum<sNum){
                  //bubble down the page
                  next = this.node.nextSibling;
                  diff=1;
                }else{
                  //bubble up the page
                  next = this.node.previousSibling;
                  diff=-1;
                }
                moveLast(this, diff, source);
                this.sync();
                /*$(next).prepend(last);
                $(last).removeClass('dojoDndItemAnchor');
                sources[tNum+diff].sync();
                this.sync();*/
              },
              onMouseMove: function(e){
                // summary:
                //    event processor for onmousemove
                // e: Event
                //    mouse event
                if(this.isDragging && this.targetState == "Disabled"){ return; }
                Source.superclass.onMouseMove.call(this, e);
                var m = Manager.manager();
                if(!this.isDragging){
                  if(this.mouseDown && this.isSource &&
                      (Math.abs(e.pageX - this._lastX) > this.delay || Math.abs(e.pageY - this._lastY) > this.delay)){
                    var nodes = this.getSelectedNodes();
                    if(nodes.length){
                      m.startDrag(this, nodes, this.copyState(dnd.getCopyKeyState(e), true));
                    }
                  }
                }
                if(this.isDragging){
                  // calculate before/after
                  var before = true;
                  //TODO: if moving down, place after
                  if(this.current != this.targetAnchor || before != this.before){
                    this._markTargetAnchor(before, );
                    m.canDrop(!this.current || m.source != this || !(this.current.id in this.selection));
                  }
                }
              },
              onMouseUp : function(e){
                this.inherited(arguments);
                $('.dojoDndItemAnchor').removeClass('dojoDndItemAnchor');
              },
              _markTargetAnchor:function(before, source){
                if(this.current == this.targetAnchor && this.before == before){
                  return;
                }
                var sNum = parseInt(source.node.id.substring(11));
                var tNum = parseInt(this.parent.id.substring(11))
                if(tNum>sNum){
                  before = false;
                }
                if(this.targetAnchor){
                  this._removeItemClass(this.targetAnchor, this.before ? "Before" : "After");
                }
                this.targetAnchor = this.current;
                this.targetBox = null;
                this.before = before;
                if(this.targetAnchor){
                  this._addItemClass(this.targetAnchor, this.before ? "Before" : "After");
                }
              }
          });
      sources.push(new Source2('statsSource0',{horizontal:true,creator:createStat}));
    },
    build:function(containerName){
      container = $('#'+containerName);
      return '<div id="statsSource0"></div>';
    },
    add:function(content){
      var lastRowId = sources.length-1;
      var lastRow = getRowList(lastRowId);
      if(lastRow.length>=maxCpS){
        parent = $('#statsSource'+lastRowId).parent();
        lastRowId++;
        parent.append('<div id="statsSource'+lastRowId+'"></div>')
        sources.push(new Source2('statsSource'+lastRowId,{horizontal:true,creator:createStat}));
      }
      sources[lastRowId].insertNodes(false,[content]);
    },
    getRow:function(row){
      return getRowList(row);
    }
  };// return
});