const canvas = document.getElementById('studioCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const bgVideo = document.getElementById('bgVideoEl');
const bgAudio = document.getElementById('bgAudioEl');

// Vistas y paneles
const homeView = document.getElementById('homeView');
const editorView = document.getElementById('editorView');
const floatingActions = document.getElementById('floatingActions');
const contextToolbar = document.getElementById('contextToolbar');
const bottomSheet = document.getElementById('bottomSheet');
const capcutTimeline = document.getElementById('capcutTimeline');

// Estado Global del Estudio
let bgConfig = { type: 'gradient', c1: '#0f0c29', c2: '#302b63', img: null };
let layers = [];
let selectedLayer = null;

// Estado de Transformación Táctil (Mover, Escalar por esquinas, Rotar)
let dragMode = null; // 'move' | 'scale' | 'rotate'
let dragStart = { x: 0, y: 0, initW: 0, initH: 0, initScale: 1, initRot: 0 };
let lastTapTime = 0;

// Estado de Línea de Tiempo (CapCut)
let currentTime = 0;
let totalDuration = 10;
let isPlayingTimeline = false;
let isExporting = false;

// ==========================================
// 1. FLUJO DE INICIO Y PLANTILLAS EDITABLES
// ==========================================
function openEditor(w, h, mode = 'canva') {
  canvas.width = w;
  canvas.height = h;
  homeView.classList.remove('active');
  editorView.classList.add('active');
  setEditorMode(mode);
}

function setEditorMode(mode) {
  if (mode === 'capcut') {
    capcutTimeline.classList.remove('hidden');
    document.getElementById('btnModeCapcut').classList.add('active');
    document.getElementById('btnModeCanva').classList.remove('active');
  } else {
    capcutTimeline.classList.add('hidden');
    document.getElementById('btnModeCanva').classList.add('active');
    document.getElementById('btnModeCapcut').classList.remove('active');
  }
}

document.getElementById('btnGoHome').addEventListener('click', () => {
  isPlayingTimeline = false;
  bgVideo.pause();
  bgAudio.pause();
  editorView.classList.remove('active');
  homeView.classList.add('active');
});

document.getElementById('btnModeCanva').addEventListener('click', () => setEditorMode('canva'));
document.getElementById('btnModeCapcut').addEventListener('click', () => setEditorMode('capcut'));

// Botones de formato en el Lobby
document.querySelectorAll('.format-item[data-w]').forEach(btn => {
  btn.addEventListener('click', () => {
    const w = parseInt(btn.dataset.w, 10);
    const h = parseInt(btn.dataset.h, 10);
    loadTemplate('default', w, h);
    openEditor(w, h, btn.dataset.mode);
  });
});

document.getElementById('btnQuickBgRemove').addEventListener('click', () => {
  loadTemplate('default', 1080, 1080);
  openEditor(1080, 1080, 'canva');
  document.getElementById('inpUploadLayerImg').click();
});

// Generador de Plantillas Multicapa 100% Editables
function loadTemplate(name, w = 1080, h = 1080) {
  layers = [];
  selectedLayer = null;

  if (name === 'burger') {
    bgConfig = { type: 'gradient', c1: '#8a1c14', c2: '#1a0908', img: null };
    layers.push(
      createShapeObj('circle', w / 2, h * 0.45, 520, 520, '#ff8008'),
      createTextObj('🔥 COMBO ESPECIAL', w / 2, h * 0.14, 52, '#ffffff', '#ff0055', true),
      createTextObj('SUPER BURGER', w / 2, h * 0.72, 105, '#ffd200', '#000000', false),
      createTextObj('SOLO $5.99', w / 2, h * 0.84, 75, '#ffffff', '#00b09b', true, 'pulse')
    );
  } else if (name === 'promo') {
    bgConfig = { type: 'gradient', c1: '#4a00e0', c2: '#8e2de2', img: null };
    layers.push(
      createShapeObj('rect', w / 2, h / 2, 860, 860, '#161824'),
      createTextObj('⚡ OFERTA FLASH ⚡', w / 2, h * 0.22, 60, '#00c4cc', null, false),
      createTextObj('50% OFF', w / 2, h * 0.48, 150, '#ffffff', '#ff0055', true, 'pulse'),
      createTextObj('TOCA AQUÍ PARA CAMBIAR TEXTO', w / 2, h * 0.75, 45, '#cccccc', null, false)
    );
  } else if (name === 'bakery') {
    bgConfig = { type: 'gradient', c1: '#5d2c1e', c2: '#29110a', img: null };
    layers.push(
      createShapeObj('circle', w / 2, h * 0.46, 480, 480, '#f7971e'),
      createTextObj('🥐 RECIÉN HORNEADO', w / 2, h * 0.16, 56, '#ffffff', '#d35400', true),
      createTextObj('PANADERÍA Y PASTELERÍA', w / 2, h * 0.74, 68, '#ffd200', null, false),
      createTextObj('🛵 DELIVERY DISPONIBLE', w / 2, h * 0.86, 54, '#ffffff', '#27ae60', true)
    );
  } else {
    bgConfig = { type: 'gradient', c1: '#0f2027', c2: '#2c5364', img: null };
    layers.push(
      createTextObj('✨ TOCA PARA EDITAR', w / 2, h * 0.25, 70, '#ffffff', '#7d2ae8', true),
      createTextObj('Sube tu producto o video abajo', w / 2, h * 0.5, 48, '#00c4cc', null, false)
    );
  }
}

document.querySelectorAll('.template-card').forEach(card => {
  card.addEventListener('click', () => {
    loadTemplate(card.dataset.tpl, 1080, 1080);
    openEditor(1080, 1080, 'canva');
  });
});

// ==========================================
// 2. CONSTRUCTORES DE CAPAS (TEXTO, FORMAS, IMÁGENES, MARCOS)
// ==========================================
function createTextObj(text, x, y, fontSize = 70, color = '#ffffff', bgBoxColor = '#ff0055', hasBox = false, anim = 'none') {
  return {
    id: Date.now() + Math.random(),
    type: 'text',
    text,
    x, y,
    w: Math.max(260, text.length * (fontSize * 0.58)),
    h: fontSize * 1.6,
    fontSize,
    fontFamily: 'sans-serif',
    color,
    bgBoxColor: bgBoxColor || '#ff0055',
    hasBox,
    scale: 1,
    rotation: 0,
    anim,
    startTime: 0,
    endTime: 10
  };
}

function createShapeObj(shapeType, x, y, w, h, color) {
  return {
    id: Date.now() + Math.random(),
    type: 'shape',
    shapeType, // 'rect' | 'circle' | 'pill' | 'star'
    x, y, w, h,
    color,
    scale: 1,
    rotation: 0,
    anim: 'none',
    startTime: 0,
    endTime: 10
  };
}

// ==========================================
// 3. INTERACCIÓN EN EL LIENZO (CAJA CANVA: MOVER, ESCALAR, ROTAR, DOBLE TOQUE)
// ==========================================
function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const cy = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (cx - rect.left) * (canvas.width / rect.width),
    y: (cy - rect.top) * (canvas.height / rect.height)
  };
}

