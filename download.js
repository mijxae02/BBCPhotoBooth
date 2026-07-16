const finalCanvas = document.getElementById("finalCanvas");
const ctx = finalCanvas.getContext("2d");
const downloadBtn = document.getElementById("download-btn");
const colorButtons = document.querySelectorAll(".color-btn");

// Default frame (matches your HTML)
let selectedFrameColor = "img/nude.jpg";

const capturedPhotos =
    JSON.parse(sessionStorage.getItem("capturedPhotos")) || [];

if (capturedPhotos.length === 0) {
    console.error("No photos found.");
}

// Canvas settings
const canvasWidth = 240;
const imageHeight = 160;
const spacing = 10;
const framePadding = 10;
const logoSpace = 100;

finalCanvas.width = canvasWidth;
finalCanvas.height =
    framePadding +
    (imageHeight + spacing) * capturedPhotos.length +
    logoSpace;

// Load image helper
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => resolve(img);
        img.onerror = () => reject(`Failed to load ${src}`);

        img.src = src;
    });
}

// Draw everything
async function drawCollage() {
    try {
        // Load background
        const background = await loadImage(selectedFrameColor);

        // Load logo
        const logo = await loadImage("img/logo.png");

        // Load all captured photos
        const photos = await Promise.all(
            capturedPhotos.map(photo => loadImage(photo))
        );

        // Clear canvas
        ctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);

        // Background
        ctx.drawImage(
            background,
            0,
            0,
            finalCanvas.width,
            finalCanvas.height
        );

        // Photos
        photos.forEach((img, index) => {

            const x = framePadding;
            const y = framePadding + index * (imageHeight + spacing);

            ctx.drawImage(
                img,
                x,
                y,
                canvasWidth - framePadding * 2,
                imageHeight
            );
        });

        // Logo
        const logoWidth = 80;
        const logoHeight = 80; // preserve aspect ratio better
        const logoX = (canvasWidth - logoWidth) / 2;
        const logoY = finalCanvas.height - logoSpace + 10;

        ctx.drawImage(
            logo,
            logoX,
            logoY,
            logoWidth,
            logoHeight
        );

    } catch (err) {
        console.error(err);
    }
}

// Change frame
colorButtons.forEach(button => {

    button.addEventListener("click", () => {

        selectedFrameColor = button.dataset.color;

        drawCollage();
    });

});

// Download
downloadBtn.addEventListener("click", () => {

    const link = document.createElement("a");

    link.download = "photobooth.png";
    link.href = finalCanvas.toDataURL("image/png");

    link.click();

});

// Initial draw
drawCollage();