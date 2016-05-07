// SVGSprite.js

var SVGSprite = cc.Node.extend({
	init:function (svgObject) {
    	this._super();
    	this._flipX = false;
    	this._flipY = true;
    	this._showControlPoint = false;
    	this._ignoreContentSize = false;
    	this._strokeWidth = null;
    	this._color = cc.color(38, 38, 38, 255);
    	this._stroke = null;

    	this._curPath = 0;

        this._svgObject = svgObject;

        this._draw = cc.DrawNode.create();
    	this.addChild(this._draw);

    	// this._resetContent();
        
        this.setAnchorPoint(cc.p(0.5, 0.5));
        // this._updateContentSize();

        return true;
	},
	reset:function() {
		this._resetContent();
	},
	setFlipX:function (isFlip) {
		this._flipX = isFlip;
	},
	setFlipY:function (isFlip) {
		this._flipY = isFlip;
	},
	setColor:function (color) {
		this._color = color;
		// this._resetContent();
	},
	setShowControlPoint:function (isShowControlPoint) {
		this._showControlPoint = isShowControlPoint;
	},
	setIgnoreContentSize:function (isIgnoreContentSize) {
		this._ignoreContentSize = isIgnoreContentSize;
		// this._updateContentSize();
	},
	_oneSrokeNative:function(svgPathObject, svgPointArray) {
		if (svgPointArray.length > 2) {
			var fill = cc.color(0, 0, 0, 0);
			if (svgPathObject._fill == null) {
				svgPathObject._fill = fill; 
			}
			// fill only
		    this._draw.drawPolygonFix(svgPointArray, svgPointArray.length, svgPathObject._fill, 0, cc.color(0, 0, 0, 0));
		}

		var svgCMDPathArray = this._svgObject.getCMDPathArray();
		if (this._curPath < svgCMDPathArray.length) {
			var strokeWidth = 0;
			if (svgPathObject._strokeWidth != null) {
				strokeWidth = svgPathObject._strokeWidth;
			}
			else {
				// try use SVGSprite strokeWidth
				if (this._strokeWidth) {
					strokeWidth = this._strokeWidth;
				}
			}
			strokeWidth = strokeWidth / 10;
			var stroke = null;
			if (svgPathObject._stroke != null) {
				stroke = svgPathObject._stroke;
			}
			var svgCMDPathObject = svgCMDPathArray[this._curPath];
			var svgCMDArray = svgCMDPathObject._cmdArray;
			for (var j = 0; j < svgCMDArray.length; j++) {
				var svgCMDStroke = svgCMDArray[j];
				for (var k = 0; k < svgCMDStroke.length; k++) {
					var svgCMDObject = svgCMDStroke[k];
		    		var svgPointArray = this._pointTransformations(svgCMDObject._pointArray);
		    		if (svgCMDObject._type == SVGPathUtil.DOT) {
		    			if (stroke)
		    				this._draw.drawDot(svgPointArray[0], strokeWidth / 2, stroke);
		    		}
		    		else if (svgCMDObject._type == SVGPathUtil.LINE) {
		    			if (stroke)
		    				this._draw.drawSegment(svgPointArray[0], svgPointArray[1], strokeWidth / 2, stroke);
		    		}
		    		else if (svgCMDObject._type == SVGPathUtil.CURVE_C || svgCMDObject._type == SVGPathUtil.CURVE_S) {
		    			if (stroke)
		    				this._draw.drawCubicBezier(svgPointArray[0], svgPointArray[1], svgPointArray[2], svgPointArray[3], 10, strokeWidth, stroke);
		    		}
		    		else {
		    			cc.log("ERROR TYPE");
		    		}
				}
	    	}
		}
	},
	_oneSrokeWeb:function(svgPathObject, svgPointArray) {
		var strokeWidth = 0;
		if (svgPathObject._strokeWidth != null) {
			strokeWidth = svgPathObject._strokeWidth;
		}
		else {
			// try use SVGSprite strokeWidth
			if (this._strokeWidth) {
				strokeWidth = this._strokeWidth;
			}
		}
		var stroke = cc.color(0, 0, 0 ,0);
		if (svgPathObject._stroke != null) {
			stroke = svgPathObject._stroke;
		}
		else {
			// try use SVGSprite strokeWidth
			if (this._stroke) {
				stroke = this._stroke;
			}
		}
		var fill = cc.color(0, 0, 0 ,0);
		if (svgPathObject._fill != null) {
			fill = svgPathObject._fill;
		}
		else {
			if (this._color != null) {
				fill = this._color;
			}	
		}
		if (svgPointArray.length == 1) {
			this._draw.drawDot(svgPointArray[0], strokeWidth, stroke);
		}
		else if (svgPointArray.length == 2) {
			this._draw.drawSegment(svgPointArray[0], svgPointArray[1], strokeWidth, stroke);
		}
		else {
			this._draw.drawPoly(svgPointArray, fill, strokeWidth, stroke);
		}
	},
	drawAllPath:function() {
		var svgPathArray = this._svgObject.getPathArray();
		for (var i = this._curPath; i < svgPathArray.length; i ++) {
			this.drawOnePath();
		}
	},
	drawOnePath:function() {
		var svgPathArray = this._svgObject.getPathArray();
		if (this._curPath >= svgPathArray.length) {
			return false;
		}
		var svgPathObject = svgPathArray[this._curPath];
		for (var j = 0; j < svgPathObject._d.length; j++) {
			var svgPathStorke = svgPathObject._d[j];
    		var svgPointArray = this._pointTransformations(svgPathStorke);
    		// web and native acts differently
    		if (cc.sys.isNative) {
    			this._oneSrokeNative(svgPathObject, svgPointArray);
    		}
    		else {
    			this._oneSrokeWeb(svgPathObject, svgPointArray);
    		}
    	}
    	this._curPath += 1;
    	return true;
	},
	getCurPathIndex:function() {
		return this._curPath;
	},
	_resetContent:function() {
		// cc.log("_resetContent");
		// this._draw.clear();
		// for (var i = 0; i < this._svgObject.length; i++) {
		// 	var svgPathObject = this._svgObject[i];
		// 	for (var j = 0; j < svgPathObject._pointArray.length; j++) {
		// 		var svgPathStorke = svgPathObject._pointArray[j];
	 //    		var svgPointArray = this._pointTransformations(svgPathStorke);
	 //    		if (svgPathObject._stroke) {
	 //    			this._draw.drawPoly(svgPointArray, svgPathObject._fill, svgPathObject._strokeWidth, svgPathObject._stroke);
	 //    		}
	 //    		else {
	 //    			this._draw.drawPoly(svgPointArray, svgPathObject._fill, 0.01, null);
	 //    		}
	 //    	}
  //   	}
	},
	_updateContentSize:function () {
		// if (this._ignoreContentSize)
		// 	this.setContentSize(cc.size(0, 0));
		// else {
		// 	var l = 99999, r = 0, t = 0, b = 99999;
		// 	for (var i = 0; i < this._svgPathStorkeArray.length; i++) {
	 //    		var svgPathStorke = this._svgPathStorkeArray[i];
	 //    		for (var j = 0; j < svgPathStorke._pointArray.length; j++) {
	 //    			var pt = svgPathStorke._pointArray[j];
	 //    			if (pt.x < l)
	 //    				l = pt.x;
	 //    			if (pt.x > r)
	 //    				r = pt.x;
	 //    			if (pt.y < b)
	 //    				b = pt.y;
	 //    			if (pt.y > t)
	 //    				t = pt.y;
	 //    		}
		// 	}
		// 	this.setContentSize(cc.size(r - l, t - b));	
		// }
	},
	_pointTransformations:function (pointArray) {
		var resultArray = new Array();
		for (var i = 0; i < pointArray.length; i ++) {
			var point = Object.create(pointArray[i]);
			point = cc.p(this._flipX ? -point.x + this.getContentSize().width : point.x, 
						 this._flipY ? -point.y + this.getContentSize().height : point.y);
			resultArray.push(point);
		}
		return resultArray;
	}
});

SVGSprite.create = function (svgObject) {
    var svgSprite = new SVGSprite();
    if (svgSprite && svgSprite.init(svgObject)) 
		return svgSprite;
    return null;
};
