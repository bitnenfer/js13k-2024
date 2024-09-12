uniform mat4 V;                 // View Projection
uniform mat4 X;                 // Model
uniform mat4 N;                 // Shadow Map View Projection
attribute vec3 p;               // Vertex Position
varying vec4 w;                 // World Position
varying vec4 s;                 // Shadow Position
void main(){
    w = X * vec4(p, 1);
    gl_Position= V * w;
    s = N * w; 
} 