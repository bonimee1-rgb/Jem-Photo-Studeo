const fileInput = document.querySelector("#file-input"),
      previewImg = document.querySelector("#preview-img"),
      previewBox = document.querySelector(".preview-box"),
      placeholderText = document.querySelector("#placeholder-text"),
      filterBtns = document.querySelectorAll(".filter-btns button"),
      filterName = document.querySelector(".filter-info .name"),
      filterValue = document.querySelector(".filter-info .value"),
      filterSlider = document.querySelector("#filter-slider"),
      rotateBtns = document.querySelectorAll(".rotate-panel button"),
      chooseImgBtn = document.querySelector(".choose-img"),
      resetFilterBtn = document.querySelector(".reset-filter"),
      saveImgBtn = document.querySelector(".save-img"),
      tabBtns = document.querySelectorAll(".tab-btn"),
      panels = document.querySelectorAll(".panel"),
      bgBtns = document.querySelectorAll(".bg-btn"),
      customBgColor = document.querySelector("#custom-bg-color"),
      watermarkInput = document.querySelector("#watermark-text"),
      textColorInput = document.querySelector("#text-color"),
      textSizeInput = document.querySelector("#text-size"),
      applyTextBtn = document.querySelector("#apply-text-btn"),
      canvas = document.querySelector("#output-canvas"),
      ctx = canvas.getContext("2d");

let brightness = 100, saturation = 100, contrast = 100, grayscale = 0;
let rotate = 0, flipX = 1, flipY = 1;
let currentBg = "#ffffff";
let customText = "";
let textColor = "#ffffff";
let textSize = 24;

// ፎቶ መጫን ሎጂክ
fileInput.addEventListener("change", (e) => {
    let file = e.target.files[0];
    if(!file) return;
    previewImg.src = URL.createObjectURL(file);
    previewImg.style.display = "block";
    placeholderText.style.display = "none";
    previewImg.addEventListener("load", () => {
        resetFilterBtn.click();
    });
});

// ታብ (Tabs) መቀየሪያ
tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        panels.forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(btn.dataset.target).classList.add("active");
    });
});

// ማስተካከያ (Filters) መቀየሪያ
filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelector(".filter-btns .active").classList.remove("active");
        btn.classList.add("active");
        filterName.innerText = btn.innerText;

        if(btn.id === "brightness") {
            filterSlider.max = "200";
            filterSlider.value = brightness;
            filterValue.innerText = `${brightness}%`;
        } else if(btn.id === "saturation") {
            filterSlider.max = "200";
            filterSlider.value = saturation;
            filterValue.innerText = `${saturation}%`;
        } else if(btn.id === "contrast") {
            filterSlider.max = "200";
            filterSlider.value = contrast;
            filterValue.innerText = `${contrast}%`;
        } else if(btn.id === "grayscale") {
            filterSlider.max = "100";
            filterSlider.value = grayscale;
            filterValue.innerText = `${grayscale}%`;
        }
    });
});

// የስላይደር እሴት መቀየር
filterSlider.addEventListener("input", () => {
    let activeBtn = document.querySelector(".filter-btns .active");
    if(activeBtn.id === "brightness") brightness = filterSlider.value;
    else if(activeBtn.id === "saturation") saturation = filterSlider.value;
    else if(activeBtn.id === "contrast") contrast = filterSlider.value;
    else if(activeBtn.id === "grayscale") grayscale = filterSlider.value;
    
    filterValue.innerText = `${filterSlider.value}%`;
    applyFilter();
});

// የፎቶ ማስተካከያዎችን (Filters & Rotations) በምስሉ ላይ መጫን
function applyFilter() {
    previewImg.style.transform = `rotate(${rotate}deg) scale(${flipX}, ${flipY})`;
    previewImg.style.filter = `brightness(${brightness}%) saturate(${saturation}%) contrast(${contrast}%) grayscale(${grayscale}%)`;
}

// ጀርባ (Background) መቀየር
bgBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        currentBg = btn.dataset.bg;
        if(currentBg === "gradient-1") {
            previewBox.style.background = "linear-gradient(45deg, #ff9a9e, #fad0c4)";
        } else {
            previewBox.style.background = currentBg;
        }
    });
});

customBgColor.addEventListener("input", (e) => {
    currentBg = e.target.value;
    previewBox.style.background = currentBg;
});

// ማዞሪያ እና ማንጸባረቂያ ቁልፎች (Rotate & Flip)
rotateBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        if(btn.id === "rotate-left") rotate -= 90;
        else if(btn.id === "rotate-right") rotate += 90;
        else if(btn.id === "flip-x") flipX = flipX === 1 ? -1 : 1;
        else if(btn.id === "flip-y") flipY = flipY === 1 ? -1 : 1;
        applyFilter();
    });
});

// ጽሁፍ መቅረጽ
applyTextBtn.addEventListener("click", () => {
    customText = watermarkInput.value;
    textColor = textColorInput.value;
    textSize = textSizeInput.value;
    alert("ጽሁፉ ተዘጋጅቷል! ፎቶውን ሲያወርዱ (Download ሲያደርጉ) በፎቶው ላይ ይታያል።");
});

// ሁሉንም ማስተካከያዎች ወደ ነበሩበት መመለስ (Reset)
resetFilterBtn.addEventListener("click", () => {
    brightness = 100; saturation = 100; contrast = 100; grayscale = 0;
    rotate = 0; flipX = 1; flipY = 1;
    currentBg = "#ffffff";
    previewBox.style.background = currentBg;
    customText = "";
    watermarkInput.value = "";
    filterBtns[0].click();
    applyFilter();
});

// ፎቶውን አውርድ (Download) ማድረግ
saveImgBtn.addEventListener("click", () => {
    if(!previewImg.src || previewImg.style.display === "none") {
        alert("እባክዎ መጀመሪያ ፎቶ ይምረጡ!");
        return;
    }

    canvas.width = previewImg.naturalWidth;
    canvas.height = previewImg.naturalHeight;
    
    // የጀርባ ቀለም በካንቫስ ላይ መሙላት
    if(currentBg === "gradient-1") {
        let grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, "#ff9a9e");
        grad.addColorStop(1, "#fad0c4");
        ctx.fillStyle = grad;
    } else {
        ctx.fillStyle = currentBg;
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.filter = `brightness(${brightness}%) saturate(${saturation}%) contrast(${contrast}%) grayscale(${grayscale}%)`;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    if(rotate !== 0) ctx.rotate(rotate * Math.PI / 180);
    ctx.scale(flipX, flipY);
    ctx.drawImage(previewImg, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    ctx.restore();

    // ጽሁፍ ማከል (ካለ)
    if(customText !== "") {
        ctx.filter = "none";
        ctx.font = `${textSize * (canvas.width / 500)}px sans-serif`;
        ctx.fillStyle = textColor;
        ctx.textAlign = "center";
        ctx.fillText(customText, canvas.width / 2, canvas.height - 40);
    }
    
    const link = document.createElement("a");
    link.download = "jem-studio-edited.jpg";
    link.href = canvas.toDataURL();
    link.click();
});

chooseImgBtn.addEventListener("click", () => fileInput.click());
