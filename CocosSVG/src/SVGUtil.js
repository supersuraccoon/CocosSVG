/**
 *
 *  SVG regex pattern
 */
var SVG_REGEX = {
	// head
	"HEAD": /<svg[\s\S]*?\>/mg, 								// svg head
	"HEAD_WIDTH": /width.*?=.*?\"(.*?)\"/i, 					// svg head, image width
	"HEAD_HEIGHT": /height.*?=.*?\"(.*?)\"/i, 					// svg head, image height
	// draw
	"PATH_SEGMENT": /<path[\s\S]*?\/>/mg,						// svg draw path segment
	"PATH_D": /d.*?=.*?\"(.*?)\"/i,								// svg draw path data
	"PATH_FILL": /fill.*?=.*?\"(.*?)\"/i,						// svg draw path fill color
	"PATH_STROKE": /stroke.*?=.*?\"(.*?)\"/i,					// svg draw path stroke color
	"PATH_STROKE_WIDTH": /stroke-width.*?=.*?\"(.*?)\"/i,		// svg draw path stroke width
	// other
	"HEX_COLOR": /^#?[a-f\d]+(3|6)$/i,
	"LINE_BREAK": /(\r\n|\n|\r)/mg,
	"SPACE": /(\s*)/g
};

var SVGCMDObject = function (type, pointArray) {
	this._type = type;
	this._pointArray = pointArray;
};

var SVGCMDPathObject = function (cmdArray) {
	this._cmdArray = cmdArray;
};

/**
 *
 *  SVGObject
 *  .svg file: <svg ...... width="..." height="..." ...>
 */
var SVGObject = function(width, height, pathArray, cmdPathArray) {
	this._width = width || 0;
	this._height = height || 0;
	this._pathArray = pathArray || []; // SVGPathObject
	this._cmdPathArray = cmdPathArray || []; // SVGCMDPathObject
	
	this.getWidth = function() {
		return this._width;
	};
	this.getHeight = function() {
		return this._height;
	};
	this.getPathArray = function() {
		return this._pathArray;
	};
	this.getCMDPathArray = function() {
		return this._cmdPathArray;
	};
	this.setWidth = function(width) {
		this._width = width;
	};
	this.setHeight = function(height) {
		this._height = height;
	};
	this.setPathArray = function(pathArray) {
		this._pathArray = pathArray;
	};
	this.setCMDPathArray = function(cmdPathArray) {
		this._cmdPathArray = cmdPathArray;
	};
	this._debug = function() {
		cc.log("");
		cc.log("------ SVGObject head ------");
		cc.log("width: " + this.getWidth());
		cc.log("height: " + this.getHeight());
		cc.log("pathArray length: " + this.getPathArray().length);
		for (var i = 0; i < this.getPathArray().length; i ++) {
			cc.log("\td" + i + " stroke size: " + this.getPathArray()[i]._d.length);
			for (var j = 0; j < this.getPathArray()[i]._d.length; j ++) {
				cc.log("\t\t: d" + i + "-" + j + " : point size: " + this.getPathArray()[i]._d[j].length);
			}
			if (this.getPathArray()[i]._fill)
				cc.log("\tfill: (" + this.getPathArray()[i]._fill.r + ", " +  this.getPathArray()[i]._fill.r + ", " + this.getPathArray()[i]._fill.b + ", " + this.getPathArray()[i]._fill.a + ")");
			else 
				cc.log("\tfill: null");
			if (this.getPathArray()[i]._stroke)
				cc.log("\tstroke: (" + this.getPathArray()[i]._stroke.r + ", " +  this.getPathArray()[i]._stroke.r + ", " + this.getPathArray()[i]._stroke.b + ", " + this.getPathArray()[i]._stroke.a + ")");
			else 
				cc.log("\tstroke: null");
			if (this.getPathArray()[i]._strokeWidth)
				cc.log("\tstrokeWidth: (" + this.getPathArray()[i]._strokeWidth.r + ", " +  this.getPathArray()[i]._strokeWidth.r + ", " + this.getPathArray()[i]._strokeWidth.b + ", " + this.getPathArray()[i]._strokeWidth.a + ")");
			else 
				cc.log("\tstrokeWidth: null");
		}
		cc.log("------ SVGObject head ------");
		cc.log("");
	};
};