function selectLayer(layer) {
  selectedLayer = layer;
  if (!layer) {
    floatingActions.classList.add('hidden');
    contextToolbar.classList.add('hidden');
    return;
  }

  floatingActions.classList.remove('hidden');
  contextToolbar.classList.remove('hidden');

  // Mostrar herramientas según el tipo de capa
  const isTxt = layer.type === 'text';
  const isImg = layer.type === 'image';

  document.getElementById('ctxTextTools').classList.toggle('hidden', !isTxt);
  document.getElementById('ctxImageTools').classList.toggle('hidden', !isImg);
  document.getElementById('actEditTxt').style.display = isTxt ? 'inline-block' : 'none';

  if (isTxt) {
    document.getElementById('inpLayerColor').value = layer.color;
    document.getElementById('inpBgBoxColor').value = layer.bgBoxColor;
    document.getElementById('selFont').value = layer.fontFamily;
  }

  document.getElementById('selAnimation').value = layer.anim || 'none';
  document.getElementById('layerStart').value = layer.startTime ?? 0;
  document.getElementById('layerEnd').value = layer.endTime ?? 10;
}

function onPointerDown(e) {
  const pos = getCanvasCoords(e);

  // 1. Verificar si tocó las manijas de Escalar o Rotar de la capa actualmente seleccionada
  if (selectedLayer) {
    const hw = (selectedLayer.w * selectedLayer.scale) / 2;
    const hh = (selectedLayer.h * selectedLayer.scale) / 2;

    // Coordenada de la esquina inferior derecha (Escalar) y superior (Rotar)
    const cos = Math.cos(selectedLayer.rotation);
    const sin = Math.sin(selectedLayer.rotation);

    const cornerX = selectedLayer.x + (hw * cos - hh * sin);
    const cornerY = selectedLayer.y + (hw * sin + hh * cos);

    const rotX = selectedLayer.x - (0 * cos - (-hh - 55) * sin);
    const rotY = selectedLayer.y + (0 * sin + (-hh - 55) * cos);

    if (Math.hypot(pos.x - cornerX, pos.y - cornerY) < 65) {
      dragMode = 'scale';
      dragStart = { x: pos.x, y: pos.y, initScale: selectedLayer.scale };
      return;
    }

    if (Math.hypot(pos.x - rotX, pos.y - rotY) < 65) {
      dragMode = 'rotate';
      return;
    }
  }

  // 2. Buscar qué capa tocó (de arriba hacia abajo)
  let hit = null;
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i];
    const hw = (l.w * l.scale) / 2;
    const hh = (l.h * l.scale) / 2;
    if (Math.abs(pos.x - l.x) <= hw + 25 && Math.abs(pos.y - l.y) <= hh + 25) {
      hit = l;
      break;
    }
  }

  selectLayer(hit);

  if (hit) {
    // Detectar Doble Toque para editar texto rápido (igual a Canva)
    const now = Date.now();
    if (now - lastTapTime < 320 && hit.type === 'text') {
      promptEditText(hit);
      return;
    }
    lastTapTime = now;

    dragMode = 'move';
    dragStart = { x: pos.x - hit.x, y: pos.y - hit.y };
  }
}

