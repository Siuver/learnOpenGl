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
        var functionName = "uniform" + values.length + "fv";
        if (functionName in this._gl) {
            var uniformLocation = this._gl.getUniformLocation(this._id, key);
            this._gl[functionName](uniformLocation, values);
        }
    };
    GLProgram.prototype.setMatrix = function (matKey) {
        var values = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            values[_i - 1] = arguments[_i];
        }
        var dimention = Math.sqrt(values.length);
        // 不是整数幂
        if (dimention % 1 !== 0)
            return;
        var functionName = "uniformMatrix" + dimention + "fv";
        if (functionName in this._gl) {
            var uniformLocation = this._gl.getUniformLocation(this._id, matKey);
            this._gl[functionName](uniformLocation, values);
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
    window.gl = gl;
    var vsSource = document.querySelector("#vertex-shader-2d").text;
    var fsSource = document.querySelector("#fragment-shader-2d").text;
    var program = new GLProgram(gl, vsSource, fsSource);
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
    var image = new Image();
    image.src = "img.jpeg";
    image.onload = function () {
        image.onload = undefined;
        var texture = createTexture(gl);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        var interval = 1000 / FPS;
        setInterval(function () {
            resize(canvas);
            var width = canvas.width;
            var height = canvas.height;
            gl.viewport(0, 0, width, height);
            gl.clearColor(0.2, 0.3, 0.3, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            program.activate();
            // program.setUniformValue("u_resolution", width, height);
            gl.uniform2f(gl.getUniformLocation(program.id, "u_resolution"), width, height);
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
            // program.activateAttribPointer();
            gl.vertexAttribPointer(gl.getAttribLocation(program.id, "a_position"), 2, gl.FLOAT, false, 4 * 4, 0);
            gl.vertexAttribPointer(gl.getAttribLocation(program.id, "a_texCoord"), 2, gl.FLOAT, false, 4 * 4, 2 * 4);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        }, interval);
    };
}
