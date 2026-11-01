"use strict";

/*
  Jem Photo Studio Pro
  Background editor + Manual Eraser + AI integration

  OFFLINE AI:
  Add a local AI integration that exposes:
  window.JemAI.removeBackground(dataUrl)
  It must return a transparent PNG data URL, Blob, or image URL.

  ONLINE AI:
  Configure ONLINE_AI_ENDPOINT below to your own backend.
  Do not put private API keys in this browser-side file.
*/

const ONLINE_AI_ENDPOINT = "/api/remove-background";

const $ = (id) => document.getElementById(id);

const canvas = $("preview-canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const photoInput = $("photo-input");
const bgInput = $("bg-input");
const statusBox = $("status");

let originalImage = null;
let backgroundImage = null;
let maskCanvas = document.createElement("canvas");
let maskCtx = maskCanvas.getContext("2d");

let backgroundColor = null;
let backgroundBlur = 0;
let brushSize = 35;
let brushMode = "erase";
let isDrawing = false;

let brightness = 100;
let contrast = 100;
let saturation = 100;

let history = [];
let historyIndex = -1;
const MAX_HISTORY = 20;

function status(message) {
  statusBox.textContent = message;
}

function hasPhoto() {
  if (!originalImage) {
    status("Please upload your main photo first.");
    return false;
  }
  return true;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load this image."));
    };

    img.src = url;
  });
}

function createFullMask() {
  if (!originalImage) return;

  maskCanvas.width = originalImage.naturalWidth;
  maskCanvas.height = originalImage.naturalHeight;

  maskCtx = maskCanvas.getContext("2d", {
    willReadFrequently: true
  });

  maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  maskCtx.fillStyle = "#ffffff";
  maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
}

function saveHistory() {
  if (!originalImage) return;

  try {
    const snapshot = maskCtx.getImageData(
      0, 0, maskCanvas.width, maskCanvas.height
    );

    history = history.slice(0, historyIndex + 1);
    history.push(snapshot);

    if (history.length > MAX_HISTORY) history.shift();

    historyIndex = history.length - 1;
    updateHistoryButtons();
  } catch (error) {
    console.error(error);
  }
}

function restoreHistory(index) {
  if (index < 0 || index >= history.length) return;

  maskCtx.putImageData(history[index], 0, 0);
  historyIndex = index;

  updateHistoryButtons();
  render();
}

function updateHistoryButtons() {
  $("undo-btn").disabled = historyIndex <= 0;
  $("redo-btn").disabled = historyIndex >= history.length - 1;
}

function resetHistory() {
  history = [];
  historyIndex = -1;
  saveHistory();
}

function drawCover(image, targetCtx, width, height, blur = 0) {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;

  let drawWidth;
  let drawHeight;

  if (imageRatio > targetRatio) {
    drawHeight = height;
    drawWidth = height * imageRatio;
  } else {
    drawWidth = width;
    drawHeight = width / imageRatio;
  }

  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;

  targetCtx.save();
  targetCtx.filter = blur > 0 ? `blur(${blur}px)` : "none";

  // Slightly expand the image so blur does not reveal empty edges.
  const extra = blur * 2;
  targetCtx.drawImage(
    image,
    x - extra,
    y - extra,
    drawWidth + extra * 2,
    drawHeight + extra * 2
  );

  targetCtx.restore();
}

