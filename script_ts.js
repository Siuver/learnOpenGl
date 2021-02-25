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
function createTexture(gl) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return tex;
}
function getProgectionMatrix(fov, aspect, near, far) {
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
function getClipMatrix(width, height) {
    return [
        2 / width, 0, 0, 0,
        0, -2 / height, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
}
var GLProgram = /** @class */ (function () {
    function GLProgram(gl, vsSrc, fsSrc) {
        this._gl = gl;
        var vertexShader = this.createShader(vsSrc, gl.VERTEX_SHADER);
        var fragmentShader = this.createShader(fsSrc, gl.FRAGMENT_SHADER);
        if (!vertexShader || !fragmentShader) {
            return;
        }
        var program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        var linkStatus = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (!linkStatus) {
            console.log("program创建失败");
            gl.deleteProgram(program);
            return;
        }
        this._id = program;
        this._onProgramCreated();
    }
    Object.defineProperty(GLProgram.prototype, "id", {
        get: function () {
            return this._id;
        },
        enumerable: true,
        configurable: true
    });
    GLProgram.prototype.activate = function () {
        this._gl.useProgram(this._id);
    };
    GLProgram.prototype.activateAttribPointer = function () {
        var _this = this;
        var gl = this._gl;
        this._attributes.forEach(function (info) {
            var location = gl.getAttribLocation(_this.id, info.name);
            gl.enableVertexAttribArray(location);
            if (info.name === "a_position") {
                gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 5 * 4, 0);
            }
            else if (info.name === "a_texCoord") {
                gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 5 * 4, 3 * 4);
            }
        });
    };
    GLProgram.prototype.setUniformValue = function (key) {
        var values = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            values[_i - 1] = arguments[_i];
        }
        var length = values.length;
        if (Array.isArray(values[0])) {
            length = 1;
            values = values[0];
        }
        var functionName = "uniform" + length + "fv";
        if (functionName in this._gl) {
            var uniformLocation = this._gl.getUniformLocation(this._id, key);
            this._gl[functionName](uniformLocation, values);
        }
    };
    GLProgram.prototype.setMatrix = function (matKey, values) {
        var dimention = Math.sqrt(values.length);
        // 不是整数幂
        if (dimention % 1 !== 0)
            return;
        var functionName = "uniformMatrix" + dimention + "fv";
        if (functionName in this._gl) {
            var uniformLocation = this._gl.getUniformLocation(this._id, matKey);
            this._gl[functionName](uniformLocation, false, values);
        }
    };
    GLProgram.prototype.createShader = function (source, type) {
        var gl = this._gl;
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        var compileStatus = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (compileStatus) {
            return shader;
        }
        else {
            console.log("shader编译失败");
            gl.deleteShader(shader);
            return null;
        }
    };
    GLProgram.prototype._onProgramCreated = function () {
        // this._extractUniforms();
        this._extractAttribute();
    };
    GLProgram.prototype._extractUniforms = function () {
        var gl = this._gl;
        var totalUniforms = gl.getProgramParameter(this._id, gl.ACTIVE_UNIFORMS);
        for (var i = 0; i < totalUniforms; i++) {
            var uniformData = gl.getActiveUniform(this._id, i);
            // console.log(uniformData);
        }
    };
    GLProgram.prototype._extractAttribute = function () {
        this._attributes = [];
        var gl = this._gl;
        var totalAttributes = gl.getProgramParameter(this._id, gl.ACTIVE_ATTRIBUTES);
        for (var i = 0; i < totalAttributes; i++) {
            var attribData = gl.getActiveAttrib(this._id, i);
            this._attributes.push(attribData);
        }
    };
    return GLProgram;
}());
var FPS = 60;
function main() {
    var canvas = document.querySelector("#canvas");
    var gl = canvas.getContext("webgl");
    this.initSelection();
    window.gl = gl;
    var vsSource = document.querySelector("#vertex-shader-2d").text;
    // let fsSource = (<any>document.querySelector("#fragment-shader-2d")).text;
    var fsSource = document.querySelector("#fragment-shader-2d-wave").text;
    var program = new GLProgram(gl, vsSource, fsSource);
    if (!program.id)
        return;
    var vertices = [
        541.5, 251.5, 0, 1.0, 1.0,
        29.5, 251.5, 0, 0.0, 1.0,
        29.5, 763.5, 0, 0.0, 0.0,
        541.5, 763.5, 0, 1.0, 0.0
    ];
    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    var indices = [
        0, 1, 2,
        0, 2, 3
    ];
    var ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(indices), gl.STATIC_DRAW);
    var image = new Image();
    image.src = "lenna.jpg";
    image.onload = function () {
        image.onload = undefined;
        var texture = createTexture(gl);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        var select = document.querySelector("#select");
        var interval = 1000 / FPS;
        setInterval(function () {
            resize(canvas);
            var width = canvas.width;
            var height = canvas.height;
            gl.viewport(0, 0, width, height);
            gl.clearColor(0.2, 0.3, 0.3, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            program.activate();
            program.setUniformValue("u_resolution", width, height);
            program.setMatrix("u_clipMat", getClipMatrix(width, height));
            program.setUniformValue("u_imageSize", image.width, image.height);
            program.setUniformValue("u_time", Date.now() / 10000);
            // program.setUniformValue("u_kernal", kernals[select.options[select.selectedIndex].value]);
            // program.setUniformValue("kernalWeight", 1);
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
            program.activateAttribPointer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        }, interval);
    };
}
var kernals = {
    normal: [
        0, 0, 0,
        0, 1, 0,
        0, 0, 0
    ],
    gaussianBlur: [
        0.045, 0.122, 0.045,
        0.122, 0.332, 0.122,
        0.045, 0.122, 0.045
    ],
    gaussianBlur2: [
        1, 2, 1,
        2, 4, 2,
        1, 2, 1
    ],
    gaussianBlur3: [
        0, 1, 0,
        1, 1, 1,
        0, 1, 0
    ],
    unsharpen: [
        -1, -1, -1,
        -1, 9, -1,
        -1, -1, -1
    ],
    sharpness: [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ],
    sharpen: [
        -1, -1, -1,
        -1, 16, -1,
        -1, -1, -1
    ],
    edgeDetect: [
        -0.125, -0.125, -0.125,
        -0.125, 1, -0.125,
        -0.125, -0.125, -0.125
    ],
    edgeDetect2: [
        -1, -1, -1,
        -1, 8, -1,
        -1, -1, -1
    ],
    edgeDetect3: [
        -5, 0, 0,
        0, 0, 0,
        0, 0, 5
    ],
    edgeDetect4: [
        -1, -1, -1,
        0, 0, 0,
        1, 1, 1
    ],
    edgeDetect5: [
        -1, -1, -1,
        2, 2, 2,
        -1, -1, -1
    ],
    edgeDetect6: [
        -5, -5, -5,
        -5, 39, -5,
        -5, -5, -5
    ],
    sobelHorizontal: [
        1, 2, 1,
        0, 0, 0,
        -1, -2, -1
    ],
    sobelVertical: [
        1, 0, -1,
        2, 0, -2,
        1, 0, -1
    ],
    previtHorizontal: [
        1, 1, 1,
        0, 0, 0,
        -1, -1, -1
    ],
    previtVertical: [
        1, 0, -1,
        1, 0, -1,
        1, 0, -1
    ],
    boxBlur: [
        0.111, 0.111, 0.111,
        0.111, 0.111, 0.111,
        0.111, 0.111, 0.111
    ],
    triangleBlur: [
        0.0625, 0.125, 0.0625,
        0.125, 0.25, 0.125,
        0.0625, 0.125, 0.0625
    ],
    emboss: [
        -2, -1, 0,
        -1, 1, 1,
        0, 1, 2
    ]
};
var defaultKernal = "normal";
function initSelection() {
    var ui = document.querySelector("#ui");
    var select = document.createElement("select");
    select.id = "select";
    for (var key in kernals) {
        var item = kernals[key];
        var option = document.createElement("option");
        option.value = key;
        if (option.value === defaultKernal) {
            option.selected = true;
        }
        option.appendChild(document.createTextNode(key));
        select.appendChild(option);
    }
    ui.appendChild(select);
}