function onPointerMove(e) {
  if (!dragMode || !selectedLayer) return;
  e.preventDefault();
  const pos = getCanvasCoords(e);

  if (dragMode === 'move') {
    selectedLayer.x = pos.x - dragStart.x;
    selectedLayer.y = pos.y - dragStart.y;
  } else if (dragMode === 'scale') {
    const dist = Math.hypot(pos.x - selectedLayer.x, pos.y - selectedLayer.y);
    const baseDist = Math.hypot(selectedLayer.w / 2, selectedLayer.h / 2);
    selectedLayer.scale = Math.max(0.2, Math.min(4.0, dist / baseDist));
  } else if (dragMode === 'rotate') {
    selectedLayer.rotation = Math.atan2(pos.y - selectedLayer.y, pos.x - selectedLayer.x) + Math.PI / 2;
  }
}

function onPointerUp() {
  dragMode = null;
}

canvas.addEventListener('touchstart', onPointerDown, { passive: false });
canvas.addEventListener('touchmove', onPointerMove, { passive: false });
canvas.addEventListener('touchend', onPointerUp);
canvas.addEventListener('mousedown', onPointerDown);
canvas.addEventListener('mousemove', onPointerMove);
canvas.addEventListener('mouseup', onPointerUp);

// ==========================================
// 4. EDICIÓN DE CAPAS (TEXTO, COLORES, DUPLICAR, ORDEN, MARCOS)
// ==========================================
function promptEditText(layer) {
  const nuevo = prompt('Editar texto del anuncio:', layer.text);
  if (nuevo !== null && nuevo.trim() !== '') {
    layer.text = nuevo.trim();
    layer.w = Math.max(240, layer.text.length * (layer.fontSize * 0.56));
  }
}