/**
 *
 *  SVGPathObject
 *  .svg file: <path fill="..." d="..." stroke="", stroke-width="">
 *  The _d is a 2 dimensional array.
 *  _d 		=> A path in svg
 *  _d[i] 	=> A series of ccPoint cocos2dx (a stroke)
 *  
 *  So A path may contain several strokes (at least one)
 */
var SVGPathObject = function(d, fill, stroke, strokeWidth) {
	this._d = d; // stroke ==> [[M......Z], [M......Z], [M......Z] ...] ==> count > 0, cc.Point
	this._fill = fill;
	this._stroke = stroke;
	this._strokeWidth = strokeWidth;
};

/**
 *  Parse SVG draw path command into a series of ccPoint cocos2dx
 */
var SVGPathUtil = function () {};
SVGPathUtil.CURVE_SEGEMENTS = 10; // split curve into n segements

SVGPathUtil.DOT = 1;
SVGPathUtil.LINE = 2;
SVGPathUtil.CURVE_C = 3;
SVGPathUtil.CURVE_S = 4;

/**
 *
 *  SVG Path Command list:
 * 	(OK)		M		moveto								(x y)+
 * 	(OK)		Z		closepath							(none)
 * 	(OK)		L		lineto								(x y)+
 * 	(OK)		H		horizontal lineto					x+
 * 	(OK)		V		vertical lineto						y+
 * 	(OK)		C		curveto								(x1 y1 x2 y2 x y)+
 * 	(OK)		S		smooth curveto						(x2 y2 x y)+
 * 	(NO)		Q		Quadratic Bézier curveto			(x1 y1 x y)+
 * 	(NO)		T		smooth quadratic Bézier curveto		(x y)+
 * 	(NO)		A		elliptical arc						(rx ry x-axis-rotation large-arc-flag sweep-flag x y)+
 * 	(NO)		R		Catmull-Rom curveto*				x1 y1 (x y)+
 */
