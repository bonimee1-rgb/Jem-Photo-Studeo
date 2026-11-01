
document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const fileInput = $("#file-input");
  const upload = $("#upload-placeholder");
  const imageContainer = $("#image-container");
  const image = $("#preview-img");
  const stage = $("#preview-stage");
  const canvas = $("#export-canvas");
  const ctx = canvas.getContext("2d");
  const toast = $("#toast");

  let hasImage = false;
  let imageName = "jem-photo";
  let history = [];
  let historyIndex = -1;
  let toastTimer;

  const defaultState = () => ({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    exposure: 0,
    temperature: 0,
    hue: 0,
    blur: 0,
    grayscale: 0,
    sepia: 0,
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
  });

  let state = defaultState();

  function notify(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function requireImage() {
    if (!hasImage) {
      notify("Please upload an image first.");
      return false;
    }
    return true;
  }

  function snapshot() {
    return JSON.stringify(state);
  }

  function saveHistory() {
    if (!hasImage) return;

    const current = snapshot();
    if (history[historyIndex] === current) return;

    history = history.slice(0, historyIndex + 1);
    history.push(current);

    if (history.length > 50) history.shift();

    historyIndex = history.length - 1;
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    $("#undo-btn").disabled = historyIndex <= 0;
    $("#redo-btn").disabled = historyIndex >= history.length - 1;

    $("#undo-btn").style.opacity = historyIndex <= 0 ? ".4" : "1";
    $("#redo-btn").style.opacity =
      historyIndex >= history.length - 1 ? ".4" : "1";
  }

  function restoreHistory(index) {
    if (index < 0 || index >= history.length) return;
    historyIndex = index;
    state = JSON.parse(history[index]);
    syncControls();
    renderPreview();
    updateHistoryButtons();
  }

  $("#undo-btn").addEventListener("click", () => {
    if (historyIndex > 0) restoreHistory(historyIndex - 1);
  });

  $("#redo-btn").addEventListener("click", () => {
    if (historyIndex < history.length - 1) restoreHistory(historyIndex + 1);
  });

  function syncControls() {
    $$("[data-control]").forEach(input => {
      const key = input.dataset.control;
      input.value = state[key];
      updateOutput(key, state[key]);
    });

    $("#background-color").value =
      /^#[0-9a-f]{6}$/i.test(state.background)
        ? state.background
        : "#111827";

    $("#border-size").value = state.borderSize;
    $("#border-color").value = state.borderColor;
    $("#watermark-input").value = state.text;
    $("#text-color").value = state.textColor;
    $("#text-size").value = state.textSize;
    $("#text-font").value = state.textFont;
    $("#text-opacity").value = state.textOpacity;
    $("#text-position").value = state.textPosition;

    $("#border-value").textContent = state.borderSize + "px";
    $("#text-opacity-value").textContent = state.textOpacity + "%";

    $$(".ratio-btn").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.ratio === state.ratio
      );
    });
  }

  function updateOutput(key, value) {
    const output = document.getElementById(key + "-value");
    if (!output) return;

    let suffix = "%";
    if (key === "hue") suffix = "°";
    if (key === "blur") suffix = "px";
    if (key === "exposure" || key === "temperature") suffix = "";

    output.textContent = value + suffix;
  }

  // Image upload
  function openFilePicker() {
    fileInput.click();
  }

  $("#browse-btn").addEventListener("click", openFilePicker);
  upload.addEventListener("click", openFilePicker);
  $("#change-image").addEventListener("click", openFilePicker);

  fileInput.addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      notify("Please select a valid image.");
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      notify("Image is too large. Maximum file size is 30 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = e => {
      const newImage = new Image();

      newImage.onload = () => {
        image.src = e.target.result;
        hasImage = true;
        imageName = file.name.replace(/\.[^/.]+$/, "") || "jem-photo";

        upload.hidden = true;
        imageContainer.hidden = false;

        $("#image-name").textContent = file.name;
        $("#image-dimensions").textContent =
          `${newImage.naturalWidth} × ${newImage.naturalHeight}px`;

        state = defaultState();
        history = [];
        historyIndex = -1;

        syncControls();
        renderPreview();
        saveHistory();

        notify("Image loaded successfully.");
      };

      newImage.onerror = () => notify("Unable to load this image.");
      newImage.src = e.target.result;
    };

    reader.onerror = () => notify("Could not read the selected file.");
    reader.readAsDataURL(file);

    // Allow selecting the same file again.
    fileInput.value = "";
  });

  // Drag and drop
  const workspace = $("#workspace");

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
      notify("Please drop an image file.");
      return;
    }

    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
  });

  // Tabs
  $$(".tab").forEach(button => {
    button.addEventListener("click", () => {
      $$(".tab").forEach(tab => tab.classList.remove("active"));
      $$(".tab-content").forEach(panel => panel.classList.remove("active"));

      button.classList.add("active");
      const panel = $("#tab-" + button.dataset.tab);
      if (panel) panel.classList.add("active");
    });
  });

  // Image adjustments
  function renderPreview() {
    if (!hasImage) return;

    const exposureFactor = Math.pow(2, state.exposure / 100);
    const brightness = state.brightness * exposureFactor;

    const temperature = Math.max(0, state.temperature);

    image.style.filter = [
      `brightness(${brightness}%)`,
      `contrast(${state.contrast}%)`,
      `saturate(${state.saturation}%)`,
      `hue-rotate(${state.hue}deg)`,
      `grayscale(${state.grayscale}%)`,
      `sepia(${state.sepia}%)`,
      `blur(${state.blur}px)`,
      `sepia(${Math.abs(state.temperature) / 250})`
    ].join(" ");

    image.style.transform =
      `rotate(${state.rotate}deg) scale(${state.flipX}, ${state.flipY})`;

    stage.style.background = state.gradient
      ? "linear-gradient(135deg, #ec4899, #f59e0b)"
      : state.background;

    stage.style.boxShadow = state.vignette > 0
      ? `inset 0 0 ${state.vignette * 2}px rgba(0,0,0,${state.vignette / 150})`
      : "0 20px 65px #0007";

    stage.style.border = `${state.borderSize}px solid ${state.borderColor}`;

    renderWatermark();
  }

  // Adjustment sliders
  $$("[data-control]").forEach(input => {
    const key = input.dataset.control;

    input.addEventListener("input", () => {
      state[key] = Number(input.value);
      updateOutput(key, state[key]);
      renderPreview();
    });

    input.addEventListener("change", saveHistory);
  });

  $("#reset-adjust").addEventListener("click", () => {
    [
      "brightness", "contrast", "saturation", "exposure",
      "temperature", "hue", "blur", "grayscale", "sepia", "vignette"
    ].forEach(key => {
      state[key] = defaultState()[key];
    });

    syncControls();
    renderPreview();
    saveHistory();
    notify("Adjustments reset.");
  });

  // Transform tools
  $("#rotate-left").addEventListener("click", () => transform("rotate", -90));
  $("#rotate-right").addEventListener("click", () => transform("rotate", 90));
  $("#flip-x").addEventListener("click", () => flip("flipX"));
  $("#flip-y").addEventListener("click", () => flip("flipY"));

  function transform(key, amount) {
    if (!requireImage()) return;
    state[key] += amount;
    renderPreview();
    saveHistory();
  }

  function flip(key) {
    if (!requireImage()) return;
    state[key] *= -1;
    renderPreview();
    saveHistory();
  }

  // Presets
  const presets = {
    original: {
      brightness: 100, contrast: 100, saturation: 100,
      exposure: 0, temperature: 0, hue: 0,
      grayscale: 0, sepia: 0
    },
    bright: {
      brightness: 115, contrast: 105, saturation: 115,
      exposure: 12, temperature: 8, hue: 0,
      grayscale: 0, sepia: 0
    },
    golden: {
      brightness: 108, contrast: 112, saturation: 125,
      exposure: 8, temperature: 40, hue: -5,
      grayscale: 0, sepia: 20
    },
    vintage: {
      brightness: 105, contrast: 85, saturation: 75,
      exposure: 0, temperature: 20, hue: 0,
      grayscale: 0, sepia: 45
    },
    mono: {
      brightness: 105, contrast: 120, saturation: 0,
      exposure: 0, temperature: 0, hue: 0,
      grayscale: 100, sepia: 0
    },
    cool: {
      brightness: 105, contrast: 105, saturation: 95,
      exposure: 0, temperature: -30, hue: 10,
      grayscale: 0, sepia: 0
    },
    dramatic: {
      brightness: 95, contrast: 145, saturation: 120,
      exposure: -5, temperature: -5, hue: 0,
      grayscale: 0, sepia: 0
    },
    dream: {
      brightness: 120, contrast: 85, saturation: 110,
      exposure: 15, temperature: 15, hue: 5,
      grayscale: 0, sepia: 8
    }
  };

  const dreamButton = $('[data-preset="dream"]');
  if (dreamButton) {
    dreamButton.innerHTML =
      '<span class="preset-preview dream"></span>Dream';
  }

  $$(".preset").forEach(button => {
    button.addEventListener("click", () => {
      if (!requireImage()) return;

      const preset = presets[button.dataset.preset];
      if (!preset) return;

      Object.assign(state, preset);

      $$(".preset").forEach(p => p.classList.remove("active"));
      button.classList.add("active");

      syncControls();
      renderPreview();
      saveHistory();
      notify(button.dataset.preset + " preset applied.");
    });
  });

  // Crop ratios
  $$(".ratio-btn").forEach(button => {
    button.addEventListener("click", () => {
      if (!requireImage()) return;

      state.ratio = button.dataset.ratio;

      $$(".ratio-btn").forEach(b => b.classList.remove("active"));
      button.classList.add("active");

      saveHistory();
      notify("Aspect ratio selected.");
    });
  });

  // Background
  function setBackground(value) {
    state.gradient = value === "gradient";
    if (!state.gradient) state.background = value;
    renderPreview();
    saveHistory();
  }

  $$(".swatch").forEach(button => {
    button.addEventListener("click", () => {
      if (!requireImage()) return;
      setBackground(button.dataset.bg);
    });
  });

  $("#background-color").addEventListener("input", event => {
    state.background = event.target.value;
    state.gradient = false;
    renderPreview();
  });

  $("#background-color").addEventListener("change", saveHistory);

  // Text and watermark
  function renderWatermark() {
    const text = $("#preview-watermark");
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
      text.style.transform = "translate(-50%, -50%)";
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

  $("#watermark-input").addEventListener("input", event => {
    state.text = event.target.value;
    renderWatermark();
  });

  $("#text-color").addEventListener("input", event => {
    state.textColor = event.target.value;
    renderWatermark();
  });

  $("#text-size").addEventListener("input", event => {
    state.textSize = Math.max(8, Math.min(300, Number(event.target.value) || 48));
    renderWatermark();
  });

  $("#text-font").addEventListener("change", event => {
    state.textFont = event.target.value;
    renderWatermark();
    saveHistory();
  });

  $("#text-opacity").addEventListener("input", event => {
    state.textOpacity = Number(event.target.value);
    $("#text-opacity-value").textContent = state.textOpacity + "%";
    renderWatermark();
  });

  $("#text-position").addEventListener("change", event => {
    state.textPosition = event.target.value;
    renderWatermark();
    saveHistory();
  });

  [
    "#watermark-input", "#text-color", "#text-size", "#text-opacity"
  ].forEach(selector => {
    $(selector).addEventListener("change", saveHistory);
  });

  $("#clear-text").addEventListener("click", () => {
    state.text = "";
    $("#watermark-input").value = "";
    renderWatermark();
    saveHistory();
  });

  // Border
  $("#border-size").addEventListener("input", event => {
    state.borderSize = Number(event.target.value);
    $("#border-value").textContent = state.borderSize + "px";
    renderPreview();
  });

  $("#border-size").addEventListener("change", saveHistory);

  $("#border-color").addEventListener("input", event => {
    state.borderColor = event.target.value;
    renderPreview();
  });

  $("#border-color").addEventListener("change", saveHistory);

  // Before and after comparison
  const compareButton = $("#compare-btn");

  function showOriginal() {
    if (!hasImage) return;
    image.style.filter = "none";
    image.style.transform = "none";
    stage.style.boxShadow = "none";
  }

  function showEdited() {
    renderPreview();
  }

  compareButton.addEventListener("pointerdown", showOriginal);
  ["pointerup", "pointerleave", "pointercancel"].forEach(type => {
    compareButton.addEventListener(type, showEdited);
  });

  // Reset all
  function resetAll() {
    if (!requireImage()) return;

    state = defaultState();
    syncControls();
    renderPreview();

    $$(".preset").forEach(p => p.classList.remove("active"));
    $('[data-preset="original"]').classList.add("active");

    saveHistory();
    notify("All edits have been reset.");
  }

  $("#reset-btn").addEventListener("click", resetAll);

  // Fit image
  $("#fit-btn").addEventListener("click", () => {
    if (!requireImage()) return;
    image.style.maxWidth = "100%";
    image.style.maxHeight = "65vh";
    notify("Image fitted to workspace.");
  });

  // Export helpers
  function getCropDimensions(width, height) {
    if (state.ratio === "free") return { width, height };

    const ratio = Number(state.ratio);
    const current = width / height;

    if (current > ratio) {
      return { width: height * ratio, height };
    }

    return { width, height: width / ratio };
  }

  function drawExport() {
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;

    const isQuarterTurn = Math.abs(state.rotate % 180) === 90;

    const rotatedWidth = isQuarterTurn ? sourceHeight : sourceWidth;
    const rotatedHeight = isQuarterTurn ? sourceWidth : sourceHeight;

    const crop = getCropDimensions(rotatedWidth, rotatedHeight);
    const outputWidth = Math.max(1, Math.round(crop.width));
    const outputHeight = Math.max(1, Math.round(crop.height));

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    // Background
    if (state.gradient) {
      const gradient = ctx.createLinearGradient(
        0, 0, outputWidth, outputHeight
      );
      gradient.addColorStop(0, "#ec4899");
      gradient.addColorStop(1, "#f59e0b");
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = state.background;
    }

    ctx.fillRect(0, 0, outputWidth, outputHeight);

    // Crop from the center of the rotated image
    const cropX = (rotatedWidth - crop.width) / 2;
    const cropY = (rotatedHeight - crop.height) / 2;

    ctx.save();
    ctx.translate(outputWidth / 2, outputHeight / 2);

    ctx.rotate(state.rotate * Math.PI / 180);
    ctx.scale(state.flipX, state.flipY);

    const exposureFactor = Math.pow(2, state.exposure / 100);

    ctx.filter = [
      `brightness(${state.brightness * exposureFactor}%)`,
      `contrast(${state.contrast}%)`,
      `saturate(${state.saturation}%)`,
      `hue-rotate(${state.hue}deg)`,
      `grayscale(${state.grayscale}%)`,
      `sepia(${state.sepia}%)`,
      `blur(${state.blur}px)`,
      `sepia(${Math.abs(state.temperature) / 250})`
    ].join(" ");

    ctx.drawImage(
      image,
      -sourceWidth / 2,
      -sourceHeight / 2,
      sourceWidth,
      sourceHeight
    );

    ctx.restore();

    // Re-crop rotated image onto a temporary canvas.
    // This keeps the exported image at the selected aspect ratio.
    if (state.rotate % 360 !== 0 || state.ratio !== "free") {
      const full = document.createElement("canvas");
      full.width = rotatedWidth;
      full.height = rotatedHeight;

      const fullCtx = full.getContext("2d");
      fullCtx.save();
      fullCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
      fullCtx.rotate(state.rotate * Math.PI / 180);
      fullCtx.scale(state.flipX, state.flipY);
      fullCtx.filter = ctx.filter;
      fullCtx.drawImage(
        image,
        -sourceWidth / 2,
        -sourceHeight / 2,
        sourceWidth,
        sourceHeight
      );
      fullCtx.restore();

      ctx.save();
      ctx.clearRect(0, 0, outputWidth, outputHeight);

      if (state.gradient) {
        const gradient = ctx.createLinearGradient(0, 0, outputWidth, outputHeight);
        gradient.addColorStop(0, "#ec4899");
        gradient.addColorStop(1, "#f59e0b");
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = state.background;
      }

      ctx.fillRect(0, 0, outputWidth, outputHeight);
      ctx.drawImage(
        full,
        cropX, cropY, crop.width, crop.height,
        0, 0, outputWidth, outputHeight
      );
      ctx.restore();
    }

    // Vignette
    if (state.vignette > 0) {
      const radius = Math.max(outputWidth, outputHeight) * 0.72;
      const gradient = ctx.createRadialGradient(
        outputWidth / 2, outputHeight / 2, radius * 0.2,
        outputWidth / 2, outputHeight / 2, radius
      );

      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(
        1,
        `rgba(0,0,0,${state.vignette / 100})`
      );

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, outputWidth, outputHeight);
    }

    // Border
    if (state.borderSize > 0) {
      ctx.strokeStyle = state.borderColor;
      ctx.lineWidth = state.borderSize * 2;
      ctx.strokeRect(
        state.borderSize,
        state.borderSize,
        outputWidth - state.borderSize * 2,
        outputHeight - state.borderSize * 2
      );
    }

    // Watermark
    if (state.text.trim()) {
      const scale = outputWidth / 500;
      const fontSize = state.textSize * scale;
      const margin = Math.max(25, outputWidth * 0.04);

      ctx.save();
      ctx.filter = "none";
      ctx.globalAlpha = state.textOpacity / 100;
      ctx.fillStyle = state.textColor;
      ctx.font = `bold ${fontSize}px "${state.textFont}"`;
      ctx.textBaseline = "middle";

      let x = outputWidth / 2;
      let y = outputHeight - margin;

      if (state.textPosition === "top") {
        y = margin + fontSize / 2;
      } else if (state.textPosition === "center") {
        y = outputHeight / 2;
      } else if (state.textPosition === "bottom-left") {
        x = margin;
        ctx.textAlign = "left";
      } else if (state.textPosition === "bottom-right") {
        x = outputWidth - margin;
        ctx.textAlign = "right";
      } else {
        ctx.textAlign = "center";
      }

      ctx.fillText(state.text, x, y, outputWidth - margin * 2);
      ctx.restore();
    }
  }

  // Export
  function exportPhoto() {
    if (!requireImage()) return;

    try {
      drawExport();

      const format = $("#export-format").value;
      const quality = Number($("#export-quality").value);
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

        setTimeout(() => URL.revokeObjectURL(url), 1500);
        notify("Your edited photo has been exported.");
      }, format, quality);

    } catch (error) {
      console.error("Export error:", error);
      notify("Could not export this image.");
    }
  }

  $("#download-btn").addEventListener("click", exportPhoto);
  $("#export-top").addEventListener("click", exportPhoto);

  // AI tools need a real connected AI service.
  $$("[data-ai]").forEach(button => {
    button.addEventListener("click", () => {
      if (!requireImage()) return;

      const toolNames = {
        background: "AI Background Remover",
        object: "AI Object Remover",
        enhance: "AI Photo Enhancer",
        upscale: "AI Image Upscaler"
      };

      notify(
        `${toolNames[button.dataset.ai]} requires an AI API connection.`
      );
    });
  });

  // Initial interface state
  updateHistoryButtons();
  syncControls();
});
