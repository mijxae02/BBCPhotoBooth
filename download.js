const finalCanvas = document.getElementById("finalCanvas");
const ctx = finalCanvas.getContext("2d");
const flashOverlay = document.getElementById("flash-overlay");

const downloadBtn = document.getElementById("download-btn");
const colorButtons = document.querySelectorAll(".color-btn");
const customColorInput = document.getElementById("custom-color");
const patternButtons = document.querySelectorAll(".pattern-btn");
const filterButtons = document.querySelectorAll(".filter-btn");
const iconButtons = document.querySelectorAll(".icon-btn");
const undoBtn = document.getElementById("undo-btn");
const clearBtn = document.getElementById("clear-btn");
const surpriseBtn = document.getElementById("surprise-btn");
const vignetteToggle = document.getElementById("vignette-toggle");
const grainToggle = document.getElementById("grain-toggle");
const timestampToggle = document.getElementById("timestamp-toggle");
const captionInput = document.getElementById("caption-input");

let selectedBgColor = "#F6E9D8";
let selectedPattern = "solid";
let selectedFilter = "original";
let armedType = null;
let speckleDots = null;
let grainDots = null;
let stickers = []; // {type, x, y, size, rot}
let draggingIndex = null;

let capturedPhotos =
    JSON.parse(sessionStorage.getItem("capturedPhotos")) || [];

if (capturedPhotos.length === 0) {
    console.error("No photos found in sessionStorage.");
}

// =======================
// FILMSTRIP DIMENSIONS
// =======================

const SCALE = 3;
const holeMargin = 18 * SCALE;
const contentWidth = 240 * SCALE;
const canvasWidth = contentWidth + holeMargin * 2;
const imageHeight = 160 * SCALE;
const spacing = 10 * SCALE;
const framePadding = 10 * SCALE;
const bottomSpace = 110 * SCALE;

finalCanvas.width = canvasWidth;
finalCanvas.height =
    framePadding +
    (imageHeight + spacing) * capturedPhotos.length +
    bottomSpace;

ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(`Failed to load: ${src}`);
        img.src = src;
    });
}

let loadedPhotos = [];

// =======================
// COLOR HELPERS
// =======================

function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean.length === 3
        ? clean.split("").map(c => c + c).join("")
        : clean, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function shade(hex, amt) {
    const { r, g, b } = hexToRgb(hex);
    const adj = v => Math.max(0, Math.min(255, v + amt));
    return `rgb(${adj(r)}, ${adj(g)}, ${adj(b)})`;
}

function relLuminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// =======================
// FILTER MAP
// =======================

const FILTERS = {
    original: "none",
    bw: "grayscale(1) contrast(1.05)",
    sepia: "sepia(0.85) contrast(1.05) brightness(1.02)",
    vintage: "sepia(0.4) saturate(1.3) contrast(0.92) brightness(1.05) hue-rotate(-8deg)",
    cool: "saturate(1.1) hue-rotate(150deg) brightness(1.02)",
    warm: "saturate(1.15) hue-rotate(-12deg) brightness(1.05)",
    contrast: "contrast(1.35) saturate(1.2)"
};

// =======================
// BACKGROUND / TEXTURE
// =======================

function buildSpeckleDots() {
    const dots = [];
    const palette = [shade(selectedBgColor, 40), shade(selectedBgColor, -40), shade(selectedBgColor, 70), shade(selectedBgColor, -70)];
    for (let i = 0; i < 140; i++) {
        dots.push({
            x: Math.random() * canvasWidth,
            y: Math.random() * finalCanvas.height,
            r: (Math.random() * 3 + 1.5) * SCALE,
            color: palette[Math.floor(Math.random() * palette.length)]
        });
    }
    return dots;
}

function buildGrain() {
    const dots = [];
    for (let i = 0; i < 900; i++) {
        dots.push({
            x: Math.random() * canvasWidth,
            y: Math.random() * finalCanvas.height,
            r: Math.random() * 1.1 * SCALE,
            a: Math.random() * 0.12,
            dark: Math.random() > 0.5
        });
    }
    return dots;
}

