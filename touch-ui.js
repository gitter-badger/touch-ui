/**
 * TouchUI Core object
 *  - Singleton object
 * Fires the following events
 *  - tap
 *  - double-tap
 *  - triple-tap
 *  - hold
 *  - tap-and-hold
 *  - double-tap-and-hold
 *  - triple-tap-and-hold
 */
let touchUIInstance;

class TouchUI {

  constructor() {
    if (!touchUIInstance) {
      touchUIInstance = this;
      this.startPos = null;  // position touch started
      this.startAt = null;   // time touch  started

      this.prevPos = null;   // previous touch position when touch move
      this.endPos = null;    // the current touch position

      this.lastTouchEventName = null; //name of last event. e.g. tap, double-tap
      this.lastTouchEventAt = null;   //time of last event
      
      this.lastMove = null;           //movement between the previous and current position
      this.holdHappened = false;      //true or false, indicates that hold happened or not

      this.tapTimer = null;           //tap expires after this time
      this.holdTimer = null;          //hold happens after his time

      this.dragEl = null;             //the element that currently dragging
      console.log('............ singleton', this.dragEl)
      this.init();
    }
    return touchUIInstance;
  }

  //add global event listener
  init() {
    this.tapTimer = null;  //tap expires after this time
    this.holdTimer = null; //hold happens after his time

    //The following won't happen because it is a singleton
    let doc = document.body;

    doc.addEventListener(TouchUI.touchStart, this.touchStartHandler.bind(this));
    doc.addEventListener(TouchUI.touchMove,  this.touchMoveHandler.bind(this));
    doc.addEventListener(TouchUI.touchEnd,   this.touchEndHandler.bind(this));
    doc.addEventListener(TouchUI.touchLeave, this.touchResetHandler.bind(this));
  }

  touchStartHandler(e) {
    this.startPos = e.touches ? e.touches : e;
    this.startAt = (new Date()).getTime();
    this.holeHappened = false;

    clearTimeout(this.tapTimer);
    clearTimeout(this.holdTimer);
    this.holdTimer =  setTimeout(() => {
      let eventName = 
        this.lastTouchEventName == 'tap' ? 'tap-and-hold' :
        this.lastTouchEventName == 'double-tap' ? 'double-tap-and-hold' : 'hold';
      TouchUI.fireTouchEvent(e.target, eventName, e);
      this.lastTouchEventName = eventName;
      this.holdHappened = true;
      clearTimeout(this.holdTimer);
    }, TouchUI.HOLD_TIME);
    this.prevPos = this.startPos;
  }

  touchMoveHandler(e) {
    this.endPos = e.touches ? e.touches : e;
    this.lastMove = TouchUI.calcMove(this.prevPos, this.endPos);
    if (this.getMove().length > TouchUI.SMALL_MOVE) { // not a small movement
      clearTimeout(this.holdTimer);
      clearTimeout(this.tapTimer);
    }
    this.prevPos = this.endPos;
  }

  touchEndHandler(e) {
    this.endPos = e.touches ? e.touches : e;
    if (this.getMove().length < TouchUI.SMALL_MOVE) { //if little moved
      let eventName = 
        this.lastTouchEventName == 'tap' ? 'double-tap' :
        this.lastTouchEventName == 'double-tap' ? 'triple-tap' : 'tap';
      TouchUI.fireTouchEvent(e.target, eventName, e);
      this.lastTouchEventName = eventName;
    }
    this.touchResetHandler();
  }

  touchResetHandler(e) {
    this.startPos = null;
    this.startAt = null;
    this.prevPos = null;
    this.endPos = null;
    this.lastTouchEventName = null;
    this.lastTouchEventAt = null;
    this.lastMove = null;
    this.holdHappened = false;
    clearTimeout(this.holdTimer);
    //To catch continuous actoins, e.g., double-tap
    this.tapTimer = setTimeout(() => {
      this.lastTouchEventName = null;
      this.lastTouchEventAt = null;
    }, TouchUI.LAST_EVENT_RESET_TIME);
  }

  getMove() {
    return TouchUI.calcMove(this.startPos, this.endPos);
  }

}

TouchUI.isTouch = function() {
  return  ('ontouchstart' in window)  
    || (navigator.MaxTouchPoints > 0) 
    || (navigator.msMaxTouchPoints > 0);
}

TouchUI.SMALL_MOVE = 10;    //small movement; default 10px
TouchUI.HOLD_TIME  = 100;   //time in milliseconds that hold event fires, default 100ms
TouchUI.LAST_EVENT_RESET_TIME = 200; //time in milliseconds that the last event should be remembered. default 200ms

TouchUI.touchStart = TouchUI.isTouch() ? 'touchstart' : 'mousedown'; 
TouchUI.touchMove  = TouchUI.isTouch() ? 'touchmove'  : 'mousemove';
TouchUI.touchEnd   = TouchUI.isTouch() ? 'touchend'   : 'mouseup';
TouchUI.touchLeave = TouchUI.isTouch() ? 'touchleave' : 'mouseleave';
TouchUI.touchEnter = TouchUI.isTouch() ? 'touchenter' : 'mouseenter';
  
