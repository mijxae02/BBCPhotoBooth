const finalCanvas = document.getElementById("finalCanvas");
const ctx = finalCanvas.getContext("2d");

const downloadBtn = document.getElementById("download-btn");
const colorButtons = document.querySelectorAll(".color-btn");

let selectedFrameColor = "img/nude.jpg";

let capturedPhotos =
    JSON.parse(sessionStorage.getItem("capturedPhotos")) || [];

if (capturedPhotos.length === 0) {
    console.error("No photos found in sessionStorage.");
}


// =======================
// HD SCALE SETTINGS
// =======================

const SCALE = 3; // 3x HD quality

const canvasWidth = 240 * SCALE;
const imageHeight = 160 * SCALE;
const spacing = 10 * SCALE;
const framePadding = 10 * SCALE;
const logoSpace = 100 * SCALE; // keep original layout space


// Canvas size
finalCanvas.width = canvasWidth;
finalCanvas.height =
    framePadding +
    (imageHeight + spacing) * capturedPhotos.length +
    logoSpace;


// High quality rendering
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";


// Load image helper
function loadImage(src) {
    return new Promise((resolve, reject) => {

        const img = new Image();

        img.onload = () => resolve(img);

        img.onerror = () =>
            reject(`Failed to load: ${src}`);

        img.src = src;
    });
}


// =======================
// DRAW PHOTOBOOTH
// =======================

async function drawCollage() {

    try {

        const background =
            await loadImage(selectedFrameColor);


        const photos =
            await Promise.all(
                capturedPhotos.map(photo =>
                    loadImage(photo)
                )
            );


        // Clear canvas
        ctx.clearRect(
            0,
            0,
            finalCanvas.width,
            finalCanvas.height
        );


        // Draw frame/background
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

            const y =
                framePadding +
                index * (imageHeight + spacing);


            ctx.drawImage(
                img,
                x,
                y,
                canvasWidth - framePadding * 2,
                imageHeight
            );

        });


        // Logo removed


    } catch(error) {

        console.error(error);

    }

}



// =======================
// FRAME BUTTONS
// =======================

colorButtons.forEach(button => {

    button.addEventListener("click", () => {

        selectedFrameColor =
            button.getAttribute("data-color");

        drawCollage();

    });

});



// =======================
// DOWNLOAD
// =======================

downloadBtn.addEventListener("click", () => {

    const link = document.createElement("a");

    link.download = "photobooth-HD.png";

    link.href =
        finalCanvas.toDataURL(
            "image/png",
            1.0
        );

    link.click();

});



// First render
drawCollage();