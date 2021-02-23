function resize(canvas) {
    // var ratio = window.devicePixelRatio;
    var ratio = 1;

    var displayWidth = Math.floor(canvas.clientWidth * ratio);
    var displayHeight = Math.floor(canvas.clientHeight * ratio);

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;

        console.log("canvas resize to " + canvas.width + " x " + canvas.height);
    }
}

function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    } else {
        console.log("shader创建失败");
        gl.deleteShader(shader);
    }
}

function createProgram(gl, vsSource, fsSource) {
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

    if (!vertexShader || !fragmentShader) {
        return;
    }

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }

    console.log("program创建失败");
    gl.deleteProgram(program);
}

function createTexture(gl) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    return tex;
}

function getPerspectiveMatrix(fov, aspect, near, far) {
    var top = near * Math.tan(fov / 2);
    var bottom = -top;
    var right = top * aspect;
    var left = -right;

    return [
        (2 * near) / (right - left), 0, (right + left) / (right - left), 0,
        0, (2 * near) / (top - bottom), (top + bottom) / (top - bottom), 0,
        0, 0, (near + far) / (near - far), (2 * near * far) / (near - far),
        0, 0, -1, 0
    ];
}

var FPS = 30;

// 卷积核
var kernals = {
    'normal': [
        0, 0, 0,
        0, 1, 0,
        0, 0, 0,
    ],
    'test1': [
        1, 1, 1,
        1, 1, 1,
        1, 1, 1
    ]
}

function main() {
    var canvas = document.querySelector("#canvas");
    var gl = canvas.getContext("webgl");
    window.gl = gl;

    // init

    // 创建program
    var vsSource = document.querySelector("#vertex-shader-2d").text;
    var fsSource = document.querySelector("#fragment-shader-2d").text;
    var program = createProgram(gl, vsSource, fsSource);

    if (!program) {
        return;
    }

    var posAttribLocation = gl.getAttribLocation(program, "a_position");
    var texCoordAttribLocation = gl.getAttribLocation(program, "a_texCoord");

    var resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
    var projectionUniformLocation = gl.getUniformLocation(program, "u_projection");
    

    // var colorUniformLocation = gl.getUniformLocation(program, "u_color")

    var vertices = [
        400, 200, 1.0, 1.0,
        100, 200, 0.0, 1.0,
        100, 600, 0.0, 0.0,
        400, 600, 1.0, 0.0
    ];
    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    var indices = [
        0, 1, 2,
        0, 2, 3,
    ];
    var ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(indices), gl.STATIC_DRAW);

    // draw

    var image = new Image();
    image.src = "img.jpeg";
    image.onload = () => {
        image.onload = undefined;

        var texture = createTexture(gl);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        var interval = 1000 / FPS;
        setInterval(() => {
            resize(canvas);
            var width = canvas.width;
            var height = canvas.height;
            gl.viewport(0, 0, width, height);
            gl.clearColor(0.2, 0.3, 0.3, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.useProgram(program);

            // var proj = getPerspectiveMatrix(Math.PI / 180 * 45, width / height, 0.1, 100);
            // gl.uniform4fv(projectionUniformLocation, )

            gl.uniform2f(resolutionUniformLocation, width, height);
            gl.uniform2f()

            gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
            gl.enableVertexAttribArray(posAttribLocation);
            gl.vertexAttribPointer(posAttribLocation, 2, gl.FLOAT, false, 4 * 4, 0);

            gl.enableVertexAttribArray(texCoordAttribLocation);
            gl.vertexAttribPointer(texCoordAttribLocation, 2, gl.FLOAT, false, 4 * 4, 2 * 4)

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        }, interval);
    }

}