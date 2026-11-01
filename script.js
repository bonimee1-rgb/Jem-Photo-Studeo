const fileInput = document.querySelector("#file-input"),
      previewImg = document.querySelector("#preview-img"),
      filterBtns = document.querySelectorAll(".filter-btns button"),
      filterName = document.querySelector(".filter-info .name"),
      filterValue = document.querySelector(".filter-info .value"),
      filterSlider = document.querySelector("#slider input"),
      rotateBtns = document.querySelectorAll(".rotate-panel button"),
      chooseImgBtn = document.querySelector(".choose-img"),
      resetFilterBtn = document.querySelector(".reset-filter"),
      saveImgBtn = document.querySelector(".save-img");

let brightness = "100", saturation = "100", inversion = "0", grayscale = "0";
let rotate = 0, flipX = 1, flipY = 1;

// ፎቶ መጫን
fileInput.addEventListener("change", () => {
    let file = fileInput.files[0];
    if(!file) return;
    previewImg.src = URL.createObjectURL(file);
    previewImg.addEventListener("load", () => {
        resetFilterBtn.click();
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
        } else if(btn.id === "inversion") {
            filterSlider.max = "100";
            filterSlider.value = inversion;
            filterValue.innerText = `${inversion}%`;
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
    else if(activeBtn.id === "inversion") inversion = filterSlider.value;
    else if(activeBtn.id === "grayscale") grayscale = filterSlider.value;
    
    filterValue.innerText = `${filterSlider.value}%`;
    applyFilter();
});

// የፎቶ ማስተካከያዎችን (Filters & Rotations) በምስሉ ላይ መጫን
function applyFilter() {
    previewImg.style.transform = `rotate(${rotate}deg) scale(${flipX}, ${flipY})`;
    previewImg.style.filter = `brightness(${brightness}%) saturate(${saturation}%) invert(${inversion}%) grayscale(${grayscale}%)`;
}

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

// ሁሉንም ማስተካከያዎች ወደ ነበሩበት መመለስ (Reset)
resetFilterBtn.addEventListener("click", () => {
    brightness = "100"; saturation = "100"; inversion = "0"; grayscale = "0";
    rotate = 0; flipX = 1; flipY = 1;
    filterBtns[0].click();
    applyFilter();
});

// ፎቶውን አውርድ (Download) ማድረግ
saveImgBtn.addEventListener("click", () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = previewImg.naturalWidth;
    canvas.height = previewImg.naturalHeight;
    
    ctx.filter = `brightness(${brightness}%) saturate(${saturation}%) invert(${inversion}%) grayscale(${grayscale}%)`;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    if(rotate !== 0) ctx.rotate(rotate * Math.PI / 180);
    ctx.scale(flipX, flipY);
    ctx.drawImage(previewImg, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    
    const link = document.createElement("a");
    link.download = "jem-edited-photo.jpg";
    link.href = canvas.toDataURL();
    link.click();
});

chooseImgBtn.addEventListener("click", () => fileInput.click());
