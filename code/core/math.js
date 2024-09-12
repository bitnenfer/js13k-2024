const cos = Math.cos;
const sin = Math.sin;
const sqrt = Math.sqrt;
const abs = Math.abs;
const PI = Math.PI;
const tan = Math.tan;
const sign = Math.sign;
const random = Math.random;
const atan2 = Math.atan2;
const degToRad = (d) => d * PI / 180;
const Vec3 = {
    make: (x, y, z) => [x, y, z],
    equals: (a, b) => a[0] == b[0] && a[1] == b[1] && a[2] == b[2],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    dist: (a, b) => {
        return sqrt(
                (a[0] - b[0]) * (a[0] - b[0]) +
                (a[1] - b[1]) * (a[1] - b[1]) +
                (a[2] - b[2]) * (a[2] - b[2])
            );        
    },
    lenSqr: (a) => Vec3.dot(a, a),
    len: (a) => sqrt(Vec3.lenSqr(a)),
    add: (a, b) => [ a[0] + b[0], a[1] + b[1] , a[2] + b[2] ],
    sub: (a, b) => [ a[0] - b[0], a[1] - b[1] , a[2] - b[2] ],
    mul: (a, b) => [ a[0] * b[0], a[1] * b[1] , a[2] * b[2] ],
    div: (a, b) => [ a[0] / b[0], a[1] / b[1] , a[2] / b[2] ],
    scale: (v, s) => [ v[0] * s, v[1] * s, v[2] * s ],
    cross: (a, b) => [ a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0] ],
    reflect: (a, n) => {
        const dp = 2 * Vec3.dot(a, n);
        const x = Vec3.scale(n, dp);
        const r = Vec3.sub(a, x);
        return r;
    },
    norm: (a) => {
        const len = Vec3.len(a);
        if (len != 0) {
            return [
                a[0] / len,
                a[1] / len,
                a[2] / len
            ];
        }
        return [
            a[0],
            a[1],
            a[2]
        ];
    },
    transform: (m, a) => {
        let x = a[0],
            y = a[1],
            z = a[2],
            w = 1;
        const out = [0, 0, 0, 0];
        out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
        out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
        out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
        out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
        return out;
    }
};
const Mat4 = {
    make: (data) => data,
    makeIdent: () => [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ],
    lookAt: (eye, center, up) => {
        let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
        const E = 0.000001, 
            eyex = eye[0], 
            eyey = eye[1], 
            eyez = eye[2],
            upx = up[0], 
            upy = up[1], 
            upz = up[2],
            centerx = center[0], 
            centery = center[1], 
            centerz = center[2];
        if (abs(eyex - centerx) < E && abs(eyey - centery) < E && abs(eyez - centerz) < E) {
            return Mat4.makeIdent();
        }
        z0 = eyex - centerx;
        z1 = eyey - centery;
        z2 = eyez - centerz;
        len = 1 / sqrt(z0 * z0 + z1 * z1 + z2 * z2);
        z0 *= len;
        z1 *= len;
        z2 *= len;
        x0 = upy * z2 - upz * z1;
        x1 = upz * z0 - upx * z2;
        x2 = upx * z1 - upy * z0;
        len = sqrt(x0 * x0 + x1 * x1 + x2 * x2);
        if (len === 0) {
            x0 = 0;
            x1 = 0; 
            x2 = 0;
        } else  {
            len = 1 / len;
            x0 *= len;
            x1 *= len;
            x2 *= len;
        }
        y0 = z1 * x2 - z2 * x1;
        y1 = z2 * x0 - z0 * x2;
        y2 = z0 * x1 - z1 * x0;
        len = sqrt(y0 * y0 + y1 * y1 + y2 * y2);
        if (len === 0) {
            y0 = 0;
            y1 = 0; 
            y2 = 0;
        } else {
            len = 1 / len;
            y0 *= len;
            y1 *= len;
            y2 *= len;
        }
        return [
            x0, y0, z0, 0,
            x1, y1, z1, 0,
            x2, y2, z2, 0,
            -(x0 * eyex + x1 * eyey + x2 * eyez),
            -(y0 * eyex + y1 * eyey + y2 * eyez),
            -(z0 * eyex + z1 * eyey + z2 * eyez),
            1
        ];
    },
    makeOrtho: (left, right, bottom, top, nearBound, farBound) => {
        const lr = 1 / (left - right), bt = 1 / (bottom - top), nf = 1 / (nearBound - farBound);
        return [
            -2 * lr, 0, 0, 0,
            0, -2 * bt, 0, 0,
            0, 0, 2 * nf, 0,
            (left + right) * lr, (top + bottom) * bt, (nearBound + farBound) * nf, 1
        ];
    },
    makePersp: (fov, aspect, nearBound, farBound) => {
        const f = 1 / tan(fov / 2), nf = 1 / (nearBound - farBound);
        return [
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (farBound + nearBound) * nf, -1,
            0, 0, (2 * farBound * nearBound) * nf, 0
        ];
    },
    setIdent: (m) => {
        m[0] = 1; m[1] = 0; m[2] = 0; m[3] = 0;
        m[4] = 0; m[5] = 1; m[6] = 0; m[7] = 0;
        m[8] = 0; m[9] = 0; m[10] = 1; m[11] = 0;
        m[12] = 0; m[13] = 0; m[14] = 0; m[15] = 1;
        return m;
    },
    mul: (b, a) => [
        b[0] * a[0] + b[1] * a[4] + b[2] * a[8] + b[3] * a[12],
        b[0] * a[1] + b[1] * a[5] + b[2] * a[9] + b[3] * a[13], 
        b[0] * a[2] + b[1] * a[6] + b[2] * a[10] + b[3] * a[14], 
        b[0] * a[3] + b[1] * a[7] + b[2] * a[11] + b[3] * a[15],
        b[4] * a[0] + b[5] * a[4] + b[6] * a[8] + b[7] * a[12],
        b[4] * a[1] + b[5] * a[5] + b[6] * a[9] + b[7] * a[13], 
        b[4] * a[2] + b[5] * a[6] + b[6] * a[10] + b[7] * a[14], 
        b[4] * a[3] + b[5] * a[7] + b[6] * a[11] + b[7] * a[15],
        b[8] * a[0] + b[9] * a[4] + b[10] * a[8] + b[11] * a[12],
        b[8] * a[1] + b[9] * a[5] + b[10] * a[9] + b[11] * a[13], 
        b[8] * a[2] + b[9] * a[6] + b[10] * a[10] + b[11] * a[14], 
        b[8] * a[3] + b[9] * a[7] + b[10] * a[11] + b[11] * a[15],
        b[12] * a[0] + b[13] * a[4] + b[14] * a[8] + b[15] * a[12],
        b[12] * a[1] + b[13] * a[5] + b[14] * a[9] + b[15] * a[13], 
        b[12] * a[2] + b[13] * a[6] + b[14] * a[10] + b[15] * a[14], 
        b[12] * a[3] + b[13] * a[7] + b[14] * a[11] + b[15] * a[15]
    ],
    trans: (m, v) => [
        m[0], m[1], m[2], m[3],
        m[4], m[5], m[6], m[7],
        m[8], m[9], m[10], m[11],
        m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], 
        m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], 
        m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14], 
        m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15]
    ],
    scale: (m, v) => [
        m[0] * v[0], m[1] * v[0], m[2] * v[0], m[3] * v[0],
        m[4] * v[1], m[5] * v[1], m[6] * v[1], m[7] * v[1],
        m[8] * v[2], m[9] * v[2], m[10] * v[2], m[11] * v[2],
        m[12], m[13], m[14], m[15]
    ],
    rotX: (m, r) => {
        const c = cos(r), s = sin(r);
        return [
            m[0], m[1], m[2], m[3],
            m[4] * c + m[8] * s, m[5] * c + m[9] * s, m[6] * c + m[10] * s, m[7] * c + m[11] * s,
            m[8] * c - m[4] * s, m[9] * c - m[5] * s, m[10] * c - m[6] * s, m[11] * c - m[7] * s,
            m[12], m[13], m[14], m[15]
        ];
    },
    rotY: (m, r) => {
        const c = cos(r), s = sin(r);
        return [
            m[0] * c - m[8] * s, m[1] * c - m[9] * s, m[2] * c - m[10] * s, m[3] * c - m[11] * s,
            m[4], m[5], m[6], m[7],
            m[8] * c + m[0] * s, m[9] * c + m[1] * s, m[10] * c + m[2] * s, m[11] * c + m[3] * s,
            m[12], m[13], m[14], m[15]
        ];
    },
    rotZ: (m, r) => {
        const c = cos(r), s = sin(r);
        return [
            m[0] * c + m[4] * s, m[1] * c + m[5] * s, m[2] * c + m[6] * s, m[3] * c + m[7] * s,
            m[4] * c - m[0] * s, m[5] * c - m[1] * s, m[6] * c - m[2] * s, m[7] * c - m[3] * s,
            m[8], m[9], m[10], m[11],
            m[12], m[13], m[14], m[15]
        ];
    },
    // euler = [ yaw, pitch, roll ]
    fromEuler: (euler) => {
        let q0 = 0;
        let q1 = 0;
        let q2 = 0;
        let q3 = 0;
        {
            let x = euler[1];
            let y = euler[0];
            let z = euler[2];
            const halfToRad = (0.5 * PI) / 180.0;
            x *= halfToRad;
            y *= halfToRad;
            z *= halfToRad;
            const sx = sin(x);
            const cx = cos(x);
            const sy = sin(y);
            const cy = cos(y);
            const sz = sin(z);
            const cz = cos(z);
            q0 = sx * cy * cz - cx * sy * sz;
            q1 = cx * sy * cz + sx * cy * sz;
            q2 = cx * cy * sz - sx * sy * cz;
            q3 = cx * cy * cz + sx * sy * sz;
        }
        let x = q0,
            y = q1,
            z = q2,
            w = q3;
        let x2 = x + x;
        let y2 = y + y;
        let z2 = z + z;
        let xx = x * x2;
        let yx = y * x2;
        let yy = y * y2;
        let zx = z * x2;
        let zy = z * y2;
        let zz = z * z2;
        let wx = w * x2;
        let wy = w * y2;
        let wz = w * z2;
        const out = Mat4.makeIdent();
        out[0] = 1 - yy - zz;
        out[1] = yx + wz;
        out[2] = zx - wy;
        out[3] = 0;
        out[4] = yx - wz;
        out[5] = 1 - xx - zz;
        out[6] = zy + wx;
        out[7] = 0;
        out[8] = zx + wy;
        out[9] = zy - wx;
        out[10] = 1 - xx - yy;
        out[11] = 0;
        out[12] = 0;
        out[13] = 0;
        out[14] = 0;
        out[15] = 1;
        return out;
    },
    inv: (a) => {
        let a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3];
      let a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];
      let a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];
      let a30 = a[12],
        a31 = a[13],
        a32 = a[14],
        a33 = a[15];
      let b00 = a00 * a11 - a01 * a10;
      let b01 = a00 * a12 - a02 * a10;
      let b02 = a00 * a13 - a03 * a10;
      let b03 = a01 * a12 - a02 * a11;
      let b04 = a01 * a13 - a03 * a11;
      let b05 = a02 * a13 - a03 * a12;
      let b06 = a20 * a31 - a21 * a30;
      let b07 = a20 * a32 - a22 * a30;
      let b08 = a20 * a33 - a23 * a30;
      let b09 = a21 * a32 - a22 * a31;
      let b10 = a21 * a33 - a23 * a31;
      let b11 = a22 * a33 - a23 * a32;
      // Calculate the determinant
      let det =
        b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      if (!det) {
        return null;
      }
      det = 1.0 / det;
      const out = [];
      out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
      out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
      out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
      out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
      out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
      out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
      out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
      out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
      out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
      return out;
    }
};

class Transform {
    constructor(position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
    }

    reset() {
        this.position = [0, 0, 0];
        this.rotation = [0, 0, 0];
        this.scale = [1, 1, 1];
    }

    getMatrix() {
        let mat = Mat4.makeIdent();
        mat = Mat4.trans(mat, this.position);
        mat = Mat4.scale(mat, this.scale);
        mat = Mat4.mul(Mat4.fromEuler(this.rotation), mat);
        return mat;
    }
}