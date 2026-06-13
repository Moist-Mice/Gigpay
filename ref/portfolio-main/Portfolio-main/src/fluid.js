/**
 * WebGL Fluid Simulation — exact engine from reference HTML.
 * Call startFluid(canvas) → returns cleanup function.
 * themeChangeCbRef.current is set to a function(cx, cy) you can call on theme toggle.
 */
/* eslint-disable */

export function startFluid(canvas, themeChangeCbRef) {
  let rafId = 0;

  function scaleByPixelRatio(i) { return Math.floor(i * (window.devicePixelRatio || 1)); }
  function resizeCanvas() {
    let w = scaleByPixelRatio(canvas.clientWidth);
    let h = scaleByPixelRatio(canvas.clientHeight);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; return true; }
    return false;
  }
  resizeCanvas();

  const config = {
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 1024,
    DENSITY_DISSIPATION: 1,
    VELOCITY_DISSIPATION: 1,
    PRESSURE: 0.25,
    PRESSURE_ITERATIONS: 20,
    CURL: 30,
    SPLAT_RADIUS: 0.15,
    SPLAT_FORCE: 6000,
    SHADING: true,
    COLORFUL: false,
    COLOR_UPDATE_SPEED: 10,
    PAUSED: false,
    BACK_COLOR: { r: 6, g: 6, b: 6 },
    TRANSPARENT: false,
    BLOOM: false,
    SUNRAYS: false,
  };

  // ── WebGL context ──────────────────────────────────────────────────────────
  const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: true };
  let gl = canvas.getContext('webgl2', params);
  const isWebGL2 = !!gl;
  if (!isWebGL2) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);

  let halfFloat, supportLinearFiltering;
  if (isWebGL2) {
    gl.getExtension('EXT_color_buffer_float');
    supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
  } else {
    halfFloat = gl.getExtension('OES_texture_half_float');
    supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
  }
  gl.clearColor(0, 0, 0, 1);
  const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;
  if (/Mobi|Android/i.test(navigator.userAgent)) config.DYE_RESOLUTION = 512;
  if (!supportLinearFiltering) { config.DYE_RESOLUTION = 512; config.SHADING = false; }

  function getSupportedFormat(gl, internalFormat, format, type) {
    if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
      switch (internalFormat) {
        case gl.R16F:  return getSupportedFormat(gl, gl.RG16F,   gl.RG,   type);
        case gl.RG16F: return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
        default: return null;
      }
    }
    return { internalFormat, format };
  }
  function supportRenderTextureFormat(gl, internalFormat, format, type) {
    let tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
    let fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  }

  let formatRGBA, formatRG, formatR;
  if (isWebGL2) {
    formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType);
    formatRG   = getSupportedFormat(gl, gl.RG16F,   gl.RG,   halfFloatTexType);
    formatR    = getSupportedFormat(gl, gl.R16F,    gl.RED,  halfFloatTexType);
  } else {
    formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    formatRG   = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    formatR    = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
  }

  const ext = { formatRGBA, formatRG, formatR, halfFloatTexType, supportLinearFiltering };

  // ── Shaders ────────────────────────────────────────────────────────────────
  function compileShader(type, src, kw) {
    src = addKeywords(src, kw);
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.trace(gl.getShaderInfoLog(s));
    return s;
  }
  function addKeywords(src, kw) { if (!kw) return src; return kw.map(k => '#define ' + k + '\n').join('') + src; }
  function createProgram(vs, fs) { let p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p); return p; }
  function getUniforms(p) { let u = [], n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { let nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); } return u; }

  class Material {
    constructor(vs, fsSrc) { this.vs = vs; this.fsSrc = fsSrc; this.programs = []; this.activeProgram = null; this.uniforms = []; }
    setKeywords(kw) {
      let hash = 0; for (let i = 0; i < kw.length; i++) hash += hashCode(kw[i]);
      let p = this.programs[hash];
      if (p == null) { let fs = compileShader(gl.FRAGMENT_SHADER, this.fsSrc, kw); p = createProgram(this.vs, fs); this.programs[hash] = p; }
      if (p === this.activeProgram) return;
      this.uniforms = getUniforms(p); this.activeProgram = p;
    }
    bind() { gl.useProgram(this.activeProgram); }
  }
  class Program {
    constructor(vs, fs) { this.uniforms = {}; this.program = createProgram(vs, fs); this.uniforms = getUniforms(this.program); }
    bind() { gl.useProgram(this.program); }
  }

  const baseVS = compileShader(gl.VERTEX_SHADER, `
    precision highp float;
    attribute vec2 aPosition; varying vec2 vUv,vL,vR,vT,vB; uniform vec2 texelSize;
    void main(){vUv=aPosition*.5+.5;vL=vUv-vec2(texelSize.x,0.);vR=vUv+vec2(texelSize.x,0.);vT=vUv+vec2(0.,texelSize.y);vB=vUv-vec2(0.,texelSize.y);gl_Position=vec4(aPosition,0.,1.);}`);

  const blurVS = compileShader(gl.VERTEX_SHADER, `
    precision highp float;
    attribute vec2 aPosition; varying vec2 vUv,vL,vR; uniform vec2 texelSize;
    void main(){vUv=aPosition*.5+.5;float o=1.33333333;vL=vUv-texelSize*o;vR=vUv+texelSize*o;gl_Position=vec4(aPosition,0.,1.);}`);

  const copyFS = compileShader(gl.FRAGMENT_SHADER, `precision mediump float;precision mediump sampler2D;varying highp vec2 vUv;uniform sampler2D uTexture;void main(){gl_FragColor=texture2D(uTexture,vUv);}`);
  const clearFS = compileShader(gl.FRAGMENT_SHADER, `precision mediump float;precision mediump sampler2D;varying highp vec2 vUv;uniform sampler2D uTexture;uniform float value;void main(){gl_FragColor=value*texture2D(uTexture,vUv);}`);
  const colorFS = compileShader(gl.FRAGMENT_SHADER, `precision mediump float;uniform vec4 color;void main(){gl_FragColor=color;}`);

  const displayFSSrc = `
    precision highp float; precision highp sampler2D;
    varying vec2 vUv,vL,vR,vT,vB;
    uniform sampler2D uTexture;
    uniform vec2 texelSize;
    void main(){
      vec3 c=texture2D(uTexture,vUv).rgb;
      #ifdef SHADING
      vec3 lc=texture2D(uTexture,vL).rgb,rc=texture2D(uTexture,vR).rgb,tc=texture2D(uTexture,vT).rgb,bc=texture2D(uTexture,vB).rgb;
      float dx=length(rc)-length(lc),dy=length(tc)-length(bc);
      vec3 n=normalize(vec3(dx,dy,length(texelSize)));
      float diffuse=clamp(dot(n,vec3(0.,0.,1.))+0.7,0.7,1.0);
      c*=diffuse;
      #endif
      float a=max(c.r,max(c.g,c.b));
      gl_FragColor=vec4(c,a);
    }`;

  const splatFS = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;precision highp sampler2D;
    varying vec2 vUv;uniform sampler2D uTarget;uniform float aspectRatio;uniform vec3 color;uniform vec2 point;uniform float radius;
    void main(){vec2 p=vUv-point.xy;p.x*=aspectRatio;vec3 sp=exp(-dot(p,p)/radius)*color;vec3 base=texture2D(uTarget,vUv).xyz;gl_FragColor=vec4(base+sp,1.);}`);

  const advFS = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;precision highp sampler2D;
    varying vec2 vUv;uniform sampler2D uVelocity,uSource;uniform vec2 texelSize,dyeTexelSize;uniform float dt,dissipation;
    vec4 bilerp(sampler2D s,vec2 uv,vec2 t){vec2 st=uv/t-.5;vec2 i=floor(st),f=fract(st);vec4 a=texture2D(s,(i+vec2(.5,.5))*t),b=texture2D(s,(i+vec2(1.5,.5))*t),c=texture2D(s,(i+vec2(.5,1.5))*t),d=texture2D(s,(i+vec2(1.5,1.5))*t);return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
    void main(){
      #ifdef MANUAL_FILTERING
      vec2 coord=vUv-dt*bilerp(uVelocity,vUv,texelSize).xy*texelSize;vec4 result=bilerp(uSource,coord,dyeTexelSize);
      #else
      vec2 coord=vUv-dt*texture2D(uVelocity,vUv).xy*texelSize;vec4 result=texture2D(uSource,coord);
      #endif
      float decay=1.0+dissipation*dt;gl_FragColor=result/decay;
    }`, ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']);

  const divFS  = compileShader(gl.FRAGMENT_SHADER, `precision mediump float;precision mediump sampler2D;varying highp vec2 vUv,vL,vR,vT,vB;uniform sampler2D uVelocity;void main(){float L=texture2D(uVelocity,vL).x,R=texture2D(uVelocity,vR).x,T=texture2D(uVelocity,vT).y,B=texture2D(uVelocity,vB).y;vec2 C=texture2D(uVelocity,vUv).xy;if(vL.x<0.)L=-C.x;if(vR.x>1.)R=-C.x;if(vT.y>1.)T=-C.y;if(vB.y<0.)B=-C.y;gl_FragColor=vec4(.5*(R-L+T-B),0.,0.,1.);}`);
  const curlFS = compileShader(gl.FRAGMENT_SHADER, `precision mediump float;precision mediump sampler2D;varying highp vec2 vUv,vL,vR,vT,vB;uniform sampler2D uVelocity;void main(){float L=texture2D(uVelocity,vL).y,R=texture2D(uVelocity,vR).y,T=texture2D(uVelocity,vT).x,B=texture2D(uVelocity,vB).x;gl_FragColor=vec4(.5*(R-L-T+B),0.,0.,1.);}`);
  const vortFS = compileShader(gl.FRAGMENT_SHADER, `precision highp float;precision highp sampler2D;varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uVelocity,uCurl;uniform float curl,dt;void main(){float L=texture2D(uCurl,vL).x,R=texture2D(uCurl,vR).x,T=texture2D(uCurl,vT).x,B=texture2D(uCurl,vB).x,C=texture2D(uCurl,vUv).x;vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L));f/=length(f)+.0001;f*=curl*C;f.y*=-1.;vec2 v=texture2D(uVelocity,vUv).xy;v+=f*dt;v=min(max(v,-1000.),1000.);gl_FragColor=vec4(v,0.,1.);}`);
  const presFS = compileShader(gl.FRAGMENT_SHADER, `precision mediump float;precision mediump sampler2D;varying highp vec2 vUv,vL,vR,vT,vB;uniform sampler2D uPressure,uDivergence;void main(){float L=texture2D(uPressure,vL).x,R=texture2D(uPressure,vR).x,T=texture2D(uPressure,vT).x,B=texture2D(uPressure,vB).x,div=texture2D(uDivergence,vUv).x;gl_FragColor=vec4((L+R+B+T-div)*.25,0.,0.,1.);}`);
  const gradFS = compileShader(gl.FRAGMENT_SHADER, `precision mediump float;precision mediump sampler2D;varying highp vec2 vUv,vL,vR,vT,vB;uniform sampler2D uPressure,uVelocity;void main(){float L=texture2D(uPressure,vL).x,R=texture2D(uPressure,vR).x,T=texture2D(uPressure,vT).x,B=texture2D(uPressure,vB).x;vec2 v=texture2D(uVelocity,vUv).xy;v-=vec2(R-L,T-B);gl_FragColor=vec4(v,0.,1.);}`);

  // ── Blit quad ──────────────────────────────────────────────────────────────
  const blit = (() => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,-1,1,1,1,1,-1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2,0,2,3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0);
    return (target, clear = false) => {
      if (target == null) { gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
      else { gl.viewport(0,0,target.width,target.height); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); }
      if (clear) { gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT); }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };
  })();

  let dye, velocity, divergence, curl, pressure;

  const copyProg  = new Program(baseVS, copyFS);
  const clearProg = new Program(baseVS, clearFS);
  const colorProg = new Program(baseVS, colorFS);
  const splatProg = new Program(baseVS, splatFS);
  const advProg   = new Program(baseVS, advFS);
  const divProg   = new Program(baseVS, divFS);
  const curlProg  = new Program(baseVS, curlFS);
  const vortProg  = new Program(baseVS, vortFS);
  const presProg  = new Program(baseVS, presFS);
  const gradProg  = new Program(baseVS, gradFS);
  const displayMat = new Material(baseVS, displayFSSrc);

  // ── FBOs ───────────────────────────────────────────────────────────────────
  function createFBO(w, h, ig, fmt, type, param) {
    gl.activeTexture(gl.TEXTURE0); let t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, ig, w, h, 0, fmt, type, null);
    let fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.viewport(0,0,w,h); gl.clear(gl.COLOR_BUFFER_BIT);
    return { texture: t, fbo, width: w, height: h, texelSizeX: 1/w, texelSizeY: 1/h, attach(id) { gl.activeTexture(gl.TEXTURE0+id); gl.bindTexture(gl.TEXTURE_2D,t); return id; } };
  }
  function createDoubleFBO(w, h, ig, fmt, type, param) {
    let a = createFBO(w,h,ig,fmt,type,param), b = createFBO(w,h,ig,fmt,type,param);
    return { width:w,height:h,texelSizeX:a.texelSizeX,texelSizeY:a.texelSizeY,
      get read(){return a;},set read(v){a=v;},get write(){return b;},set write(v){b=v;},
      swap(){let t=a;a=b;b=t;} };
  }
  function resizeFBO(target,w,h,ig,fmt,type,param){
    let n=createFBO(w,h,ig,fmt,type,param);
    copyProg.bind(); gl.uniform1i(copyProg.uniforms.uTexture,target.attach(0)); blit(n); return n;
  }
  function resizeDoubleFBO(target,w,h,ig,fmt,type,param){
    if(target.width===w&&target.height===h) return target;
    target.read=resizeFBO(target.read,w,h,ig,fmt,type,param);
    target.write=createFBO(w,h,ig,fmt,type,param);
    target.width=w; target.height=h; target.texelSizeX=1/w; target.texelSizeY=1/h;
    return target;
  }
  function getResolution(res){ let ar=gl.drawingBufferWidth/gl.drawingBufferHeight; if(ar<1) ar=1/ar; let min=Math.round(res),max=Math.round(res*ar); return gl.drawingBufferWidth>gl.drawingBufferHeight?{width:max,height:min}:{width:min,height:max}; }

  function initFBOs() {
    let simRes=getResolution(config.SIM_RESOLUTION), dyeRes=getResolution(config.DYE_RESOLUTION);
    const tt=ext.halfFloatTexType, rgba=ext.formatRGBA, rg=ext.formatRG, r=ext.formatR;
    const filt=ext.supportLinearFiltering?gl.LINEAR:gl.NEAREST;
    gl.disable(gl.BLEND);
    if(!dye) dye=createDoubleFBO(dyeRes.width,dyeRes.height,rgba.internalFormat,rgba.format,tt,filt);
    else dye=resizeDoubleFBO(dye,dyeRes.width,dyeRes.height,rgba.internalFormat,rgba.format,tt,filt);
    if(!velocity) velocity=createDoubleFBO(simRes.width,simRes.height,rg.internalFormat,rg.format,tt,filt);
    else velocity=resizeDoubleFBO(velocity,simRes.width,simRes.height,rg.internalFormat,rg.format,tt,filt);
    divergence=createFBO(simRes.width,simRes.height,r.internalFormat,r.format,tt,gl.NEAREST);
    curl      =createFBO(simRes.width,simRes.height,r.internalFormat,r.format,tt,gl.NEAREST);
    pressure  =createDoubleFBO(simRes.width,simRes.height,r.internalFormat,r.format,tt,gl.NEAREST);
  }

  displayMat.setKeywords(config.SHADING ? ['SHADING'] : []);
  initFBOs();

  // ── Colors / splats ────────────────────────────────────────────────────────
  function generateColor(){ const v=0.08+Math.random()*0.18; return {r:v,g:v,b:v}; }
  function normalizeColor(c){ return {r:c.r/255,g:c.g/255,b:c.b/255}; }
  function correctRadius(r){ let ar=canvas.width/canvas.height; if(ar>1) r*=ar; return r; }
  function correctDeltaX(d){ let ar=canvas.width/canvas.height; if(ar<1) d*=ar; return d; }
  function correctDeltaY(d){ let ar=canvas.width/canvas.height; if(ar>1) d/=ar; return d; }

  function splat(x,y,dx,dy,color){
    splatProg.bind();
    gl.uniform1i(splatProg.uniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(splatProg.uniforms.aspectRatio, canvas.width/canvas.height);
    gl.uniform2f(splatProg.uniforms.point, x, y);
    gl.uniform3f(splatProg.uniforms.color, dx, dy, 0);
    gl.uniform1f(splatProg.uniforms.radius, correctRadius(config.SPLAT_RADIUS/100));
    blit(velocity.write); velocity.swap();
    gl.uniform1i(splatProg.uniforms.uTarget, dye.read.attach(0));
    gl.uniform3f(splatProg.uniforms.color, color.r, color.g, color.b);
    blit(dye.write); dye.swap();
  }
  function multipleSplats(amount){
    for(let i=0;i<amount;i++){
      const c=generateColor(); c.r*=10; c.g*=10; c.b*=10;
      splat(Math.random(),Math.random(),1000*(Math.random()-.5),1000*(Math.random()-.5),c);
    }
  }
  multipleSplats(parseInt(Math.random()*20)+5);

  // ── Pointers ───────────────────────────────────────────────────────────────
  function pointerPrototype(){
    this.id=-1;this.texcoordX=0;this.texcoordY=0;
    this.prevTexcoordX=0;this.prevTexcoordY=0;
    this.deltaX=0;this.deltaY=0;
    this.down=false;this.moved=false;this.color={r:0.08,g:0.08,b:0.08};
  }
  let pointers=[]; let splatStack=[];
  pointers.push(new pointerPrototype());

  function updatePointerDownData(p,id,x,y){ p.id=id;p.down=true;p.moved=false;p.texcoordX=x/canvas.width;p.texcoordY=1-y/canvas.height;p.prevTexcoordX=p.texcoordX;p.prevTexcoordY=p.texcoordY;p.deltaX=0;p.deltaY=0;p.color=generateColor(); }
  function updatePointerMoveData(p,x,y){ p.prevTexcoordX=p.texcoordX;p.prevTexcoordY=p.texcoordY;p.texcoordX=x/canvas.width;p.texcoordY=1-y/canvas.height;p.deltaX=correctDeltaX(p.texcoordX-p.prevTexcoordX);p.deltaY=correctDeltaY(p.texcoordY-p.prevTexcoordY);p.moved=Math.abs(p.deltaX)>0||Math.abs(p.deltaY)>0; }
  function updatePointerUpData(p){ p.down=false; }

  const onMouseMove = e => {
    // ── Guard: only react when cursor is over the visible hero canvas ──
    const rect = canvas.getBoundingClientRect()
    if (
      rect.bottom <= 0 ||                   // canvas fully above viewport (scrolled past)
      rect.top >= window.innerHeight ||     // canvas fully below viewport
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) return
    // ── Coords relative to canvas origin (handles partial-scroll offset) ──
    // rect.top is negative when hero is partially scrolled, so subtracting it
    // shifts clientY into canvas-space correctly regardless of scroll position.
    let p=pointers[0];
    let posX=scaleByPixelRatio(e.clientX - rect.left);
    let posY=scaleByPixelRatio(e.clientY - rect.top);
    if(!p.down) updatePointerDownData(p,-1,posX,posY);
    updatePointerMoveData(p,posX,posY);
  };
  const onMouseUp = () => updatePointerUpData(pointers[0]);
  const onTouchStart = e => {
    e.preventDefault(); const t=e.targetTouches;
    while(t.length>=pointers.length) pointers.push(new pointerPrototype());
    for(let i=0;i<t.length;i++){ let px=scaleByPixelRatio(t[i].pageX),py=scaleByPixelRatio(t[i].pageY); updatePointerDownData(pointers[i+1],t[i].identifier,px,py); }
  };
  const onTouchMove = e => {
    e.preventDefault(); const t=e.targetTouches;
    for(let i=0;i<t.length;i++){ let ptr=pointers[i+1]; if(!ptr||!ptr.down) continue; updatePointerMoveData(ptr,scaleByPixelRatio(t[i].pageX),scaleByPixelRatio(t[i].pageY)); }
  };
  const onTouchEnd = e => {
    const t=e.changedTouches;
    for(let i=0;i<t.length;i++){ let ptr=pointers.find(p=>p.id===t[i].identifier); if(ptr) updatePointerUpData(ptr); }
  };
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('touchstart', onTouchStart);
  canvas.addEventListener('touchmove', onTouchMove, false);
  window.addEventListener('touchend', onTouchEnd);

  // ── Simulation loop ────────────────────────────────────────────────────────
  function step(dt){
    gl.disable(gl.BLEND);
    curlProg.bind(); gl.uniform2f(curlProg.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY); gl.uniform1i(curlProg.uniforms.uVelocity,velocity.read.attach(0)); blit(curl);
    vortProg.bind(); gl.uniform2f(vortProg.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY); gl.uniform1i(vortProg.uniforms.uVelocity,velocity.read.attach(0)); gl.uniform1i(vortProg.uniforms.uCurl,curl.attach(1)); gl.uniform1f(vortProg.uniforms.curl,config.CURL); gl.uniform1f(vortProg.uniforms.dt,dt); blit(velocity.write); velocity.swap();
    divProg.bind(); gl.uniform2f(divProg.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY); gl.uniform1i(divProg.uniforms.uVelocity,velocity.read.attach(0)); blit(divergence);
    clearProg.bind(); gl.uniform1i(clearProg.uniforms.uTexture,pressure.read.attach(0)); gl.uniform1f(clearProg.uniforms.value,config.PRESSURE); blit(pressure.write); pressure.swap();
    presProg.bind(); gl.uniform2f(presProg.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY); gl.uniform1i(presProg.uniforms.uDivergence,divergence.attach(0));
    for(let i=0;i<config.PRESSURE_ITERATIONS;i++){ gl.uniform1i(presProg.uniforms.uPressure,pressure.read.attach(1)); blit(pressure.write); pressure.swap(); }
    gradProg.bind(); gl.uniform2f(gradProg.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY); gl.uniform1i(gradProg.uniforms.uPressure,pressure.read.attach(0)); gl.uniform1i(gradProg.uniforms.uVelocity,velocity.read.attach(1)); blit(velocity.write); velocity.swap();
    advProg.bind(); gl.uniform2f(advProg.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY);
    if(!ext.supportLinearFiltering) gl.uniform2f(advProg.uniforms.dyeTexelSize,velocity.texelSizeX,velocity.texelSizeY);
    let vId=velocity.read.attach(0); gl.uniform1i(advProg.uniforms.uVelocity,vId); gl.uniform1i(advProg.uniforms.uSource,vId); gl.uniform1f(advProg.uniforms.dt,dt); gl.uniform1f(advProg.uniforms.dissipation,config.VELOCITY_DISSIPATION); blit(velocity.write); velocity.swap();
    if(!ext.supportLinearFiltering) gl.uniform2f(advProg.uniforms.dyeTexelSize,dye.texelSizeX,dye.texelSizeY);
    gl.uniform1i(advProg.uniforms.uVelocity,velocity.read.attach(0)); gl.uniform1i(advProg.uniforms.uSource,dye.read.attach(1)); gl.uniform1f(advProg.uniforms.dissipation,config.DENSITY_DISSIPATION); blit(dye.write); dye.swap();
  }

  function render(target){
    gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.BLEND);
    colorProg.bind(); const nc=normalizeColor(config.BACK_COLOR); gl.uniform4f(colorProg.uniforms.color,nc.r,nc.g,nc.b,1); blit(target);
    const w=target==null?gl.drawingBufferWidth:target.width, h=target==null?gl.drawingBufferHeight:target.height;
    displayMat.bind();
    if(config.SHADING) gl.uniform2f(displayMat.uniforms.texelSize,1/w,1/h);
    gl.uniform1i(displayMat.uniforms.uTexture,dye.read.attach(0));
    blit(target);
  }

  let lastTime=Date.now();
  function update(){
    const now=Date.now(), dt=Math.min((now-lastTime)/1000,.016666); lastTime=now;
    if(resizeCanvas()) initFBOs();
    if(splatStack.length>0) multipleSplats(splatStack.pop());
    pointers.forEach(p=>{ if(p.moved){p.moved=false;splatPointer(p);} });
    if(!config.PAUSED) step(dt);
    render(null);
    rafId=requestAnimationFrame(update);
  }
  function splatPointer(p){
    const dx=p.deltaX*config.SPLAT_FORCE, dy=p.deltaY*config.SPLAT_FORCE;
    splat(p.texcoordX,p.texcoordY,dx,dy,p.color);
  }
  function hashCode(s){ if(!s.length) return 0; let h=0; for(let i=0;i<s.length;i++){h=(h<<5)-h+s.charCodeAt(i);h|=0;} return h; }

  rafId = requestAnimationFrame(update);

  // ── Theme-change burst (called from React ripple toggle) ───────────────────
  themeChangeCbRef.current = (screenX, screenY) => {
    const x=screenX/window.innerWidth, y=1-(screenY/window.innerHeight);
    for(let i=0;i<30;i++){
      const angle=(i/30)*Math.PI*2, speed=800+Math.random()*1200;
      const c=generateColor(); c.r*=10; c.g*=10; c.b*=10;
      setTimeout(()=>{ splat(x+Math.cos(angle)*0.01,y+Math.sin(angle)*0.01,Math.cos(angle)*speed,Math.sin(angle)*speed,c); },i*18);
    }
  };

  // ── Cleanup ────────────────────────────────────────────────────────────────
  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    themeChangeCbRef.current = null;
  };
}