document.getElementById('actEditTxt').addEventListener('click', () => {
  if (selectedLayer && selectedLayer.type === 'text') promptEditText(selectedLayer);
});

document.getElementById('btnOpenTextPrompt').addEventListener('click', () => {
  if (selectedLayer && selectedLayer.type === 'text') promptEditText(selectedLayer);
});

document.getElementById('actDuplicate').addEventListener('click', () => {
  if (!selectedLayer) return;
  const copy = Object.assign({}, selectedLayer, {
    id: Date.now() + Math.random(),
    x: selectedLayer.x + 50,
    y: selectedLayer.y + 50
  });
  layers.push(copy);
  selectLayer(copy);
});

document.getElementById('actLayerUp').addEventListener('click', () => {
  if (!selectedLayer) return;
  const idx = layers.indexOf(selectedLayer);
  if (idx < layers.length - 1) {
    [layers[idx], layers[idx + 1]] = [layers[idx + 1], layers[idx]];
  }
});

document.getElementById('actLayerDown').addEventListener('click', () => {
  if (!selectedLayer) return;
  const idx = layers.indexOf(selectedLayer);
  if (idx > 0) {
    [layers[idx], layers[idx - 1]] = [layers[idx - 1], layers[idx]];
  }
});

document.getElementById('actDelete').addEventListener('click', () => {
  if (!selectedLayer) return;
  layers = layers.filter(l => l.id !== selectedLayer.id);
  selectLayer(null);
});

document.getElementById('btnUndo').addEventListener('click', () => {
  if (selectedLayer) {
    selectedLayer.x = canvas.width / 2;
    selectedLayer.y = canvas.height / 2;
    selectedLayer.rotation = 0;
  }
});

// Propiedades de texto y forma
document.getElementById('inpLayerColor').addEventListener('input', e => {
  if (selectedLayer) selectedLayer.color = e.target.value;
});

document.getElementById('inpBgBoxColor').addEventListener('input', e => {
  if (selectedLayer && selectedLayer.type === 'text') {
    selectedLayer.bgBoxColor = e.target.value;
    selectedLayer.hasBox = true;
  }
});

document.getElementById('btnToggleBox').addEventListener('click', () => {
  if (selectedLayer && selectedLayer.type === 'text') {
    selectedLayer.hasBox = !selectedLayer.hasBox;
  }
});

document.getElementById('selFont').addEventListener('change', e => {
  if (selectedLayer && selectedLayer.type === 'text') {
    selectedLayer.fontFamily = e.target.value;
  }
});

document.getElementById('selAnimation').addEventListener('change', e => {
  if (selectedLayer) selectedLayer.anim = e.target.value;
});

// ==========================================
// 5. CAJÓN INFERIOR (ELEMENTOS, MARCOS, FOTOS, IA)
// ==========================================
document.querySelectorAll('.dock-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    bottomSheet.classList.remove('hidden');
    document.querySelectorAll('.dock-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.sheet-body').forEach(b => b.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(btn.dataset.sheet).classList.add('active');
    document.getElementById('sheetTitle').textContent = btn.dataset.title;
  });
});

document.getElementById('btnCloseSheet').addEventListener('click', () => {
  bottomSheet.classList.add('hidden');
});

// Insertar Formas
document.querySelectorAll('.el-box[data-shape]').forEach(btn => {
  btn.addEventListener('click', () => {
    const sh = createShapeObj(btn.dataset.shape, canvas.width / 2, canvas.height / 2, 340, 240, '#00c4cc');
    layers.push(sh);
    selectLayer(sh);
    bottomSheet.classList.add('hidden');
  });
});

