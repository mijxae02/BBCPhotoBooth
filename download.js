const finalCanvas = document.getElementById("finalCanvas");
const ctx = finalCanvas.getContext("2d");
const downloadBtn = document.getElementById("download-btn");
const colorButtons = document.querySelectorAll(".color-btn");

let selectedFrameColor = "img/nude.jpg"; // Default frame

const capturedPhotos = JSON.parse(sessionStorage.getItem("capturedPhotos")) || [];

if (capturedPhotos.length === 0) {
    console.error("No photos found in sessionStorage.");
}

// Canvas dimensions
const canvasWidth = 240;
const imageHeight = 160;
const spacing = 10;
const framePadding = 10;
const bottomPadding = 20;

finalCanvas.width = canvasWidth;
finalCanvas.height =
    framePadding +
    (imageHeight + spacing) * capturedPhotos.length +
    bottomPadding;

// Helper function to load images
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => resolve(img);
        img.onerror = () => reject(`Failed to load ${src}`);

        img.src = src;
    });
}

// Draw collage
async function drawCollage() {
    try {
        const background = await loadImage(selectedFrameColor);

        const photos = await Promise.all(
            capturedPhotos.map(photo => loadImage(photo))
        );

        ctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);

        // Draw background/frame
        ctx.drawImage(
            background,
            0,
            0,
            finalCanvas.width,
            finalCanvas.height
        );

        // Draw photos
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

// Download image
downloadBtn.addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = finalCanvas.toDataURL("image/png");
    link.download = "photobooth.png";
    link.click();
});

// Initial draw
drawCollage();