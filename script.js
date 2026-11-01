
document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);
  const all = selector => [...document.querySelectorAll(selector)];

  const fileInput = $("file-input");
  const uploadPanel = $("upload-placeholder");
  const imageContainer = $("image-container");
  const image = $("preview-img");
  const stage = $("preview-stage");
  const canvas = $("export-canvas");
  const ctx = canvas.getContext("2d");

  let hasImage = false;
  let imageName = "jem-photo";
  let originalImage = null;
  let state = defaults();
  let history = [];
  let historyIndex = -1;
  let toastTimer = null;
  let installPrompt = null;

  function defaults() {
    return {
      brightness: 100, contrast: 100, saturation: 100,
      exposure: 0, temperature: 0, hue: 0,
      grayscale: 0, sepia: 0, blur: 0, vignette: 0,
      rotate: 0, flipX: 1, flipY: 1,
      background: "#111827", gradient: false,
      ratio: "free", borderSize: 0, borderColor: "#ffffff",
      text: "", textColor: "#ffffff", textSize: 48,
      textFont: "Arial", textOpacity: 100, textPosition: "bottom"
    };
  }

  function notify(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function requireImage() {
    if (hasImage) return true;
    notify("Please upload a photo first.");
    return false;
  }

  function saveHistory() {
    if (!hasImage) return;
    const value = JSON.stringify(state);
    if (history[historyIndex] === value) return;

    history = history.slice(0, historyIndex + 1);
    history.push(value);

    if (history.length > 40) history.shift();

    historyIndex = history.length - 1;
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    $("undo-btn").disabled = historyIndex <= 0;
    $("redo-btn").disabled = historyIndex >= history.length - 1;
  }

  function restoreHistory(index) {
    if (index < 0 || index >= history.length) return;
    historyIndex = index;
    state = JSON.parse(history[index]);
    syncControls();
    renderPreview();
    updateHistoryButtons();
  }

  $("undo-btn").addEventListener("click", () => restoreHistory(historyIndex - 1));
  $("redo-btn").addEventListener("click", () => restoreHistory(historyIndex + 1));

  function syncControls() {
    all("[data-control]").forEach(input => {
      const key = input.dataset.control;
      input.value = state[key];
      updateOutput(key, state[key]);
    });

    $("background-color").value = state.background;
    $("border-size").value = state.borderSize;
    $("border-color").value = state.borderColor;
    $("border-value").textContent = state.borderSize + "px";

    $("watermark-input").value = state.text;
    $("text-color").value = state.textColor;
    $("text-size").value = state.textSize;
    $("text-font").value = state.textFont;
    $("text-opacity").value = state.textOpacity;
    $("text-opacity-value").textContent = state.textOpacity + "%";
    $("text-position").value = state.textPosition;

    all(".ratio-btn").forEach(button => {
      button.classList.toggle("active", button.dataset.ratio === state.ratio);
    });
  }

  function updateOutput(key, value) {
    const output = $(key + "-value");
    if (!output) return;
    const suffix = key === "hue" ? "°" : key === "blur" ? "px" :
      ["exposure", "temperature"].includes(key) ? "" : "%";
    output.textContent = value + suffix;
  }

  // Upload image
  function openPicker() {
    fileInput.click();
  }

  $("browse-btn").addEventListener("click", openPicker);
  uploadPanel.addEventListener("click", event => {
    if (event.target.closest("button")) return;
    openPicker();
  });
  $("change-image").addEventListener("click", openPicker);

  fileInput.addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      notify("Please select an image file.");
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      notify("The image must be smaller than 30 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = e => {
      const newImage = new Image();

      newImage.onload = () => {
        originalImage = newImage;
        image.src = e.target.result;
        hasImage = true;
        imageName = file.name.replace(/\.[^/.]+$/, "") || "jem-photo";

        uploadPanel.hidden = true;
        imageContainer.hidden = false;

        $("image-name").textContent = file.name;
        $("image-dimensions").textContent =
          `${newImage.naturalWidth} × ${newImage.naturalHeight} px`;

        state = defaults();
        history = [];
        historyIndex = -1;

        all(".preset").forEach(p => p.classList.remove("active"));
        $('[data-preset="original"]').classList.add("active");

        syncControls();
        renderPreview();
        saveHistory();
        notify("Photo loaded successfully.");
      };

      newImage.onerror = () => notify("Unable to open this image.");
      newImage.src = e.target.result;
    };

    reader.onerror = () => notify("Unable to read this file.");
    reader.readAsDataURL(file);
    fileInput.value = "";
  });

  // Drag and drop
  const workspace = $("workspace");

  ["dragenter", "dragover"].forEach(type => {
    workspace.addEventListener(type, event => {
      event.preventDefault();
      workspace.classList.add("drag-active");
    });
  });

  ["dragleave", "drop"].forEach(type => {
    workspace.addEventListener(type, event => {
      event.preventDefault();
      workspace.classList.remove("drag-active");
    });
  });

  workspace.addEventListener("drop", event => {
    const file = event.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) {
      notify("Drop an image file here.");
      return;
    }

    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
  });

  // Tabs
  all(".tab").forEach(button => {
    button.addEventListener("click", () => {
      all(".tab").forEach(tab => tab.classList.remove("active"));
      all(".tab-content").forEach(panel => panel.classList.remove("active"));

      button.classList.add("active");
      const target = $("tab-" + button.dataset.tab);
      if (target) target.classList.add("active");
    });
  });

  // Filter rendering
  function filterString() {
    const exposure = Math.pow(2, state.exposure / 100);
    const warmth = Math.abs(state.temperature) / 250;

    return [
      `brightness(${state.brightness * exposure}%)`,
      `contrast(${state.contrast}%)`,
      `saturate(${state.saturation}%)`,
      `hue-rotate(${state.hue}deg)`,
      `grayscale(${state.grayscale}%)`,
      `sepia(${Math.min(1, state.sepia / 100 + warmth)})`,
      `blur(${state.blur}px)`
    ].join(" ");
  }

  function renderPreview() {
    if (!hasImage) return;

    image.style.filter = filterString();
    image.style.transform =
      `rotate(${state.rotate}deg) scale(${state.flipX}, ${state.flipY})`;

    stage.style.background = state.gradient
      ? "linear-gradient(135deg,#ec4899,#f59e0b)"
      : state.background;

    stage.style.border = `${state.borderSize}px solid ${state.borderColor}`;

    renderWatermark();
  }

  // Adjustment sliders
  all("[data-control]").forEach(input => {
    const key = input.dataset.control;

    input.addEventListener("input", () => {
      state[key] = Number(input.value);
      updateOutput(key, state[key]);
      renderPreview();
    });

    input.addEventListener("change", saveHistory);
  });

  $("reset-adjust").addEventListener("click", () => {
    [
      "brightness", "contrast", "saturation", "exposure",
      "temperature", "hue", "grayscale", "sepia", "blur", "vignette"
    ].forEach(key => state[key] = defaults()[key]);

    syncControls();
    renderPreview();
    saveHistory();
    notify("Adjustments reset.");
  });

  // Transform
  $("rotate-left").addEventListener("click", () => {
    if (!requireImage()) return;
    state.rotate -= 90;
    renderPreview();
    saveHistory();
  });

  $("rotate-right").addEventListener("click", () => {
    if (!requireImage()) return;
    state.rotate += 90;
    renderPreview();
    saveHistory();
  });

  $("flip-x").addEventListener("click", () => {
    if (!requireImage()) return;
    state.flipX *= -1;
    renderPreview();
    saveHistory();
  });

  $("flip-y").addEventListener("click", () => {
    if (!requireImage()) return;
    state.flipY *= -1;
    renderPreview();
    saveHistory();
  });

  // Presets
  const presets = {
    original: { brightness: 100, contrast: 100, saturation: 100, exposure: 0, temperature: 0, hue: 0, grayscale: 0, sepia: 0 },
    bright: { brightness: 115, contrast: 105, saturation: 115, exposure: 12, temperature: 8, hue: 0, grayscale: 0, sepia: 0 },
    golden: { brightness: 108, contrast: 112, saturation: 125, exposure: 8, temperature: 40, hue: -5, grayscale: 0, sepia: 20 },
    vintage: { brightness: 105, contrast: 85, saturation: 75, exposure: 0, temperature: 20, hue: 0, grayscale: 0, sepia: 55 },
    mono: { brightness: 105, contrast: 120, saturation: 0, exposure: 0, temperature: 0, hue: 0, grayscale: 100, sepia: 0 },
    cool: { brightness: 105, contrast: 105, saturation: 95, exposure: 0, temperature: -30, hue: 10, grayscale: 0, sepia: 0 },
    dramatic: { brightness: 95, contrast: 145, saturation: 120, exposure: -5, temperature: -5, hue: 0, grayscale: 0, sepia: 0 },
    dream: { brightness: 120, contrast: 85, saturation: 110, exposure: 15, temperature: 15, hue: 5, grayscale: 0, sepia: 8 }
  };

  all(".preset").forEach(button => {
    button.addEventListener("click", () => {
      if (!requireImage()) return;
      Object.assign(state, presets[button.dataset.preset]);

      all(".preset").forEach(p => p.classList.remove("active"));
      button.classList.add("active");

      syncControls();
      renderPreview();
      saveHistory();
      notify("Preset applied.");
    });
  });

  // Crop ratio
  all(".ratio-btn").forEach(button => {
    button.addEventListener("click", () => {
      if (!requireImage()) return;
      state.ratio = button.dataset.ratio;

      all(".ratio-btn").forEach(b => b.classList.remove("active"));
      button.classList.add("active");
      saveHistory();
    });
  });

  // Background and border
  function setBackground(value) {
    state.gradient = value === "gradient";
    if (!state.gradient) state.background = value;
    renderPreview();
    saveHistory();
  }

  all(".swatch").forEach(button => {
    button.addEventListener("click", () => {
      if (requireImage()) setBackground(button.dataset.bg);
    });
  });

  $("background-color").addEventListener("input", event => {
    state.background = event.target.value;
    state.gradient = false;
    renderPreview();
  });
  $("background-color").addEventListener("change", saveHistory);

  $("border-size").addEventListener("input", event => {
    state.borderSize = Number(event.target.value);
    $("border-value").textContent = state.borderSize + "px";
    renderPreview();
  });
  $("border-size").addEventListener("change", saveHistory);

  $("border-color").addEventListener("input", event => {
    state.borderColor = event.target.value;
    renderPreview();
  });
  $("border-color").addEventListener("change", saveHistory);

  // Watermark preview
  function renderWatermark() {
    const text = $("preview-watermark");
    text.textContent = state.text;
    text.style.color = state.textColor;
    text.style.fontSize = Math.max(10, state.textSize / 2) + "px";
    text.style.fontFamily = state.textFont;
    text.style.opacity = state.textOpacity / 100;
    text.style.left = "50%";
    text.style.right = "auto";
    text.style.top = "auto";
    text.style.bottom = "6%";
    text.style.transform = "translateX(-50%)";

    if (state.textPosition === "top") {
      text.style.top = "6%";
      text.style.bottom = "auto";
    } else if (state.textPosition === "center") {
      text.style.top = "50%";
      text.style.bottom = "auto";
      text.style.transform = "translate(-50%,-50%)";
    } else if (state.textPosition === "bottom-left") {
      text.style.left = "5%";
      text.style.transform = "none";
    } else if (state.textPosition === "bottom-right") {
      text.style.left = "auto";
      text.style.right = "5%";
      text.style.transform = "none";
    }
  }

  $("watermark-input").addEventListener("input", e => {
    state.text = e.target.value;
    renderWatermark();
  });

  $("text-color").addEventListener("input", e => {
    state.textColor = e.target.value;
    renderWatermark();
  });

  $("text-size").addEventListener("input", e => {
    state.textSize = Number(e.target.value);
    renderWatermark();
  });

  $("text-font").addEventListener("change", e => {
    state.textFont = e.target.value;
    renderWatermark();
    saveHistory();
  });

  $("text-opacity").addEventListener("input", e => {
    state.textOpacity = Number(e.target.value);
    $("text-opacity-value").textContent = state.textOpacity + "%";
    renderWatermark();
  });

  $("text-position").addEventListener("change", e => {
    state.textPosition = e.target.value;
    renderWatermark();
    saveHistory();
  });

  ["watermark-input", "text-color", "text-size", "text-opacity"].forEach(id => {
    $(id).addEventListener("change", saveHistory);
  });

  $("clear-text").addEventListener("click", () => {
    state.text = "";
    $("watermark-input").value = "";
    renderWatermark();
    saveHistory();
  });

  // Compare original and edited
  const compareButton = $("compare-btn");

  function showOriginal() {
    if (!hasImage) return;
    image.style.filter = "none";
    image.style.transform = "none";
    stage.style.border = "0";
  }

  function showEdited() {
    renderPreview();
  }

  compareButton.addEventListener("pointerdown", showOriginal);
  ["pointerup", "pointerleave", "pointercancel"].forEach(type => {
    compareButton.addEventListener(type, showEdited);
  });

  // Reset
  $("reset-btn").addEventListener("click", () => {
    if (!requireImage()) return;

    state = defaults();
    syncControls();
    renderPreview();

    all(".preset").forEach(p => p.classList.remove("active"));
    $('[data-preset="original"]').classList.add("active");

    saveHistory();
    notify("All edits reset.");
  });

  $("fit-btn").addEventListener("click", () => {
    if (!requireImage()) return;
    image.style.maxWidth = "100%";
    image.style.maxHeight = "68vh";
    notify("Image fitted to workspace.");
  });

  // Canvas export helpers
  function getCropSize(width, height) {
    if (state.ratio === "free") return { width, height };

    const ratio = Number(state.ratio);
    if (width / height > ratio) {
      return { width: height * ratio, height };
    }
    return { width, height: width / ratio };
  }

  function drawPhoto() {
    const sourceWidth = originalImage.naturalWidth;
    const sourceHeight = originalImage.naturalHeight;
    const quarterTurn = Math.abs(state.rotate % 180) === 90;

    const rotatedWidth = quarterTurn ? sourceHeight : sourceWidth;
    const rotatedHeight = quarterTurn ? sourceWidth : sourceHeight;
    const crop = getCropSize(rotatedWidth, rotatedHeight);

    const outWidth = Math.max(1, Math.round(crop.width));
    const outHeight = Math.max(1, Math.round(crop.height));

    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = rotatedWidth;
    fullCanvas.height = rotatedHeight;
    const fullCtx = fullCanvas.getContext("2d");

    fullCtx.save();
    fullCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
    fullCtx.rotate(state.rotate * Math.PI / 180);
    fullCtx.scale(state.flipX, state.flipY);

    const exposure = Math.pow(2, state.exposure / 100);
    const warmth = Math.abs(state.temperature) / 250;

    fullCtx.filter = [
      `brightness(${state.brightness * exposure}%)`,
      `contrast(${state.contrast}%)`,
      `saturate(${state.saturation}%)`,
      `hue-rotate(${state.hue}deg)`,
      `grayscale(${state.grayscale}%)`,
      `sepia(${Math.min(1, state.sepia / 100 + warmth)})`,
      `blur(${state.blur}px)`
    ].join(" ");

    fullCtx.drawImage(
      originalImage,
      -sourceWidth / 2, -sourceHeight / 2,
      sourceWidth, sourceHeight
    );
    fullCtx.restore();

    canvas.width = outWidth;
    canvas.height = outHeight;

    if (state.gradient) {
      const gradient = ctx.createLinearGradient(0, 0, outWidth, outHeight);
      gradient.addColorStop(0, "#ec4899");
      gradient.addColorStop(1, "#f59e0b");
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = state.background;
    }
    ctx.fillRect(0, 0, outWidth, outHeight);

    const cropX = (rotatedWidth - crop.width) / 2;
    const cropY = (rotatedHeight - crop.height) / 2;

    ctx.drawImage(
      fullCanvas,
      cropX, cropY, crop.width, crop.height,
      0, 0, outWidth, outHeight
    );

    // Vignette
    if (state.vignette > 0) {
      const radius = Math.max(outWidth, outHeight) * .72;
      const vignette = ctx.createRadialGradient(
        outWidth / 2, outHeight / 2, radius * .2,
        outWidth / 2, outHeight / 2, radius
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, `rgba(0,0,0,${state.vignette / 100})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, outWidth, outHeight);
    }

    // Border
    if (state.borderSize > 0) {
      ctx.strokeStyle = state.borderColor;
      ctx.lineWidth = state.borderSize * 2;
      ctx.strokeRect(
        state.borderSize, state.borderSize,
        outWidth - state.borderSize * 2,
        outHeight - state.borderSize * 2
      );
    }

    // Text watermark
    if (state.text.trim()) {
      const scale = outWidth / 500;
      const fontSize = state.textSize * scale;
      const margin = Math.max(20, outWidth * .04);

      ctx.save();
      ctx.globalAlpha = state.textOpacity / 100;
      ctx.fillStyle = state.textColor;
      ctx.font = `bold ${fontSize}px "${state.textFont}"`;
      ctx.textBaseline = "middle";

      let x = outWidth / 2;
      let y = outHeight - margin;
      ctx.textAlign = "center";

      if (state.textPosition === "top") y = margin + fontSize / 2;
      if (state.textPosition === "center") y = outHeight / 2;
      if (state.textPosition === "bottom-left") {
        x = margin;
        ctx.textAlign = "left";
      }
      if (state.textPosition === "bottom-right") {
        x = outWidth - margin;
        ctx.textAlign = "right";
      }

      ctx.fillText(state.text, x, y, outWidth - margin * 2);
      ctx.restore();
    }
  }

  function exportPhoto() {
    if (!requireImage()) return;

    try {
      drawPhoto();

      const format = $("export-format").value;
      const quality = Number($("export-quality").value);
      const extension = format === "image/png" ? "png" : "jpg";

      canvas.toBlob(blob => {
        if (!blob) {
          notify("Export failed. Please try again.");
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${imageName}-edited.${extension}`;
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 2000);
        notify("Your photo has been exported.");
      }, format, quality);

    } catch (error) {
      console.error(error);
      notify("Unable to export this image.");
    }
  }

  $("download-btn").addEventListener("click", exportPhoto);
  $("export-top").addEventListener("click", exportPhoto);

  // PWA installation
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    $("install-btn").hidden = false;
  });

  $("install-btn").addEventListener("click", async () => {
    if (!installPrompt) {
      notify("Use your browser menu to install this app.");
      return;
    }

    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    $("install-btn").hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    notify("Jem Photo Studio installed.");
    $("install-btn").hidden = true;
  });

  // Service worker
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js")
      .then(() => console.log("Offline support ready."))
      .catch(error => console.warn("Offline setup failed:", error));
  }

  syncControls();
  updateHistoryButtons();
});