SVGPathUtil.parsePath = function (pathString) {
	var pathArray = pathString.split("\n");
	var svgStrokeArray = new Array();
	var svgPathArray = new Array();
	var svgCMDObjectArray = new Array();
	var svgCMDPathObjectArray = new Array();
	var x = 0, y = 0, px = 0, py = 0, ix = 0, iy = 0;
	var prePt = null;
	for (var i = 1; i < pathArray.length; i++) {
		var instruction = pathArray[i];
		var cmd = instruction.substr(0, 1);
		var terms = (instruction.length > 1 ? instruction.substr(1).trim().split(" ") : "");
		
		// debug
		// cc.log("instruction: " + instruction);
		// cc.log("cmd: " + cmd);
		// cc.log("terms: " + terms);
		
		// M moveto (x y)+
		if(cmd == "m" || cmd == "M") {
			if (prePt != null) {
				// may be a new start and the pre path not ending with z
				if (svgStrokeArray.length > 1) {
					if (svgStrokeArray[0].x == svgStrokeArray[svgStrokeArray.length - 1].x &&
						svgStrokeArray[0].y == svgStrokeArray[svgStrokeArray.length - 1].y) {
						svgStrokeArray.pop();
					}	
				}
				prePt = null;
				svgPathArray.push(svgStrokeArray.slice());
				svgStrokeArray.length = 0;
				svgCMDPathObjectArray.push(svgCMDObjectArray.slice());
				svgCMDObjectArray.length = 0;
			}
			for (var j = 0; j < terms.length / 2; j++) {
				var _x = parseFloat(terms[j * 2]), _y = parseFloat(terms[j * 2 + 1]);
				px = x, py = y;
				(cmd == "m") ? (x += _x, y += _y) : (x = _x, y = _y);
				if (j == 0) {
					ix = x, iy = y;
					if (prePt == null || (prePt.x != x || prePt.y != y)) {
						prePt = cc.p(x, y);
						svgStrokeArray.push(prePt);
					}
					svgCMDObjectArray.push(new SVGCMDObject(SVGPathUtil.DOT, [cc.p(x,y)]));
				}
				else {
					// implict lineto command
					if (prePt == null || (prePt.x != px || prePt.y != py)) {
						prePt = cc.p(px, py);
						svgStrokeArray.push(prePt);
					}
					if (prePt == null || (prePt.x != x || prePt.y != y)) {
						prePt = cc.p(x, y);
						svgStrokeArray.push(prePt);
					}
					svgCMDObjectArray.push(new SVGCMDObject(SVGPathUtil.LINE, [cc.p(px,py), cc.p(x,y)]));
				}
			}
		}
		// L lineto (x y)+
		else if(cmd == "l" || cmd == "L") {
			for (var j = 0; j < terms.length / 2; j++) {
				var _x = parseFloat(terms[j * 2]), _y = parseFloat(terms[j * 2 + 1]);
				px = x, py = y;
				(cmd == "l") ? (x += _x, y += _y) : (x = _x, y = _y);
				if (prePt == null || (prePt.x != px || prePt.y != py)) {
					prePt = cc.p(px, py);
					svgStrokeArray.push(prePt);
				}
				if (prePt == null || (prePt.x != x || prePt.y != y)) {
					prePt = cc.p(x, y);
					svgStrokeArray.push(prePt);
				}
				svgCMDObjectArray.push(new SVGCMDObject(SVGPathUtil.LINE, [cc.p(px,py), cc.p(x,y)]));	
			}
		}
		// H horizontal lineto x+
		else if(cmd == "h" || cmd == "H") {
			for (var j = 0; j <= terms.length - 1; j++) {
				var _x = parseFloat(terms[j]);
				px = x, py = y;
				(cmd == "h") ? (x += _x) : (x = _x);
				if (prePt == null || (prePt.x != px || prePt.y != py)) {
					prePt = cc.p(px, py);
					svgStrokeArray.push(prePt);
				}
				if (prePt == null || (prePt.x != x || prePt.y != py)) {
					prePt = cc.p(x, py);
					svgStrokeArray.push(prePt);
				}
				svgCMDObjectArray.push(new SVGCMDObject(SVGPathUtil.LINE, [cc.p(px,py), cc.p(x,py)]));	
			}
		}
		// V vertical lineto y+
		else if(cmd == "v" || cmd == "V") {
			for (var j = 0; j <= terms.length - 1; j++) {
				var _y = parseFloat(terms[j]);
				px = x, py = y;
				(cmd == "v") ? (y += _y) : (y = _y);
				if (prePt == null || (prePt.x != px || prePt.y != py)) {
					prePt = cc.p(px, py);
					svgStrokeArray.push(prePt);
				}
				if (prePt == null || (prePt.x != px || prePt.y != py)) {
					prePt = cc.p(px, y);
					svgStrokeArray.push(prePt);
				}
				svgCMDObjectArray.push(new SVGCMDObject(SVGPathUtil.LINE, [cc.p(px,py), cc.p(px,y)]));	
			}
		}
		// C curveto (x1 y1 x2 y2 x y)+
		else if(cmd == "c" || cmd == "C") {
			for (var j = 0; j < terms.length / 6; j++) {
				// get first control point
				var _x = parseFloat(terms[j * 6]), _y = parseFloat(terms[j * 6 + 1]);
				var cx1 = 0, cy1 = 0;
				(cmd == "c") ? (cx1 = x + _x, cy1 = y + _y) : (cx1 = _x, cy1 = _y);
				
				// get second control point
				 _x = parseFloat(terms[j * 6 + 2]), _y = parseFloat(terms[j * 6 + 3]);
				var cx2 = 0, cy2 = 0;
				(cmd == "c") ? (cx2 = x + _x, cy2 = y + _y) : (cx2 = _x, cy2 = _y);
				
				// get des point
				px = x, py = y;
				_x = parseFloat(terms[j * 6 + 4]), _y = parseFloat(terms[j * 6 + 5]);
				(cmd == "c") ? (x += _x, y += _y) : (x = _x, y = _y);

				// handle curve
				var t = 0;
                for (var s = 0; s < SVGPathUtil.CURVE_SEGEMENTS; s++) {
                    var xx = Math.pow(1 - t, 3) * px + 3.0 * Math.pow(1 - t, 2) * t * cx1 + 3.0 * (1 - t) * t * t * cx2 + t * t * t * x;
                    var yy = Math.pow(1 - t, 3) * py + 3.0 * Math.pow(1 - t, 2) * t * cy1 + 3.0 * (1 - t) * t * t * cy2 + t * t * t * y;
                    if (prePt == null || (prePt.x != xx || prePt.y != yy)) {
						prePt = cc.p(xx, yy);
						svgStrokeArray.push(prePt);
					}
                    t += 1.0 / SVGPathUtil.CURVE_SEGEMENTS;
                }
                if (prePt == null || (prePt.x != x || prePt.y != y)) {
					prePt = cc.p(x, y);
					svgStrokeArray.push(prePt);
				}
				svgCMDObjectArray.push(new SVGCMDObject(SVGPathUtil.CURVE_C, [cc.p(px,py), cc.p(cx1,cy1), cc.p(cx2,cy2), cc.p(x,y)]));		
			}		
		}
		// S smooth curveto	(x2 y2 x y)+
		else if(cmd == "s" || cmd == "S") {
			for (var j = 0; j < terms.length / 4; j++) {
				// get second control point
				var _x = parseFloat(terms[j * 4]), _y = parseFloat(terms[j * 4 + 1]);
				var cx2 = 0, cy2 = 0;
				(cmd == "s") ? (cx2 = x + _x, cy2 = y + _y) : (cx2 = _x, cy2 = _y);
				
				// get des point
				px = x, py = y;
				_x = parseFloat(terms[j * 4 + 2]), _y = parseFloat(terms[j * 4 + 3]);
				(cmd == "s") ? (x += _x, y += _y) : (x = _x, y = _y);

				// first control point is the reflection of the second one about the end one
				var cx1 = 2 * cx2 - x, cy1 = 2 * cy2 - y;

				// handle curve
				var t = 0;
                for (var s = 0; s < SVGPathUtil.CURVE_SEGEMENTS; s++) {
                    var xx = Math.pow(1 - t, 3) * px + 3.0 * Math.pow(1 - t, 2) * t * cx1 + 3.0 * (1 - t) * t * t * cx2 + t * t * t * x;
                    var yy = Math.pow(1 - t, 3) * py + 3.0 * Math.pow(1 - t, 2) * t * cy1 + 3.0 * (1 - t) * t * t * cy2 + t * t * t * y;
                    if (prePt == null || (prePt.x != xx || prePt.y != yy)) {
						prePt = cc.p(xx, yy);
						svgStrokeArray.push(prePt);
					}
                    t += 1.0 / SVGPathUtil.CURVE_SEGEMENTS;
                }
                if (prePt == null || (prePt.x != x || prePt.y != y)) {
					prePt = cc.p(x, y);
					svgStrokeArray.push(prePt);
				}
				svgCMDObjectArray.push(new SVGCMDObject(SVGPathUtil.CURVE_S, [cc.p(px,py), cc.p(cx1,cy1), cc.p(cx2,cy2), cc.p(x,y)]));
			}		
		}
		// Z closepath (none)
		else if(cmd == "z" || cmd == "Z") {
			if (prePt == null || (prePt.x != x || prePt.y != y)) {
				prePt = cc.p(x, y);
				svgStrokeArray.push(prePt);
			}
			if (prePt == null || (prePt.x != ix || prePt.y != iy)) {
				prePt = cc.p(ix, iy);
				svgStrokeArray.push(prePt);
			}
			// if (svgStrokeArray.length > 1) {
			// 	if (svgStrokeArray[0].x == svgStrokeArray[svgStrokeArray.length - 1].x &&
			// 		svgStrokeArray[0].y == svgStrokeArray[svgStrokeArray.length - 1].y) {
			// 		svgStrokeArray.pop();
			// 	}	
			// }
			prePt = null;
			svgPathArray.push(svgStrokeArray.slice());
			svgStrokeArray.length = 0;

			svgCMDObjectArray.push(new SVGCMDObject(SVGPathUtil.LINE, [cc.p(x,y), cc.p(ix,iy)]));
			svgCMDPathObjectArray.push(svgCMDObjectArray.slice());
			svgCMDObjectArray.length = 0;
		}
		else {
			cc.log("UNKNOWN CMD: " + cmd);
		}
	}
	if (svgStrokeArray.length > 0) {
		svgPathArray.push(svgStrokeArray.slice());
	}
	// cc.log("svgPathArray: " + svgPathArray.length);
	// cc.log("svgCMDPathObjectArray: " + svgCMDPathObjectArray.length);
	return [svgPathArray, svgCMDPathObjectArray];
};

