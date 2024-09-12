uniform sampler2D S;            // Shadow Map Texture
uniform vec3 L;                 // Directional Light
uniform vec3 E;                 // Camera Position (Eye)
uniform vec2 M;                 // Material (roughness, metallic)
uniform vec3 A;                 // Material Albedo (RGB)
varying vec4 w;                 // World Position
varying vec4 s;                 // Shadow Position

float normalDistributionFunctionGGXTR(vec3 n, vec3 m, float a) {
    float a2 = a * a;
    float denom = ((max(0.0, dot(n, m))) * (a2 - 1.0) + 1.0);
    return a2 / (3.14 * (denom * denom));
}

float geometryGGX(float NdotV, float a) {
    float k = (a + 1.0) * (a + 1.0) / 8.0;
    return NdotV / (NdotV * (1.0 - k) + k);
}

vec3 surfaceColor(vec3 n, vec3 v, vec3 l, vec3 albedo, float roughness, float metallic, float shadow, vec3 radiance) { 
    vec3 F0 = mix(vec3(0.04), albedo, metallic); 
    vec3 h = normalize(v + l); 
    roughness = max(roughness * roughness, 0.0001); 
    float NdotL = clamp(dot(n, l) * shadow, 0.0, 1.0); 
    float NdotV = clamp(dot(n, v) * shadow, 0.0, 1.0); 
    vec3 F = F0 + (1.0 - F0) * pow(1.0 - max(0.0, dot(v, h)), 5.0); 
    return ((radiance + albedo) * 0.025) + ((((1.0 - F) * (1.0 - metallic)) * albedo / 3.14 + ((normalDistributionFunctionGGXTR(n, h, roughness)) * F * (geometryGGX(NdotL, roughness) * geometryGGX(NdotV, roughness))) / max((4.0 * NdotL * NdotV), .00001)) * radiance * min(NdotL, (NdotL * shadow))); 
}

float random(float seed) {
    return fract(sin(seed) * 43758.5453123) * 1.0;
}

vec3 aces(vec3 x) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
    vec3 v = normalize(w.xyz-E);
    vec3 n = normalize(cross(dFdy(w.xyz), dFdx(w.xyz)));
    vec3 u = (s.xyz / s.w) * 0.5 + 0.5;
    float shadowDepth = texture2D(S, u.xy).r;
    float shadow = shadowDepth < u.z - 0.0001 ? 0.0 : 1.0;
    float diff = u.z - shadowDepth;
    float dt = mix(0.0, 1.0, diff*2000.0);
    vec2 pixelSize = mix(0.1, 0.0, dt) / vec2(960, 640);
    
    float samples = 1.0;
    for (float r = 0.0; r < 6.28; r += 0.1) {
        vec2 cs = vec2(cos(r), sin(r)) * pixelSize;
        shadowDepth = texture2D(S, u.xy + cs).r;
        shadow += (shadowDepth < u.z - 0.0001 ? 0.61 : 1.0);
        samples += 1.0;
    }
    shadow /= samples;
    vec3 color = surfaceColor(n, v, L, A, M.x, M.y, shadow, vec3(1.0));
    color = mix(vec3(240/255,198/255,70/255) * color, color, shadow);
    gl_FragColor = vec4(pow(color, vec3(1.0 / 2.2)), gl_FragCoord.z);
}
