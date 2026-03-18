const GRAINY_GRADIENT_SHADER = `
uniform float2 iResolution;
uniform float iTime;
uniform float4 uColor0;
uniform float4 uColor1;
uniform float4 uColor2;
uniform float4 uColor3;
uniform float4 uColor4;
uniform int uColorCount;
uniform float uAmplitude;
uniform float uGrainIntensity;
uniform float uGrainSize;
uniform float uGrainEnabled;
uniform float uBrightness;

// --- OPTIMIZATION: FAST HASH FOR NOISE ---
// Replaced the heavy 3D Simplex noise with a simple pseudo-random hash
// for the grain effect. Extremely fast.
float hash(float2 p) {
    float3 p3  = fract(float3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float4 getColor(int idx) {
  if (idx == 0) return uColor0;
  if (idx == 1) return uColor1;
  if (idx == 2) return uColor2;
  if (idx == 3) return uColor3;
  return uColor4;
}

// --- OPTIMIZATION: TRIGONOMETRIC MOVEMENT ---
// Replaced 3D Simplex noise for position calculation with layered
// Sine/Cosine waves based on time. Looks fluid but costs almost nothing.
void addColorContribution(float2 uv, float t, int idx, float colorCount, 
                          inout float4 color, inout float totalWeight) {
  float fi = float(idx);
  float baseAngle = fi * 6.28318530718 / colorCount;
  
  // Smooth, cheap orbital movement
  float2 offset = float2(
    sin(t * 0.7 + baseAngle + fi) * uAmplitude,
    cos(t * 0.5 + baseAngle - fi) * uAmplitude
  );
  
  // Slight pulsation in radius
  float radius = 0.35 + sin(t * 0.3 + fi * 2.0) * 0.05;
  
  float2 pos = float2(0.5) + float2(cos(baseAngle), sin(baseAngle)) * radius + offset;
  
  float dist = length(uv - pos);
  
  // Smoother, broader falloff
  float weight = exp(-dist * dist * 4.0);
  
  // Very cheap "organic" distortion to the weight using sin waves
  weight *= 1.0 + sin(uv.x * 10.0 + t + fi) * sin(uv.y * 10.0 - t) * 0.15;
  
  color += getColor(idx) * weight;
  totalWeight += weight;
}

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / iResolution;
  float t = iTime;
  
  float4 color = float4(0.0);
  float totalWeight = 0.0;
  float colorCount = float(uColorCount);
  
  // Calculate base color blending
  if (uColorCount >= 1) addColorContribution(uv, t, 0, colorCount, color, totalWeight);
  if (uColorCount >= 2) addColorContribution(uv, t, 1, colorCount, color, totalWeight);
  if (uColorCount >= 3) addColorContribution(uv, t, 2, colorCount, color, totalWeight);
  if (uColorCount >= 4) addColorContribution(uv, t, 3, colorCount, color, totalWeight);
  if (uColorCount >= 5) addColorContribution(uv, t, 4, colorCount, color, totalWeight);
  
  // Normalize colors
  color /= max(totalWeight, 0.001);
  color.rgb += uBrightness;
  
  // Apply Grain (Fast hash instead of 3D Simplex)
  if (uGrainEnabled > 0.5) {
    float2 grainUv = fragCoord / uGrainSize;
    // Add time to the hash input so the static animates
    float noise = hash(grainUv + fract(t)) * 2.0 - 1.0; 
    
    // Blend noise into color based on intensity
    color.rgb += noise * uGrainIntensity * (1.0 - abs(2.0 * color.rgb - 1.0));
  }
  
  color.rgb = clamp(color.rgb, 0.0, 1.0);
  color.a = 1.0;
  
  return half4(color);
}
`;

export { GRAINY_GRADIENT_SHADER };

