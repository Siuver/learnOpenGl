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

function getProgectionMatrix(fov: number, aspect: number, near: number, far: number): number[] {
    let top = near * Math.tan(fov / 2);
    let bottom = -top;
    let right = top * aspect;
    let left = -right;
    return [
        (2 * near) / (right - left), 0, (right + left) / (right - left), 0,
        0, (2 * near) / (top - bottom), (top + bottom) / (top - bottom), 0,
        0, 0, (near + far) / (near - far), (2 * near * far) / (near - far),
        0, 0, -1, 0
    ];
}

function getClipMatrix(width: number, height: number): number[] {
    return [
        2 / width, 0, 0, -1,
        0, -2 / height, 0, 1,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]
}

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
            gl.enableVertexAttribArray(location);
            if (info.name === "a_position") {
                gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 5 * 4, 0);
            } else if (info.name === "a_texCoord") {
                gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 5 * 4, 3 * 4);
            }
        })
    }

    public setUniformValue(key: string, ...values: any[]): void {
        let length = values.length;
        if (Array.isArray(values[0])) {
            length = 1;
            values = values[0];
        }
        let functionName = `uniform${length}fv`;
        if (functionName in this._gl) {
            let uniformLocation = this._gl.getUniformLocation(this._id, key);
            this._gl[functionName](uniformLocation, values);
        }
    }

    public setMatrix(matKey: string, values: number[]): void {
        let dimention = Math.sqrt(values.length);
        // 不是整数幂
        if (dimention % 1 !== 0) return;

        let functionName = `uniformMatrix${dimention}fv`;
        if (functionName in this._gl) {
            let uniformLocation = this._gl.getUniformLocation(this._id, matKey);
            this._gl[functionName](uniformLocation, false, values);
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

    this.initSelection();

    (<any>window).gl = gl;

    let vsSource = (<any>document.querySelector("#vertex-shader-2d")).text;
    // let fsSource = (<any>document.querySelector("#fragment-shader-2d")).text;
    let fsSource = (<any>document.querySelector("#fragment-shader-2d-wave")).text;
    let program = new GLProgram(gl, vsSource, fsSource);
    if (!program.id) return;

    let vertices = [
        541.5, 251.5, 0, 1.0, 1.0,
        29.5, 251.5, 0, 0.0, 1.0,
        29.5, 763.5, 0, 0.0, 0.0,
        541.5, 763.5, 0, 1.0, 0.0
    ];
    let vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    let indices = [
        0, 1, 2,
        0, 2, 3
    ];
    let ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(indices), gl.STATIC_DRAW);

    let image = new Image();
    image.src = "lenna.jpg";
    image.onload = () => {
        image.onload = undefined;

        var texture = createTexture(gl);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        let select: HTMLSelectElement = document.querySelector("#select");

        var interval = 1000 / FPS;
        setInterval(() => {
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
    }
}

let kernals = {
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
}
let defaultKernal = "normal";

function initSelection(): void {
    let ui = document.querySelector("#ui") as HTMLDivElement;
    let select: HTMLSelectElement = document.createElement("select");
    select.id = "select";

    for (let key in kernals) {
        let item = kernals[key];
        var option: HTMLOptionElement = document.createElement("option");
        option.value = key;

        if (option.value === defaultKernal) {
            option.selected = true;
        }

        option.appendChild(document.createTextNode(key));
        select.appendChild(option);
    }
    ui.appendChild(select);
}