// Aplicar Marcos a Fotos o pedir subir foto dentro de marco
let pendingFrameShape = null;
document.querySelectorAll('.frame-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (selectedLayer && selectedLayer.type === 'image') {
      selectedLayer.frame = btn.dataset.frame;
    } else {
      pendingFrameShape = btn.dataset.frame;
      document.getElementById('inpUploadLayerImg').click();
    }
    bottomSheet.classList.add('hidden');
  });
});

// Insertar Stickers
document.querySelectorAll('.st-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    const t = createTextObj(btn.dataset.st, canvas.width / 2, canvas.height / 2, 65, '#ffffff', btn.dataset.bg, true, 'pulse');
    layers.push(t);
    selectLayer(t);
    bottomSheet.classList.add('hidden');
  });
});

// Insertar Textos desde pestaña Texto
document.getElementById('btnAddHeading').addEventListener('click', () => {
  const t = createTextObj('TÍTULO GRANDE', canvas.width / 2, canvas.height * 0.3, 95, '#ffffff', null, false);
  layers.push(t); selectLayer(t); bottomSheet.classList.add('hidden');
});
document.getElementById('btnAddSub').addEventListener('click', () => {
  const t = createTextObj('$9.99 OFERTA', canvas.width / 2, canvas.height * 0.5, 70, '#ffffff', '#ff0055', true);
  layers.push(t); selectLayer(t); bottomSheet.classList.add('hidden');
});
document.getElementById('btnAddBody').addEventListener('click', () => {
  const t = createTextObj('Escribe los detalles o dirección aquí', canvas.width / 2, canvas.height * 0.7, 45, '#e0e0e0', null, false);
  layers.push(t); selectLayer(t); bottomSheet.classList.add('hidden');
});

// Subir Imagen / Producto como Capa
function addImageLayerFromFile(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(650 / img.width, 650 / img.height);
      const newLayer = {
        id: Date.now(),
        type: 'image',
        img,
        rawFile: file,
        x: canvas.width / 2,
        y: canvas.height / 2,
        w: img.width * ratio,
        h: img.height * ratio,
        scale: 1,
        rotation: 0,
        frame: pendingFrameShape || 'none',
        bright: 100,
        contrast: 100,
        shadow: 25,
        anim: 'none',
        startTime: 0,
        endTime: 10
      };
      pendingFrameShape = null;
      layers.push(newLayer);
      selectLayer(newLayer);
      bottomSheet.classList.add('hidden');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

document.getElementById('inpUploadLayerImg').addEventListener('change', e => {
  if (e.target.files[0]) addImageLayerFromFile(e.target.files[0]);
});

// Intercambiar imagen de la capa seleccionada (Como el botón "Intercambiar" de Canva)
document.getElementById('btnSwapImg').addEventListener('click', () => {
  document.getElementById('inpSwapFile').click();
});
document.getElementById('inpSwapFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file || !selectedLayer || selectedLayer.type !== 'image') return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      selectedLayer.img = img;
      selectedLayer.rawFile = file;
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// Quitar Fondo con IA
document.getElementById('btnRunAiCut').addEventListener('click', async () => {
  if (!selectedLayer || selectedLayer.type !== 'image') return;
  const aiOverlay = document.getElementById('aiOverlay');
  const aiMsg = document.getElementById('aiMsg');

  try {
    aiOverlay.classList.remove('hidden');
    aiMsg.textContent = 'Cargando red neuronal IA...';

    const mod = await import('https://esm.sh/@imgly/background-removal@1.4.5');
    const removeBg = mod.default || mod.removeBackground;

    const outBlob = await removeBg(selectedLayer.rawFile, {
      model: 'small',
      progress: (key, cur, tot) => {
        if (tot > 0) aiMsg.textContent = `Recortando fondo con IA: ${Math.round((cur / tot) * 100)}%`;
      }
    });

    const cleanImg = new Image();
    cleanImg.onload = () => {
      selectedLayer.img = cleanImg;
      aiOverlay.classList.add('hidden');
    };
    cleanImg.src = URL.createObjectURL(outBlob);
  } catch (err) {
    aiOverlay.classList.add('hidden');
    document.getElementById('chkChromaKey').checked = true;
    bottomSheet.classList.remove('hidden');
    document.querySelector('[data-sheet="sheet-ajustes"]').click();
    alert('El visor interno de Spck bloqueó WebAssembly. Se activó el Borrador de Color instantáneo abajo.');
  }
});

document.getElementById('btnOpenChroma').addEventListener('click', () => {
  document.getElementById('chkChromaKey').checked = true;
  document.querySelector('[data-sheet="sheet-ajustes"]').click();
});

document.getElementById('btnOpenAdjust').addEventListener('click', () => {
  document.querySelector('[data-sheet="sheet-ajustes"]').click();
});

// ==========================================
// 6. FONDOS, MULTIMEDIA Y LÍNEA DE TIEMPO CAPCUT
// ==========================================
document.querySelectorAll('.g-circle').forEach(btn => {
  btn.addEventListener('click', () => {
    bgConfig.type = 'gradient';
    bgConfig.c1 = btn.dataset.c1;
    bgConfig.c2 = btn.dataset.c2;
    bgVideo.pause();
  });
});

document.getElementById('customBg1').addEventListener('input', e => { bgConfig.type = 'gradient'; bgConfig.c1 = e.target.value; });
document.getElementById('customBg2').addEventListener('input', e => { bgConfig.type = 'gradient'; bgConfig.c2 = e.target.value; });

document.getElementById('inpUploadBgMedia').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);

  if (file.type.startsWith('image/')) {
    bgVideo.pause();
    const img = new Image();
    img.onload = () => { bgConfig.type = 'image'; bgConfig.img = img; };
    img.src = url;
  } else if (file.type.startsWith('video/')) {
    bgVideo.src = url;
    bgVideo.play();
    bgConfig.type = 'video';
    setEditorMode('capcut');
  }
  bottomSheet.classList.add('hidden');
});