/**
 *  create a SvgObject from a given path command
 *  eg:
 *		M25.371,7.306C27.43,15.186,25.645,16.973,23.436,16.979z
 *  eg:
 *		http://raphaeljs.com/icons
 */
SVGPathUtil.createSVGObjectFromString = function(pathString) {
	var svgObject = new SVGObject();

	var svgPathArray = [];
	var pathDArray = [];
	var cmdDArray = [];
	var cmdPathArray = [];
	var d = pathString;
	if (d) {
		d = d.replace(/\s*([poiuytrewqasdfghjklmnbvcxzPOIUYTREWQASDFGHJKLMNBVCXZ])\s*/g, "\n$1 ")
			 .replace(/,/g, " ")
			 .replace(/-/g, " -")
			 .replace(/ +/g, " ");
		var ret = SVGPathUtil.parsePath(d);
		pathDArray =  ret[0];
		cmdDArray =  ret[1];
	}
	svgPathArray.push(new SVGPathObject(pathDArray, null, null, null));
	cmdPathArray.push(new SVGCMDPathObject(cmdDArray));
	svgObject.setPathArray(svgPathArray);
	svgObject.setCMDPathArray(cmdPathArray);

	// debug
	// svgObject._debug();
	return svgObject;
};


SVGPathUtil.createSVGObjectFromArray = function(pathArray) {
	var svgObject = new SVGObject();

	var svgPathArray = [];
	var cmdDArray = [];
	var cmdPathArray = [];
	var svgPathSegmentArray = pathArray;
	if (svgPathSegmentArray && svgPathSegmentArray.length > 0) {
		for (var i = 0; i < svgPathSegmentArray.length; i ++) {
			var pathDArray = [];
			var svgPathSegment = svgPathSegmentArray[i];
    		var d = svgPathSegment["path"];
    		if (d) {
    			d = d.replace(/\s*([poiuytrewqasdfghjklmnbvcxzPOIUYTREWQASDFGHJKLMNBVCXZ])\s*/g, "\n$1 ")
					 .replace(/,/g, " ")
					 .replace(/-/g, " -")
					 .replace(/ +/g, " ");
    			pathDArray =  SVGPathUtil.parsePath(d)[0];
    			cmdDArray =  SVGPathUtil.parsePath(d)[1];
    		}
    		var fill = svgPathSegment["fill"];
    		if (fill) {
    			fill = fill.replace(SVG_REGEX.SPACE, "");
    			fill = SVGFileUtil.parseColor(fill);
    		}
    		var stroke = svgPathSegment["stroke"];
    		if (stroke) {
    			stroke = stroke.replace(SVG_REGEX.SPACE, "");
    			stroke = SVGFileUtil.parseColor(stroke);
    		}
    		var strokeWidth = svgPathSegment["stroke-width"];
    		if (strokeWidth) {
    			strokeWidth = parseFloat(strokeWidth);
    		}
    		svgPathArray.push(new SVGPathObject(pathDArray, fill, stroke, strokeWidth));
    		cmdPathArray.push(new SVGCMDPathObject(cmdDArray));
		}
	}
	else {
		cc.log("svgPathSegmentArray is empty, nothing to draw");
	}
	svgObject.setPathArray(svgPathArray);
	svgObject.setCMDPathArray(cmdPathArray);
	// debug
	// svgObject._debug();
	return svgObject;
};

