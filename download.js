const finalCanvas = document.getElementById("finalCanvas");
const ctx = finalCanvas.getContext("2d");
const downloadBtn = document.getElementById("download-btn");
const colorButtons = document.querySelectorAll(".color-btn");

let selectedFrameColor = "img/nude.jpg"; // Default frame

let capturedPhotos = JSON.parse(sessionStorage.getItem("capturedPhotos")) || [];

if (capturedPhotos.length === 0) {
    console.error("No photos found in sessionStorage.");
}

// Canvas dimensions
const canvasWidth = 240;
const imageHeight = 160;
const spacing = 10;
const framePadding = 10;
const logoSpace = 100; // Keep this so your photobooth layout stays the same

finalCanvas.width = canvasWidth;
finalCanvas.height =
    framePadding +
    (imageHeight + spacing) * capturedPhotos.length +
    logoSpace;

// Function to draw the collage
function drawCollage() {
    const background = new Image();
    background.src = selectedFrameColor;

    background.onload = () => {
        ctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
        ctx.drawImage(background, 0, 0, finalCanvas.width, finalCanvas.height);

        capturedPhotos.forEach((photo, index) => {
            const img = new Image();
            img.src = photo;

            img.onload = () => {
                const x = framePadding;
                const y = framePadding + index * (imageHeight + spacing);

                ctx.drawImage(
                    img,
                    x,
                    y,
                    canvasWidth - 2 * framePadding,
                    imageHeight
                );
            };

            img.onerror = () =>
                console.error(`Failed to load image ${index + 1}`);
        });

        // Logo removed
    };

    background.onerror = () =>
        console.error("Failed to load background image.");
}

// Change frame color
colorButtons.forEach(button => {
    button.addEventListener("click", (event) => {
        selectedFrameColor = event.target.getAttribute("data-color");
        drawCollage();
    });
});

// Download the final image
downloadBtn.addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = finalCanvas.toDataURL("image/png");
    link.download = "photobooth.png";
    link.click();
});

// Initial drawing
drawCollage();