document.getElementById('btnChangeBgVideo').addEventListener('click', () => {
  document.getElementById('inpUploadBgMedia').click();
});

document.getElementById('inputAudioFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  bgAudio.src = URL.createObjectURL(file);
  document.getElementById('audioTrackText').textContent = `🎵 ${file.name}`;
});

// Controles de la Línea de Tiempo
const scrubber = document.getElementById('timelineScrubber');
scrubber.addEventListener('input', e => {
  currentTime = parseFloat(e.target.value);
  if (bgConfig.type === 'video' && bgVideo.duration) {
    bgVideo.currentTime = currentTime % bgVideo.duration;
  }
  updateTimeLabel();
});

document.getElementById('btnPlayTimeline').addEventListener('click', e => {
  isPlayingTimeline = !isPlayingTimeline;
  e.target.textContent = isPlayingTimeline ? '⏸️' : '▶️';
  if (isPlayingTimeline) {
    if (bgConfig.type === 'video') bgVideo.play();
    if (bgAudio.src) bgAudio.play();
  } else {
    bgVideo.pause();
    bgAudio.pause();
  }
});

document.getElementById('btnMuteVideo').addEventListener('click', e => {
  bgVideo.muted = !bgVideo.muted;
  e.target.textContent = bgVideo.muted ? '🔇 Mudo' : '🔊 Audio';
});

document.getElementById('layerStart').addEventListener('input', e => {
  if (selectedLayer) selectedLayer.startTime = parseFloat(e.target.value) || 0;
});
document.getElementById('layerEnd').addEventListener('input', e => {
  if (selectedLayer) selectedLayer.endTime = parseFloat(e.target.value) || 10;
});

function updateTimeLabel() {
  const s = Math.floor(currentTime).toString().padStart(2, '0');
  document.getElementById('timeDisplay').textContent = `00:${s} / 00:10`;
}

// ==========================================
// 7. MOTOR DE RENDERIZADO (60 FPS + ANIMACIONES + MARCOS + MANIJAS CANVA)
// ==========================================
const offCan = document.createElement('canvas');
const offCtx = offCan.getContext('2d', { willReadFrequently: true });

