uniform mat4 V;                 // View Projection
uniform mat4 X;                 // Model
attribute vec3 p;               // Vertex Position
void main() {
    gl_Position= V * X * vec4(p, 1);
}