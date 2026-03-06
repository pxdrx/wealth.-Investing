"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/components/theme-provider";

const VERT = `
  attribute vec2 a_pos;
  void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG_DARK = `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_res;

  vec3 hash3(vec2 p) {
    vec3 q = vec3(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)),dot(p,vec2(419.2,371.9)));
    return fract(sin(q)*43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(mix(dot(hash3(i+vec2(0,0)).xy,f-vec2(0,0)),dot(hash3(i+vec2(1,0)).xy,f-vec2(1,0)),f.x),
               mix(dot(hash3(i+vec2(0,1)).xy,f-vec2(0,1)),dot(hash3(i+vec2(1,1)).xy,f-vec2(1,1)),f.x),f.y);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_res;
    float t = u_time * 0.18;

    vec2 p1 = vec2(0.15+sin(t*0.7)*0.18, 0.2+cos(t*0.5)*0.15);
    vec2 p2 = vec2(0.85+cos(t*0.6)*0.12, 0.15+sin(t*0.8)*0.18);
    vec2 p3 = vec2(0.5+sin(t*0.4)*0.22,  0.55+cos(t*0.9)*0.2);
    vec2 p4 = vec2(0.2+cos(t*0.9)*0.14,  0.85+sin(t*0.3)*0.1);
    vec2 p5 = vec2(0.88+sin(t*0.5)*0.1,  0.75+cos(t*0.7)*0.18);

    float d1=1.0/(length(uv-p1)*3.5+0.01);
    float d2=1.0/(length(uv-p2)*3.8+0.01);
    float d3=1.0/(length(uv-p3)*3.2+0.01);
    float d4=1.0/(length(uv-p4)*4.0+0.01);
    float d5=1.0/(length(uv-p5)*3.6+0.01);
    float total=d1+d2+d3+d4+d5;

    vec3 c1=vec3(0.05,0.04,0.12);
    vec3 c2=vec3(0.08,0.05,0.18);
    vec3 c3=vec3(0.03,0.08,0.14);
    vec3 c4=vec3(0.10,0.04,0.10);
    vec3 c5=vec3(0.04,0.06,0.16);

    vec3 col=(c1*d1+c2*d2+c3*d3+c4*d4+c5*d5)/total;
    float n=noise(uv*4.0+t*0.3)*0.03;
    col+=n;
    float vig=1.0-length((uv-0.5)*1.4);
    col*=max(vig,0.3);
    float grain=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-0.5)*0.018;
    col+=grain;
    gl_FragColor=vec4(col,1.0);
  }
`;

const FRAG_LIGHT = `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_res;

  vec3 hash3(vec2 p) {
    vec3 q = vec3(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)),dot(p,vec2(419.2,371.9)));
    return fract(sin(q)*43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(mix(dot(hash3(i+vec2(0,0)).xy,f-vec2(0,0)),dot(hash3(i+vec2(1,0)).xy,f-vec2(1,0)),f.x),
               mix(dot(hash3(i+vec2(0,1)).xy,f-vec2(0,1)),dot(hash3(i+vec2(1,1)).xy,f-vec2(1,1)),f.x),f.y);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_res;
    float t = u_time * 0.15;

    vec2 p1 = vec2(0.15+sin(t*0.7)*0.18, 0.2+cos(t*0.5)*0.15);
    vec2 p2 = vec2(0.85+cos(t*0.6)*0.12, 0.15+sin(t*0.8)*0.18);
    vec2 p3 = vec2(0.5+sin(t*0.4)*0.22,  0.55+cos(t*0.9)*0.2);
    vec2 p4 = vec2(0.2+cos(t*0.9)*0.14,  0.85+sin(t*0.3)*0.1);
    vec2 p5 = vec2(0.88+sin(t*0.5)*0.1,  0.75+cos(t*0.7)*0.18);

    float d1=1.0/(length(uv-p1)*3.5+0.01);
    float d2=1.0/(length(uv-p2)*3.8+0.01);
    float d3=1.0/(length(uv-p3)*3.2+0.01);
    float d4=1.0/(length(uv-p4)*4.0+0.01);
    float d5=1.0/(length(uv-p5)*3.6+0.01);
    float total=d1+d2+d3+d4+d5;

    // Light mode — cores quase brancas com variações sutis
    vec3 c1=vec3(0.94,0.94,0.97);
    vec3 c2=vec3(0.96,0.95,0.99);
    vec3 c3=vec3(0.93,0.96,0.98);
    vec3 c4=vec3(0.97,0.94,0.96);
    vec3 c5=vec3(0.95,0.96,0.99);

    vec3 col=(c1*d1+c2*d2+c3*d3+c4*d4+c5*d5)/total;
    float n=noise(uv*4.0+t*0.3)*0.012;
    col+=n;
    float vig=1.0-length((uv-0.5)*1.2)*0.15;
    col*=clamp(vig,0.85,1.0);
    float grain=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-0.5)*0.008;
    col+=grain;
    gl_FragColor=vec4(col,1.0);
  }
`;

function buildProgram(gl: WebGLRenderingContext, frag: string) {
  function compile(type: number, src: string) {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  return prog;
}

export function LoginBackground({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const prog = buildProgram(gl, isDark ? FRAG_DARK : FRAG_LIGHT);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes  = gl.getUniformLocation(prog, "u_res");

    let W = 0, H = 0, raf = 0;

    function resize() {
      W = canvas!.width  = canvas!.offsetWidth;
      H = canvas!.height = canvas!.offsetHeight;
      gl!.viewport(0, 0, W, H);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function draw(ts: number) {
      gl!.uniform1f(uTime, ts * 0.001);
      gl!.uniform2f(uRes, W, H);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [isDark]);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
