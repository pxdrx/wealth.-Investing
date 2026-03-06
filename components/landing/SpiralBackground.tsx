 "use client";
 
 import { useEffect, useRef } from "react";
 import { useTheme } from "@/components/theme-provider";
 
 const CAMERA_Z = -400;
 const CAMERA_TRAVEL = 3400;
 const VIEW_ZOOM = 100;
 const N_STARS = 5000;
 const TRAIL_LEN = 80;
 const START_DOT_Y = 28;
 
 function ease(p: number, g: number): number {
   if (p < 0.5) return 0.5 * Math.pow(2 * p, g);
   return 1 - 0.5 * Math.pow(2 * (1 - p), g);
 }
 function easeOutElastic(x: number): number {
   const c4 = (2 * Math.PI) / 4.5;
   if (x <= 0) return 0;
   if (x >= 1) return 1;
   return Math.pow(2, -8 * x) * Math.sin((x * 8 - 0.75) * c4) + 1;
 }
 function lerp(a: number, b: number, t: number) { return a * (1 - t) + b * t; }
 function clamp(v: number, a: number, b: number) { return Math.min(Math.max(v, a), b); }
 function mapRange(v: number, a: number, b: number, c: number, d: number) {
   return c + (d - c) * ((v - a) / (b - a));
 }
 function spiralPath(p: number) {
   p = clamp(1.2 * p, 0, 1);
   p = ease(p, 1.8);
   const theta = 2 * Math.PI * 6 * Math.sqrt(p);
   const r = 170 * Math.sqrt(p);
   return { x: r * Math.cos(theta), y: r * Math.sin(theta) + START_DOT_Y };
 }
 
 function seededRng() {
   let seed = 1234;
   return () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
 }
 
 class Star {
   angle: number; distance: number; rotDir: number; expansionRate: number;
   finalScale: number; dx: number; dy: number; spiralLoc: number;
   z: number; swFactor: number;
 
   constructor(rng: () => number) {
     this.angle = rng() * Math.PI * 2;
     this.distance = 30 * rng() + 15;
     this.rotDir = rng() > 0.5 ? 1 : -1;
     this.expansionRate = 1.2 + rng() * 0.8;
     this.finalScale = 0.7 + rng() * 0.6;
     this.dx = this.distance * Math.cos(this.angle);
     this.dy = this.distance * Math.sin(this.angle);
     this.spiralLoc = (1 - Math.pow(1 - rng(), 3.0)) / 1.3;
     this.z = lerp(rng() * 0.5 * CAMERA_Z + 0.5 * CAMERA_Z, CAMERA_TRAVEL + CAMERA_Z, rng());
     this.z = lerp(this.z, CAMERA_TRAVEL / 2, 0.3 * this.spiralLoc);
     this.swFactor = Math.pow(rng(), 2.0);
   }
 
   render(p: number, animTime: number, ctx: CanvasRenderingContext2D, isLight: boolean) {
     const sp = spiralPath(this.spiralLoc);
     const q = p - this.spiralLoc;
     if (q <= 0) return;
     const dp = clamp(4 * q, 0, 1);
 
     let ex: number;
     if (dp < 0.3) ex = lerp(dp, Math.pow(dp, 2), dp / 0.3);
     else if (dp < 0.7) { const t = (dp - 0.3) / 0.4; ex = lerp(Math.pow(dp, 2), easeOutElastic(dp), t); }
     else ex = easeOutElastic(dp);
 
     let sx: number, sy: number;
     if (dp < 0.3) {
       sx = lerp(sp.x, sp.x + this.dx * 0.3, ex / 0.3);
       sy = lerp(sp.y, sp.y + this.dy * 0.3, ex / 0.3);
     } else if (dp < 0.7) {
       const mp = (dp - 0.3) / 0.4;
       const cs = Math.sin(mp * Math.PI) * this.rotDir * 1.5;
       sx = lerp(sp.x + this.dx * 0.3, sp.x + this.dx * 0.7, mp) + (-this.dy * 0.4 * cs) * mp;
       sy = lerp(sp.y + this.dy * 0.3, sp.y + this.dy * 0.7, mp) + (this.dx * 0.4 * cs) * mp;
     } else {
       const fp = (dp - 0.7) / 0.3;
       const td = this.distance * this.expansionRate * 1.5;
       const sa = this.angle + 1.2 * this.rotDir * fp * Math.PI;
       sx = lerp(sp.x + this.dx * 0.7, sp.x + td * Math.cos(sa), fp);
       sy = lerp(sp.y + this.dy * 0.7, sp.y + td * Math.sin(sa), fp);
     }
 
     const t2 = clamp(mapRange(animTime, 0.32, 1, 0, 1), 0, 1);
     const newCamZ = CAMERA_Z + ease(Math.pow(t2, 1.2), 1.8) * CAMERA_TRAVEL;
     if (this.z <= newCamZ) return;
 
     const depth = this.z - newCamZ;
     const px = VIEW_ZOOM * sx * (this.z - CAMERA_Z) / VIEW_ZOOM / depth;
     const py = VIEW_ZOOM * sy * (this.z - CAMERA_Z) / VIEW_ZOOM / depth;
     const sm = dp < 0.6 ? 1 + dp * 0.2 : lerp(1.2, this.finalScale, (dp - 0.6) / 0.4);
     const sw = 400 * 8.5 * this.swFactor * sm / depth;
 
     ctx.beginPath();
     ctx.arc(px, py, 0.5, 0, Math.PI * 2);
     ctx.fill();
   }
 }
 
 export function SpiralBackground() {
   const canvasRef = useRef<HTMLCanvasElement>(null);
   const { resolvedTheme } = useTheme();
   const isLight = resolvedTheme === "light";
 
   useEffect(() => {
     const canvas = canvasRef.current;
     if (!canvas) return;
     const ctx = canvas.getContext("2d");
     if (!ctx) return;
 
     const rng = seededRng();
     const stars = Array.from({ length: N_STARS }, () => new Star(rng));
     let W = 0, H = 0, raf = 0;
 
     function resize() {
       W = window.innerWidth;
       H = window.innerHeight;
       const size = Math.max(W, H);
       const dpr = window.devicePixelRatio || 1;
       canvas!.width = size * dpr;
       canvas!.height = size * dpr;
       canvas!.style.width = W + "px";
       canvas!.style.height = H + "px";
       ctx!.scale(dpr, dpr);
     }
     resize();
     window.addEventListener("resize", resize);
 
     function showDot(pos: { x: number; y: number; z: number }, sizeFactor: number, animTime: number) {
       const t2 = clamp(mapRange(animTime, 0.32, 1, 0, 1), 0, 1);
       const newCamZ = CAMERA_Z + ease(Math.pow(t2, 1.2), 1.8) * CAMERA_TRAVEL;
       if (pos.z <= newCamZ) return;
       const depth = pos.z - newCamZ;
       const x = VIEW_ZOOM * pos.x / depth;
       const y = VIEW_ZOOM * pos.y / depth;
       ctx!.beginPath();
       ctx!.arc(x, y, 0.5, 0, Math.PI * 2);
       ctx!.fill();
     }
 
     function render(ts: number) {
       const animTime = (ts * 0.001 * 0.067) % 1;
       const light = canvas!.dataset.light === "true";
       const size = Math.max(W, H);
 
       ctx!.fillStyle = light ? "#f0f0f2" : "#000000";
       ctx!.fillRect(0, 0, size, size);
       ctx!.save();
       ctx!.translate(W / 2, H / 2);
 
       const t1 = clamp(mapRange(animTime, 0, 0.57, 0, 1), 0, 1);
       const t2 = clamp(mapRange(animTime, 0.32, 1, 0, 1), 0, 1);
       ctx!.rotate(-Math.PI * ease(t2, 2.7));
 
       for (let i = 0; i < TRAIL_LEN; i++) {
         const f = mapRange(i, 0, TRAIL_LEN, 1.1, 0.1);
         const sw = (1.3 * (1 - t1) + 3.0 * Math.sin(Math.PI * t1)) * f;
         ctx!.fillStyle = light ? `rgba(30,30,60,${0.5 + f * 0.5})` : "white";
         const pos = spiralPath(t1 - 0.00015 * i);
         ctx!.beginPath();
         ctx!.arc(pos.x, pos.y, sw / 2, 0, Math.PI * 2);
         ctx!.fill();
       }
 
       ctx!.fillStyle = light ? "rgba(20,20,50,0.85)" : "white";
       for (const s of stars) s.render(t1, animTime, ctx!, light);
 
       if (animTime > 0.32) {
         const dy = CAMERA_Z * START_DOT_Y / VIEW_ZOOM;
         showDot({ x: 0, y: dy, z: CAMERA_TRAVEL }, 2.5, animTime);
       }
 
       ctx!.restore();
       raf = requestAnimationFrame(render);
     }
     raf = requestAnimationFrame(render);
 
     return () => {
       cancelAnimationFrame(raf);
       window.removeEventListener("resize", resize);
     };
   }, []);
 
   useEffect(() => {
     if (canvasRef.current) {
       canvasRef.current.dataset.light = isLight ? "true" : "false";
     }
   }, [isLight]);
 
   return (
     <canvas
       ref={canvasRef}
       className="absolute inset-0 w-full h-full"
       data-light={isLight ? "true" : "false"}
     />
   );
 }