function renderImageWithChromaAndFrame(l, dw, dh) {
  ctx.save();

  // Recorte de Marco (Círculo, Redondeado o Rombo)
  if (l.frame === 'circle') {
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(dw, dh) / 2, 0, Math.PI * 2);
    ctx.clip();
  } else if (l.frame === 'rounded') {
    ctx.beginPath();
    ctx.roundRect(-dw / 2, -dh / 2, dw, dh, 45);
    ctx.clip();
  } else if (l.frame === 'diamond') {
    ctx.beginPath();
    ctx.moveTo(0, -dh / 2);
    ctx.lineTo(dw / 2, 0);
    ctx.lineTo(0, dh / 2);
    ctx.lineTo(-dw / 2, 0);
    ctx.closePath();
    ctx.clip();
  }

  if (document.getElementById('chkChromaKey').checked) {
    offCan.width = l.img.width;
    offCan.height = l.img.height;
    offCtx.drawImage(l.img, 0, 0);
    const hex = document.getElementById('colChromaKey').value;
    const num = parseInt(hex.slice(1), 16);
    const tr = (num >> 16) & 255, tg = (num >> 8) & 255, tb = num & 255;
    const tol = parseInt(document.getElementById('tolChromaKey').value, 10);
    const idata = offCtx.getImageData(0, 0, offCan.width, offCan.height);
    const d = idata.data;
    for (let i = 0; i < d.length; i += 4) {
      if (Math.hypot(d[i] - tr, d[i + 1] - tg, d[i + 2] - tb) < tol) d[i + 3] = 0;
    }
    offCtx.putImageData(idata, 0, 0);
    ctx.drawImage(offCan, -dw / 2, -dh / 2, dw, dh);
  } else {
    ctx.drawImage(l.img, -dw / 2, -dh / 2, dw, dh);
  }

  ctx.restore();
}

let lastFrameStamp = performance.now();

