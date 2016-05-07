
https://developer.mozilla.org/en-US/docs/Web/SVG

◆ SVG

■ Scalable Vector Graphics
■ An XML for describing two-dimensional vector graphics
■ Shape elements
    <circle>
    <ellipse>
    <line>
    <path>
    <polygon>
    <polyline>
    <rect>


■ Structural elements
    <svg>
    
    <svg width="150" height="100" viewBox="0 0 3 2">
        ...
    </svg>

    Specific attributes

    version
    baseProfile
    x
    y
    width
    height
    preserveAspectRatio
    contentScriptType
    contentStyleType
    viewBox

■ Container elements
    <g>

    <g stroke="green" fill="white" stroke-width="5">
        <circle cx="25" cy="25" r="15" />
        <circle cx="40" cy="25" r="15" />
    </g>


◆ <path>

■ All the basic shapes can be created with a path element.
■ Attribute definitions
    d = "path data"

■ Command
        
    Uppercase: absolute
    Lowercase: relative

    Command    Name                        Parameters
    M / m      moveto                      (x y)+  
    Z / z      closepath                   -
    L / l      lineto                      (x y)+
    H / h      horizontal lineto           x+
    V / v      vertical lineto             y+
    C / c      curveto                     (x1 y1 x2 y2 x y)+
    S / s      smooth curveto              (x2 y2 x y)+
    Q / q      quadratic curveto           (x1 y1 x y)+
    T / t      smooth quadratic curveto    (x y)+
    A / a      elliptical arc              (rx ry xAxisRotation LargeArcFlag SweepFlag x y)+
    

■ Structure

<g>
    <path d="M...z M...z M...z ..."/>
    <path d="M...z M...z M...z ..."/>
    <path d="M...z M...z M...z ..."/>
    <!-- ... -->
</g>

              ┏ d1
     ┏ path1 ━╋ d2
     ┃        ┗ d3
     ┃
     ┃        ┏ d1
SVG ━╋ path2 ━╋ d2
     ┃        ┗ d3
     ┃
     ┃        ┏ d1
     ┗ path3 ━╋ d2
              ┗ d3


                            ┏ point array : (1,2), (2,3) ...
           ┏ SVGPathObject ━╋ point array
           ┃                ┗ point array
           ┃
           ┃                ┏ point array
SVGObject ━╋ SVGPathObject ━╋ point array
           ┃                ┗ point array
           ┃
           ┃                ┏ point array
           ┗ SVGPathObject ━╋ point array
                            ┗ point array


                               ┏ SVGCMDObject : DOT (1,2), LINE (3,3) (5,5) ...
           ┏ SVGCMDPathObject ━╋ SVGCMDObject
           ┃                   ┗ SVGCMDObject
           ┃
           ┃                   ┏ SVGCMDObject
SVGObject ━╋ SVGCMDPathObject ━╋ SVGCMDObject
           ┃                   ┗ SVGCMDObject
           ┃
           ┃                   ┏ SVGCMDObject
           ┗ SVGCMDPathObject ━╋ SVGCMDObject
                               ┗ SVGCMDObject








