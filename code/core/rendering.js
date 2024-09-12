class VertexBuffer {
    constructor() {
        this.buffer = null;
    }
    allocAt(data, byteOffset = 0) {
        if (this.buffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, byteOffset, data);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        } else {
            this.buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        }
    }
    destroy() {
        gl.deleteBuffer(this.buffer);
        this.buffer = null;
    }
}

class MeshAtlas {
    constructor() {
        this.vertexBuffer = null;
        this.allocatedVertices = 0;
        this.meshList = [];
        this.meshes = {};
    }

    addCube(name, width, height, depth) {
        const hw = width, hh = height, hd = depth;
        this.addMesh(name, [
            -hw, -hh, +hd, +hw, -hh, +hd, +hw, +hh, +hd,
            -hw, -hh, +hd, +hw, +hh, +hd, -hw, +hh, +hd,
            +hw, -hh, -hd, -hw, -hh, -hd, -hw, +hh, -hd,
            +hw, -hh, -hd, -hw, +hh, -hd, +hw, +hh, -hd,
            -hw, -hh, -hd, -hw, -hh, +hd, -hw, +hh, +hd,
            -hw, -hh, -hd, -hw, +hh, +hd, -hw, +hh, -hd,
            +hw, -hh, +hd, +hw, -hh, -hd, +hw, +hh, -hd,
            +hw, -hh, +hd, +hw, +hh, -hd, +hw, +hh, +hd,
            -hw, +hh, +hd, +hw, +hh, +hd, +hw, +hh, -hd,
            -hw, +hh, +hd, +hw, +hh, -hd, -hw, +hh, -hd,
            -hw, -hh, -hd, +hw, -hh, -hd, +hw, -hh, +hd,
            -hw, -hh, -hd, +hw, -hh, +hd, -hw, -hh, +hd
        ]);
    }
    

    addSphere(name, radius, widthSegments, heightSegments) {
        const uniqueVertices = [];
        const vertices = [];
        const PI2 = PI * 2;
        const grid = [];
        let idx = 0;
        for (let y = 0; y <= heightSegments; ++y) {
            const v = y / heightSegments;
            const row = [];
            for (let x = 0; x <= widthSegments; ++x) {
                const u = x / widthSegments;
                const vx = -radius * cos(u * PI2) * sin(v * PI);
                const vy = radius * cos(v * PI);
                const vz = radius * sin(u * PI2) * sin(v * PI);
                uniqueVertices.push(vx, vy, vz);
                row.push(idx++);
            }
            grid.push(row);
        }
        const indices = [];
        for ( let iy = 0; iy < heightSegments; iy ++ ) {
            for ( let ix = 0; ix < widthSegments; ix ++ ) {
                const a = grid[ iy ][ ix + 1 ];
                const b = grid[ iy ][ ix ];
                const c = grid[ iy + 1 ][ ix ];
                const d = grid[ iy + 1 ][ ix + 1 ];

                if ( iy !== 0) {
                    indices.push( a, b, d );
                }
                if ( iy !== heightSegments - 1) {
                    indices.push( b, c, d );
                } 
            }
        }
        for (let i = 0; i < indices.length; i += 3) {
            const a = indices[i + 0] * 3;
            const b = indices[i + 1] * 3;
            const c = indices[i + 2] * 3;

            vertices.push(
                uniqueVertices[a + 0],
                uniqueVertices[a + 1],
                uniqueVertices[a + 2]
            );
            vertices.push(
                uniqueVertices[b + 0],
                uniqueVertices[b + 1],
                uniqueVertices[b + 2]
            );
            vertices.push(
                uniqueVertices[c + 0],
                uniqueVertices[c + 1],
                uniqueVertices[c + 2]
            );
        }
        this.addMesh(name, vertices);
    }

    addMesh(name, data) {
        const vertexCount = data.length / 3;
        this.meshList.push({
            name: name,
            startVertex: this.allocatedVertices,
            vertices: data,
            vertexCount: vertexCount
        });
        this.allocatedVertices += vertexCount;
    }

    uploadToGPU() {
        const vertices = [];
        for (const mesh of this.meshList) {
            this.meshes[mesh.name] = {
                startVertex: mesh.startVertex,
                vertexCount: mesh.vertexCount
            };
            vertices.push(...mesh.vertices)
        }
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        this.meshList = [];
    }

    bind(program) {
        const positionLocation = gl.getAttribLocation(program, 'p');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    }

    draw(name) {
        const mesh = this.meshes[name];
        gl.drawArrays(gl.TRIANGLES, mesh.startVertex, mesh.vertexCount);
    }
}

class Camera {
    constructor(position, projectionMatrix) {
        this.position = position;
        this.front = [0, 0, -1];
        this.direction = [0, 0, 0];
        this.projectionMatrix = projectionMatrix;
        this.lookAtTarget = null;
        this.lookAtOffset = [0, 0, 0];
    }
    update() {
        if (this.lookAtTarget) {
            this.position[0] = this.lookAtTarget[0] + this.lookAtOffset[0];
            this.position[1] = this.lookAtTarget[1] + this.lookAtOffset[1];
            this.position[2] = this.lookAtTarget[2] + this.lookAtOffset[2];
        }
    }
    getLookAtDir() {
        if (this.lookAtTarget) {
            return Vec3.norm(Vec3.sub(this.lookAtTarget, this.position));
        }
        return this.front;
    }
    pointToDir(dir) {
        this.direction = dir;
        this.front = Vec3.norm(this.direction);
    }
    follow(target, offset) {
        this.lookAtTarget = target;
        this.lookAtOffset = offset;
    }
}