/**
 *
 *  create SVGObject from .svg file
 */
var SVGFileUtil = function() {};

SVGFileUtil._regexOne = function(content, pattern, index) {
	var resultArray = content.match(pattern);
	if (resultArray == null)
		return null;
	else {
		return (index >= resultArray.length) ? null : resultArray[index];
	}
};

SVGFileUtil._regexAll = function(content, pattern) {
	var resultArray = content.match(pattern);
	if (resultArray == null)
		return null;
	else {
		return resultArray;
	}
};

SVGFileUtil._regexTest = function(content, pattern) {

	return pattern.test(content);
};

SVGFileUtil._hexToRgb = function(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: 255
    } : null;
};

// possble format: #ffffff, #123, black, return cc.color
SVGFileUtil.parseColor = function(colorString) {
	var hex = SVGFileUtil._hexToRgb(colorString);
	if (hex == null) {
		// named color
		var namedColorDict = [
			"black", 	"#000000",
			"blue", 	"#0000FF",
			"green", 	"#008000",
			"aqua",		"#00FFFF",
			"cyan",		"#00FFFF",
			"purple",	"#800080",
			"gray",		"#808080",
			"brown",	"#A52A2A",
			"silver",	"#C0C0C0",
			"red",		"#FF0000",
			"orange",	"#FFA500",
			"pink",		"#FFC0CB",
			"gold",		"#FFD700",
			"yellow",	"#FFFF00",
			"white",	"#FFFFFF"
		];
		hex = namedColorDict["colorString"];
	}
	return hex;
};