function drawBackground() {
    ctx.fillStyle = selectedBgColor;
    ctx.fillRect(0, 0, canvasWidth, finalCanvas.height);

    if (selectedPattern === "dots") {
        const dotColor = shade(selectedBgColor, -35);
        const spacingPx = 26 * SCALE / 3;
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = dotColor;
        for (let y = spacingPx / 2; y < finalCanvas.height; y += spacingPx) {
            for (let x = spacingPx / 2; x < canvasWidth; x += spacingPx) {
                ctx.beginPath();
                ctx.arc(x, y, 3.2 * SCALE / 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    } else if (selectedPattern === "stripes") {
        const stripeColor = shade(selectedBgColor, -30);
        const stripeWidth = 18 * SCALE / 3;
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = stripeColor;
        for (let x = -finalCanvas.height; x < canvasWidth; x += stripeWidth * 2) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + finalCanvas.height, finalCanvas.height);
            ctx.lineTo(x + finalCanvas.height + stripeWidth, finalCanvas.height);
            ctx.lineTo(x + stripeWidth, 0);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    } else if (selectedPattern === "speckle") {
        if (!speckleDots) speckleDots = buildSpeckleDots();
        speckleDots.forEach(dot => {
            ctx.beginPath();
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = dot.color;
            ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }
}

// =======================
// SPROCKET HOLES
// =======================

function drawSprocketHoles() {
    const holeColor = shade(selectedBgColor, relLuminance(selectedBgColor) > 0.5 ? -55 : 55);
    const holeRadius = 6 * SCALE;
    const step = 34 * SCALE;

    ctx.fillStyle = holeColor;
    ctx.globalAlpha = 0.5;

    for (let y = step / 2; y < finalCanvas.height; y += step) {
        ctx.beginPath();
        ctx.arc(holeMargin / 2 + 2 * SCALE, y, holeRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(canvasWidth - holeMargin / 2 - 2 * SCALE, y, holeRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// =======================
// PHOTOS
// =======================

function drawPhotos(alpha = 1, offsetY = 0) {
    ctx.save();
    ctx.globalAlpha = alpha;

    loadedPhotos.forEach((img, index) => {
        const x = framePadding + holeMargin;
        const y = framePadding + index * (imageHeight + spacing) + offsetY;
        const w = contentWidth - framePadding * 2;
        const h = imageHeight;

        ctx.fillStyle = "#FFFDF9";
        ctx.fillRect(x - 6, y - 6, w + 12, h + 12);

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();

        ctx.filter = FILTERS[selectedFilter] || "none";
        ctx.drawImage(img, x, y, w, h);
        ctx.filter = "none";

        if (vignetteToggle.checked) {
            const vg = ctx.createRadialGradient(
                x + w / 2, y + h / 2, h * 0.2,
                x + w / 2, y + h / 2, h * 0.75
            );
            vg.addColorStop(0, "rgba(0,0,0,0)");
            vg.addColorStop(1, "rgba(0,0,0,0.35)");
            ctx.fillStyle = vg;
            ctx.fillRect(x, y, w, h);
        }

        ctx.restore();
    });

    ctx.restore();
}

// =======================
// FILM GRAIN
// =======================

function drawGrain() {
    if (!grainToggle.checked) return;
    if (!grainDots) grainDots = buildGrain();

    grainDots.forEach(d => {
        ctx.beginPath();
        ctx.globalAlpha = d.a;
        ctx.fillStyle = d.dark ? "#000" : "#fff";
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

// =======================
// TIMESTAMP + CAPTION
// =======================

function drawFooter() {
    const footerTop = finalCanvas.height - bottomSpace;
    const textColor = relLuminance(selectedBgColor) > 0.55 ? "#2A1B12" : "#F6E9D8";

    ctx.textAlign = "center";
    ctx.fillStyle = textColor;

    ctx.font = `${16 * SCALE / 3 * 2}px 'Space Mono', monospace`;
    ctx.fillText("BERN THE BEANS", canvasWidth / 2, footerTop + 30 * SCALE / 3 * 2);

    if (timestampToggle.checked) {
        const now = new Date();
        const stamp = now.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "numeric" }) +
            "  " + now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
        ctx.font = `${11 * SCALE / 3 * 2}px 'Space Mono', monospace`;
        ctx.globalAlpha = 0.75;
        ctx.fillText(stamp, canvasWidth / 2, footerTop + 52 * SCALE / 3 * 2);
        ctx.globalAlpha = 1;
    }

    const caption = captionInput.value.trim();
    if (caption) {
        ctx.font = `italic ${14 * SCALE / 3 * 2}px 'Caveat', cursive`;
        ctx.fillText(caption, canvasWidth / 2, footerTop + 78 * SCALE / 3 * 2);
    }
}

// =======================
// CUSTOM VECTOR STICKERS
// (replaces emoji — drawn as paths so they look
//  identical on every device and match the theme)
// =======================

const RUST = "#A8512B";
const COCOA = "#6F4630";
const COFFEE = "#2A1B12";
const CARAMEL = "#C68958";
const FOAM = "#FFFDF9";

function strokeOutline(width) {
    ctx.lineJoin = "round";
    ctx.strokeStyle = FOAM;
    ctx.lineWidth = width;
}

// Each shape is drawn centered on (0,0) at a 48-unit baseline,
// then the caller scales/rotates/translates as needed.

function drawCupShape() {
    // saucer
    ctx.beginPath();
    ctx.ellipse(0, 15, 20, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = FOAM;
    ctx.fill();
    strokeOutline(1.5);
    ctx.stroke();

    // cup body
    ctx.beginPath();
    ctx.moveTo(-13, -8);
    ctx.lineTo(13, -8);
    ctx.lineTo(10, 12);
    ctx.quadraticCurveTo(0, 17, -10, 12);
    ctx.closePath();
    ctx.fillStyle = RUST;
    strokeOutline(1.5);
    ctx.fill();
    ctx.stroke();

    // handle
    ctx.beginPath();
    ctx.arc(16, 0, 6, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = RUST;
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = FOAM;
    ctx.stroke();

    // steam
    ctx.strokeStyle = COCOA;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    [-6, 0, 6].forEach((sx, i) => {
        ctx.beginPath();
        ctx.moveTo(sx, -10);
        ctx.quadraticCurveTo(sx - 4, -18, sx, -24);
        ctx.globalAlpha = 0.6;
        ctx.stroke();
    });
    ctx.globalAlpha = 1;
}

function drawBeanShape() {
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 22, Math.PI / 5, 0, Math.PI * 2);
    ctx.fillStyle = COCOA;
    strokeOutline(1.5);
    ctx.fill();
    ctx.stroke();

    // center crease
    ctx.beginPath();
    ctx.moveTo(-2, -19);
    ctx.quadraticCurveTo(2, 0, -2, 19);
    ctx.strokeStyle = COFFEE;
    ctx.lineWidth = 2.2;
    ctx.stroke();
}

function drawHeartShape() {
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.bezierCurveTo(-22, -8, -12, -24, 0, -10);
    ctx.bezierCurveTo(12, -24, 22, -8, 0, 10);
    ctx.closePath();
    ctx.fillStyle = RUST;
    strokeOutline(1.5);
    ctx.fill();
    ctx.stroke();
}

function drawStarShape() {
    const spikes = 5, outerR = 20, innerR = 8;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = (Math.PI / spikes) * i - Math.PI / 2;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = CARAMEL;
    strokeOutline(1.5);
    ctx.fill();
    ctx.stroke();
}

function drawSparkleShape() {
    // four-point twinkle: two crossed elongated diamonds
    function diamond(len, width) {
        ctx.beginPath();
        ctx.moveTo(0, -len);
        ctx.quadraticCurveTo(width, 0, 0, len);
        ctx.quadraticCurveTo(-width, 0, 0, -len);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = COFFEE;
    ctx.save();
    diamond(22, 5);
    ctx.restore();
    ctx.save();
    ctx.rotate(Math.PI / 2);
    diamond(13, 3);
    ctx.restore();
}

function drawLeafShape() {
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.quadraticCurveTo(-20, 10, -10, -18);
    ctx.quadraticCurveTo(0, -22, 10, -18);
    ctx.quadraticCurveTo(20, 10, 0, 20);
    ctx.closePath();
    ctx.fillStyle = "#6E8B4A";
    strokeOutline(1.5);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.quadraticCurveTo(0, 0, 0, -18);
    ctx.strokeStyle = "#3F5A2A";
    ctx.lineWidth = 1.6;
    ctx.stroke();
}

const STICKER_SHAPES = {
    cup: drawCupShape,
    bean: drawBeanShape,
    heart: drawHeartShape,
    star: drawStarShape,
    sparkle: drawSparkleShape,
    leaf: drawLeafShape
};

function drawStickers() {
    stickers.forEach(s => {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.scale(s.size / 48, s.size / 48);
        const draw = STICKER_SHAPES[s.type];
        if (draw) draw();
        ctx.restore();
    });
}

function stickerAt(x, y) {
    for (let i = stickers.length - 1; i >= 0; i--) {
        const s = stickers[i];
        if (Math.hypot(x - s.x, y - s.y) < s.size * 0.6) return i;
    }
    return -1;
}

// =======================
// MASTER RENDER
// =======================

function renderFrame(photoAlpha = 1, photoOffsetY = 0) {
    ctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
    drawBackground();
    drawSprocketHoles();
    drawPhotos(photoAlpha, photoOffsetY);
    drawGrain();
    drawFooter();
    drawStickers();
}

// =======================
// FLASH-BULB INTRO
// =======================

function playFlashIntro() {
    flashOverlay.classList.add("flash-fire");
    setTimeout(() => {
        renderFrame(1, 0);
        flashOverlay.classList.remove("flash-fire");
        flashOverlay.classList.add("flash-fade");
    }, 220);
    setTimeout(() => {
        flashOverlay.classList.remove("flash-fade");
    }, 900);
}

async function init() {
    try {
        loadedPhotos = await Promise.all(capturedPhotos.map(photo => loadImage(photo)));
        renderFrame(1, 0);
        playFlashIntro();
    } catch (error) {
        console.error(error);
    }
}

// =======================
// CONTROLS
// =======================

colorButtons.forEach(button => {
    if (!button.dataset.color) return;
    button.addEventListener("click", () => {
        selectedBgColor = button.dataset.color;
        speckleDots = null;
        colorButtons.forEach(b => b.classList.remove("selected"));
        button.classList.add("selected");
        renderFrame();
    });
});

customColorInput.addEventListener("input", (e) => {
    selectedBgColor = e.target.value;
    speckleDots = null;
    colorButtons.forEach(b => b.classList.remove("selected"));
    renderFrame();
});

patternButtons.forEach(button => {
    button.addEventListener("click", () => {
        selectedPattern = button.dataset.pattern;
        if (selectedPattern === "speckle") speckleDots = null;
        patternButtons.forEach(b => b.classList.remove("selected"));
        button.classList.add("selected");
        renderFrame();
    });
});

filterButtons.forEach(button => {
    button.addEventListener("click", () => {
        selectedFilter = button.dataset.filter;
        filterButtons.forEach(b => b.classList.remove("selected"));
        button.classList.add("selected");
        renderFrame();
    });
});

[vignetteToggle, grainToggle, timestampToggle].forEach(toggle => {
    toggle.addEventListener("change", () => renderFrame());
});

captionInput.addEventListener("input", () => renderFrame());

iconButtons.forEach(button => {
    button.addEventListener("click", () => {
        const type = button.dataset.type;
        if (armedType === type) {
            armedType = null;
            button.classList.remove("armed");
        } else {
            iconButtons.forEach(b => b.classList.remove("armed"));
            armedType = type;
            button.classList.add("armed");
        }
    });
});

function getCanvasPos(e) {
    const rect = finalCanvas.getBoundingClientRect();
    const scaleX = finalCanvas.width / rect.width;
    const scaleY = finalCanvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}

finalCanvas.addEventListener("pointerdown", (e) => {
    const pos = getCanvasPos(e);
    const hitIndex = stickerAt(pos.x, pos.y);

    if (hitIndex !== -1) {
        draggingIndex = hitIndex;
        finalCanvas.setPointerCapture(e.pointerId);
        return;
    }

    if (armedType) {
        stickers.push({
            type: armedType,
            x: pos.x,
            y: pos.y,
            size: 46 * SCALE,
            rot: (Math.random() * 30 - 15) * Math.PI / 180
        });
        renderFrame();
    }
});

finalCanvas.addEventListener("pointermove", (e) => {
    if (draggingIndex === null) return;
    const pos = getCanvasPos(e);
    stickers[draggingIndex].x = Math.max(0, Math.min(canvasWidth, pos.x));
    stickers[draggingIndex].y = Math.max(0, Math.min(finalCanvas.height, pos.y));
    renderFrame();
});

finalCanvas.addEventListener("pointerup", () => { draggingIndex = null; });

finalCanvas.addEventListener("dblclick", (e) => {
    const pos = getCanvasPos(e);
    const hitIndex = stickerAt(pos.x, pos.y);
    if (hitIndex !== -1) {
        stickers.splice(hitIndex, 1);
        renderFrame();
    }
});

undoBtn.addEventListener("click", () => { stickers.pop(); renderFrame(); });
clearBtn.addEventListener("click", () => { stickers = []; renderFrame(); });

surpriseBtn.addEventListener("click", () => {
    const colors = ["#F6E9D8", "#FFFDF9", "#C68958", "#A8512B", "#4A2E1E", "#2A1B12"];
    const patterns = ["solid", "dots", "stripes", "speckle"];
    const filters = Object.keys(FILTERS);
    const types = Object.keys(STICKER_SHAPES);

    selectedBgColor = colors[Math.floor(Math.random() * colors.length)];
    selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
    selectedFilter = filters[Math.floor(Math.random() * filters.length)];
    speckleDots = null;

    colorButtons.forEach(b => b.classList.remove("selected"));
    patternButtons.forEach(b => b.classList.remove("selected"));
    filterButtons.forEach(b => b.classList.remove("selected"));

    stickers = [];
    const stickerCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < stickerCount; i++) {
        stickers.push({
            type: types[Math.floor(Math.random() * types.length)],
            x: Math.random() * canvasWidth,
            y: Math.random() * (finalCanvas.height - bottomSpace),
            size: (36 + Math.random() * 22) * SCALE,
            rot: (Math.random() * 40 - 20) * Math.PI / 180
        });
    }

    renderFrame();
    finalCanvas.classList.remove("pop");
    void finalCanvas.offsetWidth;
    finalCanvas.classList.add("pop");
});

// =======================
// CONFETTI
// =======================

function launchConfetti() {
    const pieces = "🎉✨🎊☕💛".split("");
    const container = document.createElement("div");
    container.className = "confetti-layer";
    document.body.appendChild(container);

    for (let i = 0; i < 28; i++) {
        const piece = document.createElement("span");
        piece.className = "confetti-piece";
        piece.textContent = pieces[Math.floor(Math.random() * pieces.length)];
        piece.style.left = Math.random() * 100 + "vw";
        piece.style.animationDuration = (1.4 + Math.random() * 1.2) + "s";
        piece.style.animationDelay = (Math.random() * 0.3) + "s";
        piece.style.fontSize = (14 + Math.random() * 16) + "px";
        container.appendChild(piece);
    }

    setTimeout(() => container.remove(), 3000);
}

// =======================
// DOWNLOAD
// =======================

downloadBtn.addEventListener("click", () => {
    launchConfetti();
    const link = document.createElement("a");
    link.download = "photobooth-strip.png";
    link.href = finalCanvas.toDataURL("image/png", 1.0);
    link.click();
});

init();