class SceneRenderer {
    constructor() {
        const compileShader = (type, source) => {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, '#extension GL_OES_standard_derivatives : enable\n' + 'precision highp float;'+ source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                const message = gl.getShaderInfoLog(shader);
                if (message) {
                    throw message;
                } else {
                    throw 'Failed to compile shader';
                }
            }
            return shader;
        };
        const compileProgram = (vs, fs) => {
            const program = gl.createProgram();
            gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vs));
            gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fs));
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                const message = gl.getProgramInfoLog(program);
                if (message) {
                    throw message;
                } else {
                    throw "Failed to link program";
                }
            }
            return program;
        };

        this.extensions = {};
        gl.getSupportedExtensions().forEach((name) => {
            this.extensions[name] = gl.getExtension(name);
        });

        this.scenePass = compileProgram(`$(SHADERS)/scenePass.vs`, `$(SHADERS)/scenePass.fs`);
        this.shadowPass = compileProgram(`$(SHADERS)/shadowPass.vs`, `$(SHADERS)/shadowPass.fs`);
        this.shadowMapTarget = this.createDepthStencilTarget(4096, 4096);
        this.shadowMapViewProjectionMatrix = null;
        this.scenePassTarget = this.createRenderTarget(canvas.width, canvas.height, gl.FLOAT);
        this.meshAtlas = new MeshAtlas();
        this.meshAtlas.addCube(0, 1, 1, 1);
        this.meshAtlas.addSphere(1, 1, 64, 64);
        this.meshAtlas.addMesh(2, [-1,1,0,-1,-3,0.0,3,1,0.0,]);
        this.meshAtlas.uploadToGPU();
        this.displayList = [];
        this.dirLight = [0.0001, -1, 0.001];
        this.camera = new Camera([0, 0, 0], Mat4.makePersp(degToRad(20), canvas.width / canvas.height, 0.01, 1000.0));
        this.lastViewMatrix = null;
        this.lastProjMatrix = null;
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(0, 0, 0, 1);
    }

    drawCube(transform, albedo = [1, 1, 1], roughness = 1, metallic = 0.1) {
        this.draw(0, transform, albedo, roughness, metallic);
    }

    drawSphere(transform, albedo = [1, 1, 1], roughness = 1, metallic = 0.1) {
        this.draw(1, transform, albedo, roughness, metallic);
    }

    draw(name, transform, albedo = [1, 1, 1], roughness = 1, metallic = 0.1) {
        this.displayList.push({ name, transform, albedo, roughness, metallic });
    }

    createRGBATexture(width, height, format, data) {
        const texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, format, data);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return { texture, width, height };
    }

    createDepthStencilTarget(width, height) {
        const texture = this.createRGBATexture(width, height, gl.FLOAT, null);
        const framebuffer = gl.createFramebuffer();
        const renderbuffer = gl.createRenderbuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, width, height);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.texture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return { texture, framebuffer, renderbuffer };
    }

    createRenderTarget(width, height, type = gl.UNSIGNED_BYTE) {
        const texture = this.createRGBATexture(width, height, type, null);
        const framebuffer = gl.createFramebuffer();
        const renderbuffer = gl.createRenderbuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, width, height);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.texture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return { texture, framebuffer, renderbuffer };
    }

    renderView(program, viewProjection) {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'V'), false, viewProjection);
        for (const sceneElem of this.displayList) {
            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'X'), false, sceneElem.transform);
            gl.uniform3fv(gl.getUniformLocation(program, 'A'), sceneElem.albedo);
            gl.uniform2fv(gl.getUniformLocation(program, 'M'), [sceneElem.roughness, sceneElem.metallic]);
            this.meshAtlas.draw(sceneElem.name);
        }
    }

    renderShadowMap() {
        const shadowSize = 128;
        this.shadowMapViewProjectionMatrix = Mat4.mul(Mat4.lookAt([0, 0, 0], Vec3.norm(this.dirLight), [0, 1, 0]), Mat4.makeOrtho(-shadowSize, shadowSize, -shadowSize, shadowSize, -500, 500))
        gl.useProgram(this.shadowPass);
        this.meshAtlas.bind(this.shadowPass);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowMapTarget.framebuffer);
        gl.viewport(0, 0, this.shadowMapTarget.texture.width, this.shadowMapTarget.texture.height);
        gl.clearColor(1, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        this.renderView(this.shadowPass, this.shadowMapViewProjectionMatrix);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 1);
    }

    renderColor() {
        let proj = this.camera.projectionMatrix;
        let view = null;
        if (this.camera.lookAtTarget) {
            view = Mat4.lookAt(this.camera.position, this.camera.lookAtTarget, [0, 1, 0]);
        } else {
            view = Mat4.lookAt(this.camera.position, Vec3.add(this.camera.position, this.camera.front), [0, 1, 0]);
        }
        let vp = Mat4.mul(view, proj);
        gl.useProgram(this.scenePass);
        this.meshAtlas.bind(this.scenePass);
        // gl.bindFramebuffer(gl.FRAMEBUFFER, this.scenePassTarget.framebuffer);
        gl.clearColor(240/255,198/255,70/255, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.scenePass, 'N'), false, this.shadowMapViewProjectionMatrix);
        gl.uniform3fv(gl.getUniformLocation(this.scenePass, 'L'), this.dirLight);
        gl.uniform3fv(gl.getUniformLocation(this.scenePass, 'E'), this.camera.position);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.shadowMapTarget.texture.texture);
        this.renderView(this.scenePass, vp);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.lastViewMatrix = view;
        this.lastProjMatrix = proj;
    }

    render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        this.renderShadowMap();
        this.renderColor();
        this.displayList.length = 0;
    }

}