/**
 *  create a SvgObject from a given string (usually .svg content)
 */
SVGFileUtil.createSVGObjectFromString = function(svgString) {
	var svgObject = new SVGObject();
	// parse head
	var svgHead = SVGFileUtil._regexOne(svgString, SVG_REGEX.HEAD, 0);
	if (svgHead) {
		svgHead = svgHead.replace(SVG_REGEX.LINE_BREAK, "");
		var svgWidth = SVGFileUtil._regexOne(svgHead, SVG_REGEX.HEAD_WIDTH, 1);
		if (svgWidth) {
			svgWidth = svgWidth.replace("px", "");
			svgObject.setWidth(parseFloat(svgWidth));
		}
		var svgHeight = SVGFileUtil._regexOne(svgHead, SVG_REGEX.HEAD_HEIGHT, 1);
		if (svgHeight) {
			svgHeight = svgHeight.replace("px", "");
			svgObject.setHeight(parseFloat(svgHeight));
		}
	}
	else {
		cc.log("svgHead is empty!!!")
	}

	// parse body now path only
	var svgPathArray = [];
	var cmdDArray = [];
	var cmdPathArray = [];
	var svgPathSegmentArray = SVGFileUtil._regexAll(svgString, SVG_REGEX.PATH_SEGMENT);
	if (svgPathSegmentArray && svgPathSegmentArray.length > 0) {
		for (var i = 0; i < svgPathSegmentArray.length; i ++) {
			var pathDArray = [];
			var svgPathSegment = svgPathSegmentArray[i].replace(SVG_REGEX.LINE_BREAK, "");
    		var d = SVGFileUtil._regexOne(svgPathSegment, SVG_REGEX.PATH_D, 1);
    		if (d) {
    			d = d.replace(/\s*([poiuytrewqasdfghjklmnbvcxzPOIUYTREWQASDFGHJKLMNBVCXZ])\s*/g, "\n$1 ")
					 .replace(/,/g, " ")
					 .replace(/-/g, " -")
					 .replace(/ +/g, " ");
				pathDArray =  SVGPathUtil.parsePath(d)[0];
				cmdDArray =  SVGPathUtil.parsePath(d)[1];
    		}
    		var fill = SVGFileUtil._regexOne(svgPathSegment, SVG_REGEX.PATH_FILL, 1);
    		if (fill) {
    			fill = fill.replace(SVG_REGEX.SPACE, "");
    			fill = SVGFileUtil.parseColor(fill);
    		}
    		var stroke = SVGFileUtil._regexOne(svgPathSegment, SVG_REGEX.PATH_STROKE, 1);
    		if (stroke) {
    			stroke = stroke.replace(SVG_REGEX.SPACE, "");
    			stroke = SVGFileUtil.parseColor(stroke);
    		}
    		var strokeWidth = SVGFileUtil._regexOne(svgPathSegment, SVG_REGEX.PATH_STROKE_WIDTH, 1);
    		if (strokeWidth) {
    			strokeWidth = parseFloat(strokeWidth);
    		}
    		svgPathArray.push(new SVGPathObject(pathDArray, fill, stroke, strokeWidth));
    		cmdPathArray.push(new SVGCMDPathObject(cmdDArray));
		}
	}
	else {
		cc.log("svgPathSegmentArray is empty, nothing to draw");
	}
	svgObject.setPathArray(svgPathArray);
	svgObject.setCMDPathArray(cmdPathArray);

	// debug
	// svgObject._debug();

	return svgObject;
};

/**
 *  create a SvgObject from a given .svg file
 */
SVGFileUtil.createSVGObjectFromFile = function(svgFilePath) {
	var svgString = null;
	if (cc.sys.isNative)
    	svgString = jsb.fileUtils.getStringFromFile(svgFilePath);
   	else
   		svgString = cc.loader._loadTxtSync(svgFilePath);

   	if (svgString == null) 
   		return null;
   	else
   		return SVGFileUtil.createSVGObjectFromString(svgString);
};


