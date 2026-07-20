console.log("setup.js loaded");

document.addEventListener("DOMContentLoaded", () => {
    const cameraButtons = document.querySelectorAll("#camera-choice .option-btn");
    const layoutButtons = document.querySelectorAll("#layout-choice .option-btn");
    const startBtn = document.getElementById("start-btn");

    if (!startBtn) {
        console.error("start-btn not found — check index.html has <button id='start-btn'>");
        return;
    }

    cameraButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            cameraButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            window.selectedFacing = btn.dataset.facing;
            console.log("Camera set to:", window.selectedFacing);
        });
    });

    layoutButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            layoutButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            window.totalPhotos = parseInt(btn.dataset.count, 10);
            window.selectedCols = parseInt(btn.dataset.cols, 10);
            console.log("Layout set to:", window.totalPhotos, "photos,", window.selectedCols, "cols");
        });
    });

    // Defaults if user clicks Start without choosing
    window.selectedFacing = window.selectedFacing || "user";
    window.totalPhotos = window.totalPhotos || 3;
    window.selectedCols = window.selectedCols || 1;

    startBtn.addEventListener("click", () => {
        console.log("Start clicked with:", window.selectedFacing, window.totalPhotos, window.selectedCols);

        document.getElementById("setup-screen").style.display = "none";
        document.getElementById("camera-screen").style.display = "block";

        document.getElementById("counter").textContent = `0/${window.totalPhotos}`;
        sessionStorage.setItem("photoCols", window.selectedCols);

        // Tell script.js it's time to start the camera
        window.dispatchEvent(new Event("startPhotobooth"));
    });
});