function render() {
  if (!originalImage) {
    canvas.width = 900;
    canvas.height = 600;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#172033";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "22px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Upload a photo to begin", canvas.width / 2, canvas.height / 2);
    return;
  }

  const width = originalImage.naturalWidth;
  const height = originalImage.naturalHeight;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  ctx.clearRect(0, 0, width, height);

  // Background layer
  if (backgroundImage) {
    drawCover(backgroundImage, ctx, width, height, backgroundBlur);
  } else if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Foreground photo with adjustments
  const photoLayer = document.createElement("canvas");
  photoLayer.width = width;
  photoLayer.height = height;

  const photoCtx = photoLayer.getContext("2d");
  photoCtx.filter =
    `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

  photoCtx.drawImage(originalImage, 0, 0, width, height);
  photoCtx.filter = "none";

  // Apply the eraser mask to the foreground.
  photoCtx.globalCompositeOperation = "destination-in";
  photoCtx.drawImage(maskCanvas, 0, 0);
  photoCtx.globalCompositeOperation = "source-over";

  ctx.drawImage(photoLayer, 0, 0);
}

function pointOnCanvas(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function paintAt(point) {
  if (!originalImage) return;

  maskCtx.save();
  maskCtx.beginPath();
  maskCtx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);

  if (brushMode === "erase") {
    maskCtx.globalCompositeOperation = "destination-out";
    maskCtx.fillStyle = "rgba(0,0,0,1)";
  } else {
    maskCtx.globalCompositeOperation = "source-over";
    maskCtx.fillStyle = "rgba(255,255,255,1)";
  }

  maskCtx.fill();
  maskCtx.restore();

  render();
}

canvas.addEventListener("pointerdown", (event) => {
  if (!originalImage || brushMode === "none") return;

  isDrawing = true;
  canvas.setPointerCapture(event.pointerId);

  paintAt(pointOnCanvas(event));
});

canvas.addEventListener("pointermove", (event) => {
  if (!isDrawing) return;
  paintAt(pointOnCanvas(event));
});

function finishDrawing() {
  if (!isDrawing) return;

  isDrawing = false;
  saveHistory();
}

canvas.addEventListener("pointerup", finishDrawing);
canvas.addEventListener("pointercancel", finishDrawing);
canvas.addEventListener("lostpointercapture", finishDrawing);

// Upload main photo
$("upload-photo-btn").addEventListener("click", () => photoInput.click());

photoInput.addEventListener("change", async () => {
  const file = photoInput.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    status("Please select a valid image.");
    return;
  }

  try {
    originalImage = await loadImage(file);
    createFullMask();

    backgroundImage = null;
    backgroundColor = null;
    backgroundBlur = 0;

    $("bg-blur").value = 0;
    $("blur-value").textContent = "0";

    brightness = 100;
    contrast = 100;
    saturation = 100;

    $("brightness").value = 100;
    $("contrast").value = 100;
    $("saturation").value = 100;

    resetHistory();
    render();

    status("Photo uploaded successfully.");
  } catch (error) {
    status(error.message);
  }

  photoInput.value = "";
});

// Upload a different background photo
$("upload-bg-btn").addEventListener("click", () => bgInput.click());

bgInput.addEventListener("change", async () => {
  const file = bgInput.files[0];
  if (!file) return;

  try {
    backgroundImage = await loadImage(file);
    backgroundColor = null;
    render();
    status("Background photo added.");
  } catch (error) {
    status(error.message);
  }

  bgInput.value = "";
});

// Manual eraser and restore
$("erase-btn").addEventListener("click", () => {
  brushMode = "erase";
  $("erase-btn").classList.add("active");
  $("restore-btn").classList.remove("active");
  status("Eraser selected. Paint over the area you want to remove.");
});

$("restore-btn").addEventListener("click", () => {
  brushMode = "restore";
  $("restore-btn").classList.add("active");
  $("erase-btn").classList.remove("active");
  status("Restore selected. Paint to bring back erased areas.");
});

$("stop-brush-btn").addEventListener("click", () => {
  brushMode = "none";
  $("erase-btn").classList.remove("active");
  $("restore-btn").classList.remove("active");
  status("Brush disabled.");
});

$("brush-size").addEventListener("input", (event) => {
  brushSize = Number(event.target.value);
  $("brush-size-value").textContent = brushSize;
});

$("reset-mask-btn").addEventListener("click", () => {
  if (!hasPhoto()) return;

  createFullMask();
  resetHistory();
  render();

  status("Eraser mask reset.");
});

// Background color controls
document.querySelectorAll("[data-bg]").forEach((button) => {
  button.addEventListener("click", () => {
    backgroundColor = button.dataset.bg;
    backgroundImage = null;
    render();
    status("Background color changed.");
  });
});

$("bg-color").addEventListener("input", (event) => {
  backgroundColor = event.target.value;
  backgroundImage = null;
  render();
});

$("bg-blur").addEventListener("input", (event) => {
  backgroundBlur = Number(event.target.value);
  $("blur-value").textContent = backgroundBlur;
  render();
});

$("clear-bg-btn").addEventListener("click", () => {
  backgroundImage = null;
  backgroundColor = null;
  backgroundBlur = 0;

  $("bg-blur").value = 0;
  $("blur-value").textContent = "0";

  render();
  status("Background photo and color cleared.");
});

// Photo adjustments
function updateAdjustments() {
  brightness = Number($("brightness").value);
  contrast = Number($("contrast").value);
  saturation = Number($("saturation").value);
  render();
}

["brightness", "contrast", "saturation"].forEach((id) => {
  $(id).addEventListener("input", updateAdjustments);
});

$("reset-adjustments-btn").addEventListener("click", () => {
  $("brightness").value = 100;
  $("contrast").value = 100;
  $("saturation").value = 100;
  updateAdjustments();
});

// Undo and redo
$("undo-btn").addEventListener("click", () => {
  restoreHistory(historyIndex - 1);
});

$("redo-btn").addEventListener("click", () => {
  restoreHistory(historyIndex + 1);
});

// AI helper: convert a returned result into an image element.
async function resultToImage(result) {
  if (result instanceof Blob) {
    return loadImage(new File([result], "ai-background-removed.png", {
      type: result.type || "image/png"
    }));
  }

  if (typeof result === "string") {
    if (result.startsWith("data:image/")) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = result;
      });
    }

    if (result.startsWith("http://") || result.startsWith("https://")) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = result;
      });
    }
  }

  if (result && typeof result === "object" && result.image) {
    return resultToImage(result.image);
  }

  throw new Error("AI returned an unsupported image result.");
}

function imageToDataURL(image) {
  const temp = document.createElement("canvas");
  temp.width = image.naturalWidth;
  temp.height = image.naturalHeight;

  const tempCtx = temp.getContext("2d");
  tempCtx.drawImage(image, 0, 0);

  return temp.toDataURL("image/png");
}

// Offline AI integration
async function runOfflineAI() {
  if (!window.JemAI ||
      typeof window.JemAI.removeBackground !== "function") {
    throw new Error(
      "Offline AI model is not installed. Add your local AI model integration first."
    );
  }

  const inputData = imageToDataURL(originalImage);
  const result = await window.JemAI.removeBackground(inputData);

  return resultToImage(result);
}

// Online AI integration
async function runOnlineAI() {
  const inputData = imageToDataURL(originalImage);
  const response = await fetch(ONLINE_AI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      image: inputData,
      output_format: "png",
      background: "transparent"
    })
  });

  if (!response.ok) {
    throw new Error(
      `Online AI service error: ${response.status}. Check your backend endpoint.`
    );
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("image/")) {
    const blob = await response.blob();
    return resultToImage(blob);
  }

  const data = await response.json();

  if (data.image) return resultToImage(data.image);
  if (data.image_url) return resultToImage(data.image_url);

  throw new Error("The AI server did not return an image.");
}

// AI button
$("ai-remove-btn").addEventListener("click", async () => {
  if (!hasPhoto()) return;

  const button = $("ai-remove-btn");
  const mode = $("ai-mode").value;

  button.disabled = true;
  button.textContent = "Processing...";
  status("AI background removal started. Please wait.");

  try {
    let outputImage;

    if (mode === "offline") {
      outputImage = await runOfflineAI();
    } else if (mode === "online") {
      outputImage = await runOnlineAI();
    } else {
      // Both: attempt local model first, then online backend.
      try {
        status("Trying Offline AI...");
        outputImage = await runOfflineAI();
      } catch (offlineError) {
        status("Offline AI unavailable. Trying Online AI...");
        outputImage = await runOnlineAI();
      }
    }

    originalImage = outputImage;
    createFullMask();
    resetHistory();
    render();

    status("Background removed successfully. Add a new background or download.");
  } catch (error) {
    console.error(error);
    status(error.message || "AI background removal failed.");
  } finally {
    button.disabled = false;
    button.textContent = "✨ Remove Background with AI";
  }
});

// Export
function downloadImage() {
  if (!originalImage) {
    status("Upload a photo before downloading.");
    return;
  }

  render();

  const format = $("export-format").value;
  const quality = Number($("export-quality").value) / 100;

  // JPEG cannot preserve transparency. Use white behind transparent areas.
  if (format === "image/jpeg") {
    const jpegCanvas = document.createElement("canvas");
    jpegCanvas.width = canvas.width;
    jpegCanvas.height = canvas.height;

    const jpegCtx = jpegCanvas.getContext("2d");
    jpegCtx.fillStyle = "#ffffff";
    jpegCtx.fillRect(0, 0, jpegCanvas.width, jpegCanvas.height);
    jpegCtx.drawImage(canvas, 0, 0);

    jpegCanvas.toBlob((blob) => saveBlob(blob, "jem-photo-studio.jpg"),
      format, quality);
  } else {
    canvas.toBlob((blob) => saveBlob(
      blob,
      format === "image/webp" ? "jem-photo-studio.webp" : "jem-photo-studio.png"
    ), format, quality);
  }
}

function saveBlob(blob, filename) {
  if (!blob) {
    status("Could not export the image.");
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1500);
  status("Your edited photo is ready.");
}

$("download-btn").addEventListener("click", downloadImage);
$("download-btn-2").addEventListener("click", downloadImage);

// Initial screen
render();
updateHistoryButtons();