function masterLoop(now) {
  const dt = (now - lastFrameStamp) / 1000;
  lastFrameStamp = now;

  if (isPlayingTimeline) {
    currentTime += dt;
    if (currentTime > totalDuration) currentTime = 0;
    scrubber.value = currentTime;
    updateTimeLabel();
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Dibujar Fondo
  if (bgConfig.type === 'gradient') {
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0, bgConfig.c1);
    g.addColorStop(1, bgConfig.c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (bgConfig.type === 'image' && bgConfig.img) {
    ctx.drawImage(bgConfig.img, 0, 0, canvas.width, canvas.height);
  } else if (bgConfig.type === 'video' && bgVideo.readyState >= 2) {
    ctx.drawImage(bgVideo, 0, 0, canvas.width, canvas.height);
  }

  const br = document.getElementById('adjBright').value;
  const ct = document.getElementById('adjContrast').value;
  const sh = document.getElementById('adjShadow').value;

  // 2. Dibujar Capas
  layers.forEach(l => {
    // Respetar tiempo de inicio y fin en la línea de tiempo
    if (currentTime < (l.startTime ?? 0) || currentTime > (l.endTime ?? 10)) return;

    ctx.save();

    // Calcular animaciones en tiempo real
    let animScale = 1;
    let animOffsetY = 0;
    const t = now / 1000;

    if (l.anim === 'pulse') animScale = 1 + Math.sin(t * 6) * 0.06;
    if (l.anim === 'float') animOffsetY = Math.sin(t * 3) * 18;
    if (l.anim === 'zoomIn') animScale = Math.min(1, ((currentTime - l.startTime) * 2.5) || 1);
    if (l.anim === 'slideUp') animOffsetY = Math.max(0, (0.4 - (currentTime - l.startTime)) * 300);

    ctx.translate(l.x, l.y + animOffsetY);
    ctx.rotate(l.rotation);
    ctx.scale(l.scale * animScale, l.scale * animScale);

    if (l.type === 'shape') {
      ctx.fillStyle = l.color;
      if (l.shapeType === 'rect') {
        ctx.fillRect(-l.w / 2, -l.h / 2, l.w, l.h);
      } else if (l.shapeType === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, l.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (l.shapeType === 'pill') {
        ctx.beginPath();
        ctx.roundRect(-l.w / 2, -l.h / 2, l.w, l.h, l.h / 2);
        ctx.fill();
      } else if (l.shapeType === 'star') {
        ctx.font = `${l.w}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', 0, 0);
      }
    } else if (l.type === 'image') {
      ctx.filter = `brightness(${br}%) contrast(${ct}%) drop-shadow(0px 18px ${sh}px rgba(0,0,0,0.6))`;
      renderImageWithChromaAndFrame(l, l.w, l.h);
      ctx.filter = 'none';
    } else if (l.type === 'text') {
      ctx.font = `900 ${l.fontSize}px ${l.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const m = ctx.measureText(l.text);
      l.w = Math.max(200, m.width + 70);
      l.h = l.fontSize * 1.45;

      if (l.hasBox) {
        ctx.fillStyle = l.bgBoxColor;
        ctx.beginPath();
        ctx.roundRect(-l.w / 2, -l.h / 2, l.w, l.h, 20);
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 10;
      ctx.strokeText(l.text, 0, 0);
      ctx.fillStyle = l.color;
      ctx.fillText(l.text, 0, 0);
    }

    // 3. Dibujar Caja de Transformación Estilo Canva (Borde morado + 4 nodos + Rotador)
    if (selectedLayer && selectedLayer.id === l.id && !isExporting) {
      const hw = l.w / 2;
      const hh = l.h / 2;

      ctx.strokeStyle = '#8b3dff';
      ctx.lineWidth = 4 / l.scale;
      ctx.strokeRect(-hw, -hh, l.w, l.h);

      // 4 Nodos blancos en las esquinas
      const r = 14 / l.scale;
      ctx.fillStyle = '#ffffff';
      [[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh]].forEach(([nx, ny]) => {
        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Nodo especial inferior derecho (Escalar con el dedo)
      ctx.fillStyle = '#00c4cc';
      ctx.beginPath();
      ctx.arc(hw, hh, r * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Manija superior de Rotación
      const rotDist = -hh - (55 / l.scale);
      ctx.beginPath();
      ctx.moveTo(0, -hh);
      ctx.lineTo(0, rotDist);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, rotDist, r * 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  });

  requestAnimationFrame(masterLoop);
}
requestAnimationFrame(masterLoop);

// ==========================================
// 8. EXPORTAR IMAGEN PNG O VIDEO CON AUDIO
// ==========================================
const exportModal = document.getElementById('exportModal');

document.getElementById('btnExportModal').addEventListener('click', () => {
  exportModal.classList.remove('hidden');
});

document.getElementById('btnCloseExport').addEventListener('click', () => {
  exportModal.classList.add('hidden');
});

document.getElementById('btnDownloadPng').addEventListener('click', () => {
  exportModal.classList.add('hidden');
  isExporting = true;
  setTimeout(() => {
    const a = document.createElement('a');
    a.download = `studiox-diseno-${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    isExporting = false;
  }, 60);
});

document.getElementById('btnRecordWebm').addEventListener('click', () => {
  exportModal.classList.add('hidden');
  isExporting = true;
  isPlayingTimeline = true;
  currentTime = 0;

  const stream = canvas.captureStream(30);
  const chunks = [];
  const rec = new MediaRecorder(stream, { mimeType: 'video/webm' });

  rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  rec.onstop = () => {
    isExporting = false;
    isPlayingTimeline = false;
    const blob = new Blob(chunks, { type: 'video/webm' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `studiox-video-${Date.now()}.webm`;
    a.click();
  };

  rec.start();
  setTimeout(() => {
    if (rec.state !== 'inactive') rec.stop();
  }, 5000);
});
