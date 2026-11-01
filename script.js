
document.addEventListener("DOMContentLoaded", () => {
  "use strict";

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
  let originalImage = null;
  let imageName = "jem-photo";
  let history = [];
  let historyIndex = -1;
  let toastTimer = null;
  let installPrompt = null;

  function defaults() {
    return {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      exposure: 0,
      temperature: 0,
      hue: 0,
      grayscale: 0,
      sepia: 0,
      blur: 0,
      vignette: 0,
      rotate: 0,
      flipX: 1,
      flipY: 1,
      background: "#111827",
      gradient: false,
      ratio: "free",
      borderSize: 0,
      borderColor: "#ffffff",
      text: "",
      textColor: "#ffffff",
      textSize: 48,
      textFont: "Arial",
      textOpacity: 100,
      textPosition: "bottom"
    };
  }

  let state = defaults();

  function notify(message) {
    const toast = $("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2600);
  }

  function requireImage() {
    if (hasImage && originalImage) return true;
    notify("Please upload a photo first.");
    return false;
  }

  // --------------------------------------------------
  // ENHANCE BUTTON
  // --------------------------------------------------

  // The original HTML did not contain an Enhance button.
  // This creates it automatically.

  const adjustPanel = $("tab-adjust");
  const enhanceButton = document.createElement("button");

  enhanceButton.type = "button";
  enhanceButton.id = "enhance-btn";
  enhanceButton.className = "button button-primary";
  enhanceButton.textContent = "✦ Auto Enhance";
  enhanceButton.style.width = "100%";
  enhanceButton.style.marginBottom = "18px";

  if (adjustPanel) {
    const firstSection = adjustPanel.querySelector(".section-title");
    if (firstSection) {
      adjustPanel.insertBefore(enhanceButton, firstSection);
    } else {
      adjustPanel.prepend(enhanceButton);
    }
  }

  enhanceButton.addEventListener("click", () => {
    if (!requireImage()) return;

    // Balanced one-click enhancement.
    state.brightness = 108;
    state.contrast = 112;
    state.saturation = 115;
    state.exposure = 7;
    state.temperature = 10;
    state.hue = 0;
    state.grayscale = 0;
    state.sepia = 0;
    state.blur = 0;
    state.vignette = 12;

    syncControls();
    updatePresetSelection();
    renderPreview();
    saveHistory();

    notify("Auto Enhance applied.");
  });

  // --------------------------------------------------
  // HISTORY: UNDO / REDO
  // --------------------------------------------------

  function saveHistory() {
    if (!hasImage) return;

    const value = JSON.stringify(state);

    if (history[historyIndex] === value) return;

    history = history.slice(0, historyIndex + 1);
    history.push(value);

    if (history.length > 40) {
      history.shift();
    }

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
    updatePresetSelection();
    renderPreview();
    updateHistoryButtons();
  }

  $("undo-btn").addEventListener("click", () => {
    restoreHistory(historyIndex - 1);
  });

  $("redo-btn").addEventListener("click", () => {
    restoreHistory(historyIndex + 1);
  });

  // --------------------------------------------------
  // CONTROL OUTPUTS
  // --------------------------------------------------

  function updateOutput(key, value) {
    const output = $(key + "-value");
    if (!output) return;

    let suffix = "%";

    if (key === "hue") suffix = "°";
    if (key === "blur") suffix = "px";

    if (key === "exposure" || key === "temperature") {
      suffix = "";
    }

    output.textContent = value + suffix;
  }

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
      button.classList.toggle(
        "active",
        button.dataset.ratio === state.ratio
      );
    });
  }

  // --------------------------------------------------
  // IMAGE UPLOAD
  // --------------------------------------------------

  function openPicker() {
    fileInput.click();
  }

  $("browse-btn").addEventListener("click", openPicker);
  $("change-image").addEventListener("click", openPicker);

  uploadPanel.addEventListener("click", event => {
    if (event.target.closest("button")) return;
    openPicker();
  });

  function loadImageFile(file) {
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

    reader.onload = event => {
      const newImage = new Image();

      newImage.onload = () => {
        originalImage = newImage;
        image.src = event.target.result;
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

        syncControls();
        updatePresetSelection();
        renderPreview();
        saveHistory();

        notify("Photo loaded successfully.");
      };

      newImage.onerror = () => {
        notify("Unable to open this image.");
      };

      newImage.src = event.target.result;
    };

    reader.onerror = () => notify("Unable to read this file.");
    reader.readAsDataURL(file);
  }

  fileInput.addEventListener("change", event => {
    loadImageFile(event.target.files[0]);
    fileInput.value = "";
  });

  // --------------------------------------------------
  // DRAG AND DROP
  // --------------------------------------------------

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
    loadImageFile(event.dataTransfer.files[0]);
  });

  // --------------------------------------------------
  // TABS
  // --------------------------------------------------

  all(".tab").forEach(button => {
    button.addEventListener("click", () => {
      all(".tab").forEach(tab => tab.classList.remove("active"));
      all(".tab-content").forEach(panel => panel.classList.remove("active"));

      button.classList.add("active");

      const target = $("tab-" + button.dataset.tab);
      if (target) target.classList.add("active");
    });
  });

  // --------------------------------------------------
  // PREVIEW EFFECTS
  // --------------------------------------------------

  function filterString() {
    const exposure = Math.pow(2, state.exposure / 100);

    // Positive temperature adds warmth.
    // Negative temperature adds a cool blue tint separately.
    const warmth = Math.max(0, state.temperature) / 250;

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

  // Add visual overlays for temperature and vignette.
  let effectOverlay = $("effect-overlay");

  if (!effectOverlay) {
    effectOverlay = document.createElement("div");
    effectOverlay.id = "effect-overlay";

    Object.assign(effectOverlay.style, {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
      zIndex: "2"
    });

    stage.appendChild(effectOverlay);
  }

  function renderEffects() {
    const temperature = state.temperature;

    if (temperature < 0) {
      const amount = Math.abs(temperature) / 100 * 0.28;
      effectOverlay.style.background =
        `rgba(35,105,255,${amount})`;
      effectOverlay.style.mixBlendMode = "color";
    } else {
      effectOverlay.style.background = "transparent";
      effectOverlay.style.mixBlendMode = "normal";
    }

    if (state.vignette > 0) {
      effectOverlay.style.backgroundImage =
        `radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,${state.vignette / 100}) 100%)`;

      if (temperature < 0) {
        effectOverlay.style.backgroundImage =
          `radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,${state.vignette / 100}) 100%), linear-gradient(rgba(35,105,255,${Math.abs(temperature) / 100 * 0.28}), rgba(35,105,255,${Math.abs(temperature) / 100 * 0.28}))`;
      }
    } else if (temperature >= 0) {
      effectOverlay.style.backgroundImage = "none";
    }
  }

  function renderPreview() {
    if (!hasImage) return;

    image.style.filter = filterString();

    image.style.transform =
      `rotate(${state.rotate}deg) scale(${state.flipX}, ${state.flipY})`;

    stage.style.background = state.gradient
      ? "linear-gradient(135deg,#ec4899,#f59e0b)"
      : state.background;

    stage.style.border =
      `${state.borderSize}px solid ${state.borderColor}`;

    renderWatermark();
    renderEffects();
  }

  // --------------------------------------------------
  // ADJUSTMENT SLIDERS
  // --------------------------------------------------

  all("[data-control]").forEach(input => {
    const key = input.dataset.control;

    input.addEventListener("input", () => {
      state[key] = Number(input.value);
      updateOutput(key, state[key]);
      renderPreview();
    });

    input.addEventListener("change", () => {
      saveHistory();
      updatePresetSelection();
    });
  });

  $("reset-adjust").addEventListener("click", () => {
    if (!requireImage()) return;

    const original = defaults();

    [
      "brightness",
      "contrast",
      "saturation",
      "exposure",
      "temperature",
      "hue",
      "grayscale",
      "sepia",
      "blur",
      "vignette"
    ].forEach(key => {
      state[key] = original[key];
    });

    syncControls();
    updatePresetSelection();
    renderPreview();
    saveHistory();

    notify("Adjustments reset.");
  });

  // --------------------------------------------------
  // ROTATE AND FLIP
  // --------------------------------------------------

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

  // --------------------------------------------------
  // FILTER PRESETS
  // --------------------------------------------------

  const presets = {
    original: {
      brightness: 100, contrast: 100, saturation: 100,
      exposure: 0, temperature: 0, hue: 0,
      grayscale: 0, sepia: 0, vignette: 0
    },

    bright: {
      brightness: 115, contrast: 105, saturation: 115,
      exposure: 12, temperature: 8, hue: 0,
      grayscale: 0, sepia: 0, vignette: 0
    },

    golden: {
      brightness: 108, contrast: 112, saturation: 125,
      exposure: 8, temperature: 40, hue: -5,
      grayscale: 0, sepia: 20, vignette: 8
    },

    vintage: {
      brightness: 105, contrast: 85, saturation: 75,
      exposure: 0, temperature: 20, hue: 0,
      grayscale: 0, sepia: 55, vignette: 20
    },

    mono: {
      brightness: 105, contrast: 120, saturation: 0,
      exposure: 0, temperature: 0, hue: 0,
      grayscale: 100, sepia: 0, vignette: 10
    },

    cool: {
      brightness: 105, contrast: 105, saturation: 95,
      exposure: 0, temperature: -30, hue: 10,
      grayscale: 0, sepia: 0, vignette: 0
    },

    dramatic: {
      brightness: 95, contrast: 145, saturation: 120,
      exposure: -5, temperature: -5, hue: 0,
      grayscale: 0, sepia: 0, vignette: 30
    },

    dream: {
      brightness: 120, contrast: 85, saturation: 110,
      exposure: 15, temperature: 15, hue: 5,
      grayscale: 0, sepia: 8, vignette: 5
    }
  };

  function updatePresetSelection() {
    const selected = Object.keys(presets).find(name => {
      return Object.entries(presets[name]).every(([key, value]) => {
        return state[key] === value;
      });
    });

    all(".preset").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.preset === selected
      );
    });
  }

  all(".preset").forEach(button => {
    button.addEventListener("click", () => {
      if (!requireImage()) return;

      const preset = presets[button.dataset.preset];
      if (!preset) return;

      Object.assign(state, preset);

      syncControls();
      updatePresetSelection();
      renderPreview();
      saveHistory();

      notify("Filter applied.");
    });
  });

  // --------------------------------------------------
  // CROP RATIO
  // --------------------------------------------------

  all(".ratio-btn").forEach(button => {
    button.addEventListener("click", () => {
      if (!requireImage()) return;

      state.ratio = button.dataset.ratio;

      all(".ratio-btn").forEach(item => {
        item.classList.toggle("active", item === button);
      });

      saveHistory();
      notify("Crop ratio selected. It will be applied when exporting.");
    });
  });

  // --------------------------------------------------
  // BACKGROUND
  // --------------------------------------------------

  function setBackground(value) {
    if (!requireImage()) return;

    state.gradient = value === "gradient";

    if (!state.gradient) {
      state.background = value;
      $("background-color").value = value;
    }

    renderPreview();
    saveHistory();
  }

  all(".swatch").forEach(button => {
    button.addEventListener("click", () => {
      setBackground(button.dataset.bg);
    });
  });

  $("background-color").addEventListener("input", event => {
    if (!hasImage) return;

    state.background = event.target.value;
    state.gradient = false;
    renderPreview();
  });

  $("background-color").addEventListener("change", saveHistory);

  // --------------------------------------------------
  // BORDER
  // --------------------------------------------------

  $("border-size").addEventListener("input", event => {
    if (!hasImage) return;

    state.borderSize = Number(event.target.value);
    $("border-value").textContent = state.borderSize + "px";
    renderPreview();
  });

  $("border-size").addEventListener("change", saveHistory);

  $("border-color").addEventListener("input", event => {
    if (!hasImage) return;

    state.borderColor = event.target.value;
    renderPreview();
  });

  $("border-color").addEventListener("change", saveHistory);

  // --------------------------------------------------
  // TEXT AND WATERMARK
  // --------------------------------------------------

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
    }

    if (state.textPosition === "center") {
      text.style.top = "50%";
      text.style.bottom = "auto";
      text.style.transform = "translate(-50%,-50%)";
    }

    if (state.textPosition === "bottom-left") {
      text.style.left = "5%";
      text.style.transform = "none";
    }

    if (state.textPosition === "bottom-right") {
      text.style.left = "auto";
      text.style.right = "5%";
      text.style.transform = "none";
    }
  }

  $("watermark-input").addEventListener("input", event => {
    state.text = event.target.value;
    renderWatermark();
  });

  $("text-color").addEventListener("input", event => {
    state.textColor = event.target.value;
    renderWatermark();
  });

  $("text-size").addEventListener("input", event => {
    state.textSize = Number(event.target.value);
    renderWatermark();
  });

  $("text-font").addEventListener("change", event => {
    state.textFont = event.target.value;
    renderWatermark();
    saveHistory();
  });

  $("text-opacity").addEventListener("input", event => {
    state.textOpacity = Number(event.target.value);
    $("text-opacity-value").textContent = state.textOpacity + "%";
    renderWatermark();
  });

  $("text-position").addEventListener("change", event => {
    state.textPosition = event.target.value;
    renderWatermark();
    saveHistory();
  });

  [
    "watermark-input",
    "text-color",
    "text-size",
    "text-opacity"
  ].forEach(id => {
    $(id).addEventListener("change", saveHistory);
  });

  $("clear-text").addEventListener("click", () => {
    state.text = "";
    $("watermark-input").value = "";

    renderWatermark();
    saveHistory();

    notify("Text removed.");
  });

  // --------------------------------------------------
  // COMPARE ORIGINAL
  // --------------------------------------------------

  const compareButton = $("compare-btn");

  function showOriginal() {
    if (!hasImage) return;

    image.style.filter = "none";
    image.style.transform = "none";
    stage.style.border = "0";
    effectOverlay.style.display = "none";
  }

  function showEdited() {
    effectOverlay.style.display = "block";
    renderPreview();
  }

  compareButton.addEventListener("pointerdown", event => {
    if (!hasImage) return;
    compareButton.setPointerCapture?.(event.pointerId);
    showOriginal();
  });

  ["pointerup", "pointerleave", "pointercancel"].forEach(type => {
    compareButton.addEventListener(type, showEdited);
  });

  // --------------------------------------------------
  // RESET ALL
  // --------------------------------------------------

  $("reset-btn").addEventListener("click", () => {
    if (!requireImage()) return;

    state = defaults();

    syncControls();
    updatePresetSelection();
    renderPreview();
    saveHistory();

    notify("All edits reset.");
  });

  $("fit-btn").addEventListener("click", () => {
    if (!requireImage()) return;

    image.style.maxWidth = "100%";
    image.style.maxHeight = "68vh";

    notify("Image fitted to workspace.");
  });

  // --------------------------------------------------
  // EXPORT: CROP SIZE
  // --------------------------------------------------

  function getCropSize(width, height) {
    if (state.ratio === "free") {
      return { width, height };
    }

    const ratio = Number(state.ratio);

    if (!Number.isFinite(ratio) || ratio <= 0) {
      return { width, height };
    }

    if (width / height > ratio) {
      return {
        width: height * ratio,
        height
      };
    }

    return {
      width,
      height: width / ratio
    };
  }

  // --------------------------------------------------
  // EXPORT: COLOR TEMPERATURE
  // --------------------------------------------------

  function applyTemperature(targetCanvas, temperature) {
    if (!temperature) return;

    const targetCtx = targetCanvas.getContext("2d");

    try {
      const imageData = targetCtx.getImageData(
        0, 0, targetCanvas.width, targetCanvas.height
      );

      const pixels = imageData.data;
      const amount = temperature / 100;

      for (let i = 0; i < pixels.length; i += 4) {
        if (amount > 0) {
          pixels[i] = Math.min(255, pixels[i] + 35 * amount);
          pixels[i + 1] = Math.min(255, pixels[i + 1] + 12 * amount);
          pixels[i + 2] = Math.max(0, pixels[i + 2] - 35 * amount);
        } else {
          const cool = Math.abs(amount);
          pixels[i] = Math.max(0, pixels[i] - 25 * cool);
          pixels[i + 1] = Math.min(255, pixels[i + 1] + 8 * cool);
          pixels[i + 2] = Math.min(255, pixels[i + 2] + 35 * cool);
        }
      }

      targetCtx.putImageData(imageData, 0, 0);
    } catch (error) {
      console.warn("Temperature adjustment unavailable:", error);
    }
  }

  // --------------------------------------------------
  // DRAW EDITED PHOTO
  // --------------------------------------------------

  function drawPhoto() {
    if (!originalImage) throw new Error("No source image.");

    const sourceWidth = originalImage.naturalWidth;
    const sourceHeight = originalImage.naturalHeight;

    const quarterTurn = Math.abs(state.rotate % 180) === 90;

    const rotatedWidth = quarterTurn ? sourceHeight : sourceWidth;
    const rotatedHeight = quarterTurn ? sourceWidth : sourceHeight;

    const crop = getCropSize(rotatedWidth, rotatedHeight);

    const outWidth = Math.max(1, Math.round(crop.width));
    const outHeight = Math.max(1, Math.round(crop.height));

    // Draw the rotated and filtered original image.
    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = rotatedWidth;
    fullCanvas.height = rotatedHeight;

    const fullCtx = fullCanvas.getContext("2d");

    if (!fullCtx) throw new Error("Canvas is not supported.");

    fullCtx.save();

    fullCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
    fullCtx.rotate(state.rotate * Math.PI / 180);
    fullCtx.scale(state.flipX, state.flipY);

    const exposure = Math.pow(2, state.exposure / 100);
    const warmth = Math.max(0, state.temperature) / 250;

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
      -sourceWidth / 2,
      -sourceHeight / 2,
      sourceWidth,
      sourceHeight
    );

    fullCtx.restore();

    // Apply temperature to pixels.
    applyTemperature(fullCanvas, state.temperature);

    // Prepare final output.
    canvas.width = outWidth;
    canvas.height = outHeight;

    if (state.gradient) {
      const gradient = ctx.createLinearGradient(
        0, 0, outWidth, outHeight
      );

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
      cropX,
      cropY,
      crop.width,
      crop.height,
      0,
      0,
      outWidth,
      outHeight
    );

    // VIGNETTE
    if (state.vignette > 0) {
      const radius = Math.max(outWidth, outHeight) * 0.72;

      const vignette = ctx.createRadialGradient(
        outWidth / 2,
        outHeight / 2,
        radius * 0.2,
        outWidth / 2,
        outHeight / 2,
        radius
      );

      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(
        1,
        `rgba(0,0,0,${state.vignette / 100})`
      );

      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, outWidth, outHeight);
    }

    // BORDER
    if (state.borderSize > 0) {
      ctx.save();
      ctx.strokeStyle = state.borderColor;
      ctx.lineWidth = state.borderSize * 2;

      ctx.strokeRect(
        state.borderSize,
        state.borderSize,
        Math.max(0, outWidth - state.borderSize * 2),
        Math.max(0, outHeight - state.borderSize * 2)
      );

      ctx.restore();
    }

    // WATERMARK
    if (state.text.trim()) {
      const scale = outWidth / 500;
      const fontSize = state.textSize * scale;
      const margin = Math.max(20, outWidth * 0.04);

      ctx.save();

      ctx.globalAlpha = state.textOpacity / 100;
      ctx.fillStyle = state.textColor;
      ctx.font = `bold ${fontSize}px "${state.textFont}"`;
      ctx.textBaseline = "middle";

      let x = outWidth / 2;
      let y = outHeight - margin;

      ctx.textAlign = "center";

      if (state.textPosition === "top") {
        y = margin + fontSize / 2;
      }

      if (state.textPosition === "center") {
        y = outHeight / 2;
      }

      if (state.textPosition === "bottom-left") {
        x = margin;
        ctx.textAlign = "left";
      }

      if (state.textPosition === "bottom-right") {
        x = outWidth - margin;
        ctx.textAlign = "right";
      }

      ctx.fillText(
        state.text,
        x,
        y,
        Math.max(1, outWidth - margin * 2)
      );

      ctx.restore();
    }
  }

  // --------------------------------------------------
  // EXPORT PHOTO
  // --------------------------------------------------

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

        setTimeout(() => URL.revokeObjectURL(url), 3000);

        notify("Your photo has been exported.");
      }, format, quality);

    } catch (error) {
      console.error("Export error:", error);
      notify("Unable to export. Try a smaller photo.");
    }
  }

  $("download-btn").addEventListener("click", exportPhoto);
  $("export-top").addEventListener("click", exportPhoto);

  // --------------------------------------------------
  // INSTALLABLE APP
  // --------------------------------------------------

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

    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } catch (error) {
      console.warn("Install prompt:", error);
    }

    installPrompt = null;
    $("install-btn").hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    notify("Jem Photo Studio installed.");
    $("install-btn").hidden = true;
  });

  // --------------------------------------------------
  // OFFLINE SERVICE WORKER
  // --------------------------------------------------

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js")
      .then(() => {
        console.log("Jem Photo Studio offline support ready.");
      })
      .catch(error => {
        console.warn("Offline setup failed:", error);
      });
  }

  // --------------------------------------------------
  // INITIALIZE
  // --------------------------------------------------

  syncControls();
  updatePresetSelection();
  updateHistoryButtons();

  console.log("Jem Photo Studio Pro initialized.");
});
