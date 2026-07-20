console.log("script.js loaded");

const video = document.getElementById("video");
const countdownEl = document.getElementById("countdown");
const counterEl = document.getElementById("counter");
const setupScreen = document.getElementById("setup-screen");
const cameraContainer = document.querySelector(".camera-container");
const startBtn = document.getElementById("start-btn");

console.log("Elements found:", {
    video,
    countdownEl,
    counterEl,
    setupScreen,
    cameraContainer,
    startBtn
});

const shutterOverlay = document.createElement("div");
shutterOverlay.style.position = "absolute";
shutterOverlay.style.top = "0";
shutterOverlay.style.left = "0";
shutterOverlay.style.width = "100%";
shutterOverlay.style.height = "100%";
shutterOverlay.style.background = "white";
shutterOverlay.style.opacity = "0";
shutterOverlay.style.transition = "opacity 0.2s ease-out";
shutterOverlay.style.pointerEvents = "none";
document.body.appendChild(shutterOverlay);

const shutterSound = new Audio("shutter.mp3");
const countdownSound = new Audio("countdown.mp3");

const capturedPhotos = [];
let capturedCount = 0;

// User selections (defaults)
let selectedFacingMode = "user";
let selectedSize = { width: 480, height: 640 }; // portrait default

const SIZE_PRESETS = {
    portrait: { width: 480, height: 640 },
    square: { width: 600, height: 600 },
    landscape: { width: 640, height: 480 }
};

// Handle camera choice buttons
document.querySelectorAll("[data-camera]").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll("[data-camera]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedFacingMode = btn.dataset.camera;
        console.log("Camera selected:", selectedFacingMode);
    });
});

// Handle size choice buttons
document.querySelectorAll("[data-size]").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll("[data-size]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedSize = SIZE_PRESETS[btn.dataset.size];
        console.log("Size selected:", selectedSize);
    });
});

// Fix for mobile Chrome black screen issue
if (video) {
    video.setAttribute("playsinline", true);
    video.setAttribute("autoplay", true);
    video.setAttribute("muted", true);
}

if (startBtn) {
    startBtn.addEventListener("click", () => {
        console.log("Start button clicked");
        setupScreen.style.display = "none";
        cameraContainer.style.display = "block";
        startCamera();
    });
} else {
    console.error("start-btn not found in DOM — check your HTML id matches exactly.");
}

function startCamera() {
    const videoConstraints = {
        video: {
            facingMode: selectedFacingMode,
            width: { ideal: selectedSize.width },
            height: { ideal: selectedSize.height }
        }
    };

    console.log("Requesting camera with constraints:", videoConstraints);

    // Mirror the LIVE PREVIEW only for front camera
    if (selectedFacingMode === "user") {
        video.style.transform = "scaleX(-1)";
    } else {
        video.style.transform = "scaleX(1)";
    }

    navigator.mediaDevices.getUserMedia(videoConstraints)
        .then(stream => {
            console.log("Camera stream acquired");
            video.srcObject = stream;
            video.play();
            startCaptureProcess();
        })
        .catch(err => console.error("Camera access denied or failed:", err));
}

// Start auto capture process
function startCaptureProcess() {
    capturePhotoWithCountdown();
}

// Countdown and capture photo
function capturePhotoWithCountdown() {
    if (capturedCount >= 4) {
        redirectToDownload();
        return;
    }

    let timeLeft = 3;
    countdownEl.textContent = timeLeft;
    counterEl.textContent = `${capturedCount}/4`;
    countdownSound.play().catch(e => console.warn("countdown sound blocked:", e));
    const countdownInterval = setInterval(() => {
        timeLeft--;
        countdownEl.textContent = timeLeft;
        countdownSound.play().catch(e => console.warn("countdown sound blocked:", e));

        if (timeLeft === 1) {
            triggerShutterAnimation();
        }

        if (timeLeft <= 1) {
            clearInterval(countdownInterval);
            capturePhoto();
        }
    }, 1000);
}

// Capture photo
function capturePhoto() {
    const canvas = document.createElement("canvas");
    canvas.width = selectedSize.width;
    canvas.height = selectedSize.height;
    const ctx = canvas.getContext("2d");

    // Only flip the CAPTURED image for front camera (mirror effect)
    // Back camera should capture exactly what the sensor sees — no flip
    if (selectedFacingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    capturedPhotos.push(canvas.toDataURL("image/png"));
    capturedCount++;
    counterEl.textContent = `${capturedCount}/4`;

    setTimeout(capturePhotoWithCountdown, 1000);
}

// Shutter animation
function triggerShutterAnimation() {
    shutterOverlay.style.opacity = "1";
    shutterSound.play().catch(e => console.warn("shutter sound blocked:", e));
    setTimeout(() => {
        shutterOverlay.style.opacity = "0";
    }, 100);
}

// Redirect to download page with captured images
function redirectToDownload() {
    sessionStorage.setItem("capturedPhotos", JSON.stringify(capturedPhotos));
    window.location.href = "download.html";
}