TouchUI.fireTouchEvent = function(el, eventName, orgEvent, eventData) {
  let touchEvent;
  //if org. event is not a TouchEvent, convert to TouchEvent to fire a TouchEvent
  if (!(orgEvent instanceof TouchEvent)) {
    if (orgEvent.button) { // e.button  left 0, middle 1, right 2
      return false;
    }
    let touch = new  Touch({
      identifier: Math.ceil(Math.random()*(10**12)),
      target: orgEvent.target,
      clientX: orgEvent.clientX,
      clientY: orgEvent.clientY,
      screenX: orgEvent.screenX,
      screenY: orgEvent.screenY,
      pageX: orgEvent.pageX || 0,
      pageY: orgEvent.pageY || 0,
      radiusX: 0, 
      radiusY: 0,
      rotationAngle: 0,
      force: 0  //pressure applied
    });
    touchEvent = new TouchEvent(eventName, {
      touches: [touch],
      targetTouches: [touch],
      changedTouches: [touch],
    });
  }

  let customEvent = new TouchEvent(eventName, touchEvent);

  for(var key in (eventData || {})) {
    customEvent[key] = eventData[key];
  }
  customEvent.eventName = eventName;

  el.dispatchEvent(customEvent);

  orgEvent.preventDefault();
  //console.log('firing', eventName, 'on', el, customEvent);
}

TouchUI.setBgText = function(el, text) {
  el = el || document.body;
  text = text || 'tap or swipe here';
  el.style.backgroundImage = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' version='1.1' height='50px' width='300px'><text x='0' y='30' font-size='24' fill='grey'>${text}</text></svg>")`;
}
  
TouchUI.getStyle = function(elem, prop) {
  if (elem.currentStyle) {
    return elem.currentStyle[prop];
  } else if (window.getComputedStyle) {
    return window.getComputedStyle(elem, null)[prop];
  }
}
  
TouchUI.getOverlappingEl = function(inEl, outEls) {
  let rect1 = inEl.getBoundingClientRect(), rect2, overlap;
  for(let i=0; i<outEls.length; i++) {
    rect2 = outEls[i].getBoundingClientRect();
    overlap = !(
      rect1.right < rect2.left ||  rect1.left > rect2.right || 
      rect1.bottom < rect2.top ||  rect1.top > rect2.bottom
    );
    if (overlap) {
      return outEls[i];
      break;
    }
  }
}
  
TouchUI.disableDefaultTouchBehaviour = function(el) {
  el.style.webkitTouchCallout = 'none';
  el.style.webkitUserSelect = 'none';
  el.style.mozUserSelect = 'none';
  el.style.webkitTapHighlightColor = 'rgba(0,0,0,0)';
}
  
TouchUI.emulateTouchEvents = function(el) {
  el.addEventListener('mousedown',  e => TouchUI.fireTouchEvent(el, 'touchstart', e) );
  el.addEventListener('mousemove',  e => TouchUI.fireTouchEvent(el, 'touchmove', e) );
  el.addEventListener('mouseup',    e => TouchUI.fireTouchEvent(el, 'touchend', e) );
  el.addEventListener('mouseenter', e => TouchUI.fireTouchEvent(el, 'touchenter', e) );
  el.addEventListener('mouseleave', e => TouchUI.fireTouchEvent(el, 'touchleave', e) );
}

TouchUI.calcMove = function(startPos, endPos) {
  let move = { x:0, y:0, length: 0, direction: null };
  let startX, startY, endX, endY;
  if (startPos && endPos) {
    startX = startPos.touches ? startPos.touches[0].pageX : startPos.clientX;
    startY = startPos.touches ? startPos.touches[0].pageY : startPos.clientY;
    endX   = endPos.touches ?   endPos.touches[0].pageX   : endPos.clientX;
    endY   = endPos.touches ?   endPos.touches[0].pageY   : endPos.clientY;

    move.x      = endX - startX;
    move.y      = endY - startY;
    move.length = Math.floor(Math.sqrt(Math.pow(move.x, 2) + Math.pow(move.y, 2)));
    let moveX = Math.abs(move.x);
    let moveY = Math.abs(move.y);
    move.direction = 
      (moveX >  moveY) && (startX >  endX) ? 'left' :
      (moveX >  moveY) && (startX <= endX) ? 'right' :
      (moveX <= moveY) && (startY >  endY) ? 'up' :
      (moveX <= moveY) && (startY <= endY) ? 'down' : null;
  }
  return move;
}

TouchUI.parseArguments = function(args, options={}) { //args is an array, Array.from(arguments), not arguments
  let parsed = {elements: [], options: options};
  args.forEach(arg => {
    if (Array.isArray(arg)) {
      parsed.elements = parsed.elements.concat(arg);
    } else if (arg instanceof HTMLElement) {
      parsed.elements.push(arg);
    } else if (typeof arg === 'object') {
      for (var key in arg) {
        parsed.options[key] = arg[key];
      }
    }
  });
  return parsed;
}

TouchUI.getOverlappingEl = function(el, candidates) {
  let rect1 = el.getBoundingClientRect(), rect2, overlap;
  for(let i=0; i<candidates.length; i++) {
    rect2 = candidates[i].getBoundingClientRect();
    overlap = !(
      rect1.right < rect2.left ||  rect1.left > rect2.right || 
      rect1.bottom < rect2.top ||  rect1.top > rect2.bottom
    );
    if (overlap) {
      return candidates[i];
      break;
    }
  }
}