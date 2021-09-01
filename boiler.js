//globals to store objects
var canvas;
var gl;
var rotation = 0.0;
var owidth;
var oheight;
var bFullscreen = false;

//initialize canvas for rendering and setup opengl context
function init()
{
    //ask DOM object for canvas for the particular ID
     canvas = document.querySelector("#glCanvas");
    if(canvas == null)
    {
        alert("failed to load canvas");
        return;
    }

    
    //get webgl context from canvas
     gl = canvas.getContext("webgl");
    
    if(gl === null)
    {
        alert("opengl context not found");
        return;
    }

    owidth = canvas.width;
    oheight = canvas.height;
    gl.viewport.width = owidth;
    gl.viewport.height = oheight;


    //prepare shaders
    const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying lowp vec4 vColor;

    void main()
    {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vColor = aVertexColor;
    }`;

    const fsSource = `
     varying lowp vec4 vColor;
     void main(){
         gl_FragColor = vColor;
     }
    `;

     //Initialize a shader program
     const shaderProgram = initShaderProgram(gl,vsSource,fsSource);

     const programInfo = {
         program : shaderProgram,
         attribLocations: {
             vertexPosition: gl.getAttribLocation(shaderProgram,"aVertexPosition"),  
             vertexColor: gl.getAttribLocation(shaderProgram,"aVertexColor"),  
             
         },
         uniformLocations: {
             projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
             modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),

         },

     };


     //build all the data 
     const buffers = initBuffers();
     var then = 0;

     function render(now)
     {
        now *=0.001;
        const deltaTime = now - then;
        then = now;

        drawScene(programInfo,buffers,deltaTime);

        requestAnimationFrame(render);
     }

     requestAnimationFrame(render);


    //Add listers for event driven window
    window.addEventListener("keydown",keyDown,false);
    window.addEventListener("click",mouseDown,false);
    window.addEventListener("resize",resize,false);

    //some fullscreen globals need initialization based on the current browser
    
    document.fullscreenElement = document.fullscreenElement || document.mozFullscreenElement || document.msFullscreenElement || document.webkitFullscreenDocument;
    document.exitFullscreen = document.exitFullscreen || document.mozExitFullscreen || document.msExitFullscreen || document.webkitExitFullscreen;

}

function initBuffers()
{
    //Create a buffer for triangles' position
    const vertexBuffer = gl.createBuffer();
    //assign this buffer as a data array buffer on GPU
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);

    //create some data
    //Note: here you can load the mesh data aswell !

    const positions = [
         0.0, 1.0,
        -1.0, -1.0,
         1.0, -1.0,
    ];

    //pass on to webgl
    //need to format data into float32 explicitly

    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array(positions),
        gl.STATIC_DRAW);


    const colors = [
        1.0,0.0,0.0,1.0,
        0.0,1.0,0.0,1.0,
        0.0,0.0,1.0,1.0,
    ];

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,new  Float32Array(colors), gl.STATIC_DRAW);

    return{
        position: vertexBuffer,
        color : colorBuffer, 
    };
}


function loadShader(gl,type,source)
{
    //create a shader of right type
    const shader = gl.createShader(type);

    //attach the source
    gl.shaderSource(shader,source);

    //compile the shader
    gl.compileShader(shader);

    //check for errors

    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))
    {
        alert("An error occured during compiling the shaders: " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    //return back the compiled shader 
    return shader;
}


//shader program creater
function initShaderProgram(gl,vsSource,fsSource)
{
    //load the two shaders
    const vertexShader = loadShader(gl,gl.VERTEX_SHADER,vsSource);
    const fragmentShader = loadShader(gl,gl.FRAGMENT_SHADER,fsSource);
    
    //create a shader program
    const shaderProgram = gl.createProgram();

    //attach shaders to the program
    gl.attachShader(shaderProgram,vertexShader);
    gl.attachShader(shaderProgram,fragmentShader);
    gl.linkProgram(shaderProgram);

    // If failed alert

    if(!gl.getProgramParameter(shaderProgram,gl.LINK_STATUS))
    {
        alert("Unable to link the shader program" + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}


//keyboard events handler
function keyDown(event)
{
    switch(event.keyCode)   
    {
        //Ascii for 'f'
        case 70:
        case 102:  
            toggleFullScreen();
            
            break;
        case 21:
            document.exitFullscreen();
            break;
        default:
            break;
    }
}

//handle mouse actions
function mouseDown()
{

}


//function to full screen our window
//Note: this does not work for internet explorer and safari iOS
function toggleFullScreen()
{
    canvas.requestFullscreen = canvas.requestFullscreen || canvas.mozRequestFullscreen || canvas.msRequestFullscreen || canvas.webkitRequestFullscreen;


    if(!document.fullscreenElement)
    {
        canvas.requestFullscreen().then({}).catch(err=>{alert('Error attempting to enable full-screen mode: ${err.message} ($err.name})')});
        bFullscreen = true;
    }
    else
    {

        if(document.exitFullscreen)
        {
            document.exitFullscreen();
            bFullscreen = false;
        }
    }
}

function resize()
{

    if(bFullscreen)
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;    
    }
    else
    {  
        canvas.height = oheight;
        canvas.width = owidth; 
    }
    
    gl.viewport(0,0,canvas.width,canvas.height);
}



function main()
{
   init();
   return;
}



function drawScene(programInfo,buffers,deltaTime)
{

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0); 
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    //clear canvas every frame before drawing
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fieldOfView = 45 * Math.PI / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix,
                    fieldOfView,aspect,zNear,zFar);
    
    const modelViewMatrix = mat4.create();

    mat4.translate(modelViewMatrix,modelViewMatrix,[0.0,0.0,-6.0]);
    mat4.rotate(modelViewMatrix,modelViewMatrix,rotation,[0,1,0]); //rotation along z-axis

    //specify how to access data from the buffer
    {
        const numComponents = 2;    // just x ,y
        const type = gl.FLOAT;      //type primitive
        const normalize = false;    // numbers < 0 or > 1
        const stride = 0;           //for more attributes, you need a jump
        const offset = 0;           //which component after the jump

        gl.bindBuffer(gl.ARRAY_BUFFER,buffers.position);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexPosition
        );

        gl.bindBuffer(gl.ARRAY_BUFFER,buffers.color);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexColor,
            4,
            gl.FLOAT,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexColor
        );


    }

    //what should be the program for current pipeline
    gl.useProgram(programInfo.program);

    //map the data inside the shaders
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    
    gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix);
            
    {
        const offset = 0;
        const vertexCount = 3;
        gl.drawArrays(gl.TRIANGLE_STRIP,offset,vertexCount);
    }

    rotation += deltaTime;
}


window.onload = main;





