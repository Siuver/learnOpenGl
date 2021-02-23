function resize(canvas: HTMLCanvasElement) {
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

function createTexture(gl: WebGLRenderingContext) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    return tex;
}

type Uniforms = { [key: string]: WebGLUniformLocation }

class GLProgram {
    private _gl: WebGLRenderingContext;

    private _attributes: WebGLActiveInfo[]

    private _id: WebGLProgram;
    public get id(): WebGLProgram {
        return this._id;
    }

    constructor(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string) {
        this._gl = gl;

        let vertexShader = this.createShader(vsSrc, gl.VERTEX_SHADER);
        let fragmentShader = this.createShader(fsSrc, gl.FRAGMENT_SHADER);

        if (!vertexShader || !fragmentShader) {
            return;
        }

        let program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        let linkStatus = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (!linkStatus) {
            console.log("program创建失败");
            gl.deleteProgram(program);
            return;
        }

        this._id = program;
        this._onProgramCreated();
    }

    public activate(): void {
        this._gl.useProgram(this._id);
    }

    public activateAttribPointer(): void {
        let gl = this._gl;
        this._attributes.forEach((info) => {
            let location = gl.getAttribLocation(this.id, info.name);
            if (info.name === "a_position") {
                gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 5 * 4, 0);
            } else if (info.name === "a_texCoord") {
                gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 5 * 4, 3 * 4);
            }
        })
    }

    public setUniformValue(key: string, ...values: number[]): void {
        let functionName = `uniform${values.length}fv`;
        if (functionName in this._gl) {
            let uniformLocation = this._gl.getUniformLocation(this._id, key);
            this._gl[functionName](uniformLocation, values);
        }
    }

    public setMatrix(matKey: string, ...values: number[]): void {
        let dimention = Math.sqrt(values.length);
        // 不是整数幂
        if (dimention % 1 !== 0) return;

        let functionName = `uniformMatrix${dimention}fv`;
        if (functionName in this._gl) {
            let uniformLocation = this._gl.getUniformLocation(this._id, matKey);
            this._gl[functionName](uniformLocation, values);
        }
    }

    protected createShader(source: string, type: number): WebGLShader {
        let gl = this._gl;
        let shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        let compileStatus = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (compileStatus) {
            return shader;
        } else {
            console.log("shader编译失败");
            gl.deleteShader(shader);
            return null;
        }
    }

    protected _onProgramCreated(): void {
        // this._extractUniforms();
        this._extractAttribute();
    }

    protected _extractUniforms(): void {
        let gl = this._gl;
        let totalUniforms = gl.getProgramParameter(this._id, gl.ACTIVE_UNIFORMS);

        for (let i = 0; i < totalUniforms; i++) {
            let uniformData = gl.getActiveUniform(this._id, i);
            // console.log(uniformData);
        }
    }

    protected _extractAttribute(): void {
        this._attributes = [];

        let gl = this._gl;
        let totalAttributes = gl.getProgramParameter(this._id, gl.ACTIVE_ATTRIBUTES);

        for (let i = 0; i < totalAttributes; i++) {
            let attribData = gl.getActiveAttrib(this._id, i);
            this._attributes.push(attribData);
        }
    }
}

let FPS = 60

function main() {
    let canvas: HTMLCanvasElement = document.querySelector("#canvas");
    let gl: WebGLRenderingContext = canvas.getContext("webgl");

    (<any>window).gl = gl;

    let vsSource = (<any>document.querySelector("#vertex-shader-2d")).text;
    let fsSource = (<any>document.querySelector("#fragment-shader-2d")).text;
    let program = new GLProgram(gl, vsSource, fsSource);

    let vertices = [
        400, 200, 1.0, 1.0,
        100, 200, 0.0, 1.0,
        100, 600, 0.0, 0.0,
        400, 600, 1.0, 0.0
    ];
    let vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    let indices = [
        0, 1, 2,
        0, 2, 3,
    ];
    let ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(indices), gl.STATIC_DRAW);

    let image = new Image();
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
    }
}
