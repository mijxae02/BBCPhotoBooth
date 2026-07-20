console.log("script.js loaded");

const video = document.getElementById("video");
const countdownEl = document.getElementById("countdown");
const counterEl = document.getElementById("counter");
const shutterOverlay = document.createElement("div");
shutterOverlay.style.position = "absolute";
shutterOverlay.style.top = "0";
shutterOverlay.style.left = "0";
shutterOverlay.style.width = "100%";
shutterOverlay.style.height = "100%";
shutterOverlay.style.background = "white";
shutterOverlay.style.opacity = "0";
shutterOverlay.style.transition = "opacity 0.2s ease-out";
document.body.appendChild(shutterOverlay);

const shutterSound = new Audio("shutter.mp3");
const countdownSound = new Audio("countdown.mp3");

const capturedPhotos = [];
let capturedCount = 0;
const isMobile = window.innerWidth <= 600;

// Wait for setup.js to tell us the user hit Start
window.addEventListener("startPhotobooth", () => {
    console.log("startPhotobooth event received");
    startCamera();
});

function startCamera() {
    const facing = window.selectedFacing || "user";

    const videoConstraints = {
        video: {
            facingMode: facing,
            width: isMobile ? { ideal: 480 } : { ideal: 640 },
            height: isMobile ? { ideal: 640 } : { ideal: 480 }
        }
    };

    navigator.mediaDevices.getUserMedia(videoConstraints)
        .then(stream => {
            video.srcObject = stream;
            video.play();
            capturePhotoWithCountdown();
        })
        .catch(err => console.error("Camera access denied", err));
}

function capturePhotoWithCountdown() {
    const totalPhotos = window.totalPhotos || 3;

    if (capturedCount >= totalPhotos) {
        redirectToDownload();
        return;
    }

    let timeLeft = 3;
    countdownEl.textContent = timeLeft;
    counterEl.textContent = `${capturedCount}/${totalPhotos}`;
    countdownSound.play();
    const countdownInterval = setInterval(() => {
        timeLeft--;
        countdownEl.textContent = timeLeft;
        countdownSound.play();

        if (timeLeft === 1) {
            triggerShutterAnimation();
        }

        if (timeLeft <= 1) {
            clearInterval(countdownInterval);
            capturePhoto();
        }
    }, 1000);
}

function capturePhoto() {
    const totalPhotos = window.totalPhotos || 3;
    const facing = window.selectedFacing || "user";

    const canvas = document.createElement("canvas");
    canvas.width = isMobile ? 480 : 640;
    canvas.height = isMobile ? 640 : 480;
    const ctx = canvas.getContext("2d");

    if (facing === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    capturedPhotos.push(canvas.toDataURL("image/png"));
    capturedCount++;
    counterEl.textContent = `${capturedCount}/${totalPhotos}`;

    setTimeout(capturePhotoWithCountdown, 1000);
}

function triggerShutterAnimation() {
    shutterOverlay.style.opacity = "1";
    shutterSound.play();
    setTimeout(() => {
        shutterOverlay.style.opacity = "0";
    }, 100);
}

function redirectToDownload() {
    sessionStorage.setItem("capturedPhotos", JSON.stringify(capturedPhotos));
    window.location.href = "download.html";
}