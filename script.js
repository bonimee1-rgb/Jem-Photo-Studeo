document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const imageContainer = document.getElementById('image-container');
    const previewImg = document.getElementById('preview-img');
    
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    const filterOptions = document.querySelectorAll('.filter-option');
    const mainSlider = document.getElementById('main-slider');
    const sliderLabel = document.getElementById('slider-label');
    const sliderValue = document.getElementById('slider-value');
    
    const rotateLeftBtn = document.getElementById('rotate-left');
    const rotateRightBtn = document.getElementById('rotate-right');
    const flipXBtn = document.getElementById('flip-x');
    const flipYBtn = document.getElementById('flip-y');
    
    const bgChoices = document.querySelectorAll('.bg-choice');
    const customColorPicker = document.getElementById('custom-color-picker');
    
    const watermarkInput = document.getElementById('watermark-input');
    const textColorPicker = document.getElementById('text-color-picker');
    const textSizeSlider = document.getElementById('text-size-slider');
    
    const resetBtn = document.getElementById('reset-btn');
    const changeImgBtn = document.getElementById('change-img-btn');
    const downloadBtn = document.getElementById('download-btn');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // የፋይል መቀየሪያ / ማስገቢያ ሎጂክ
    let currentFilter = 'brightness';
    let filters = { brightness: 100, saturation: 100, contrast: 100, grayscale: 0 };
    let rotate = 0, scaleX = 1, scaleY = 1;
    let currentBg = '#ffffff';
    let hasImage = false;

    // ፎቶ ለመጫን መጫኛዎችን ማገናኘት
    if(uploadPlaceholder) uploadPlaceholder.addEventListener('click', () => fileInput.click());
    if(changeImgBtn) changeImgBtn.addEventListener('click', () => fileInput.click());

    // ፎቶ ሲመረጥ የሚሰራ
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            previewImg.src = event.target.result;
            previewImg.onload = () => {
                uploadPlaceholder.style.display = 'none';
                imageContainer.style.display = 'flex';
                hasImage = true;
                resetAll();
            };
        };
        reader.readAsDataURL(file);
    });

    // ታቦችን መቀየሪያ (Tabs logic)
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => {
                b.classList.remove('bg-slate-800', 'text-white', 'shadow');
                b.classList.add('text-slate-400');
            });
            btn.classList.add('bg-slate-800', 'text-white', 'shadow');
            btn.classList.remove('text-slate-400');

            const target = btn.getAttribute('data-target');
            tabContents.forEach(content => {
                content.classList.add('hidden');
                if (content.id === target) content.classList.remove('hidden');
            });
        });
    });

    // ማጣሪያዎችን መምረጫ (Filter selection)
    filterOptions.forEach(btn => {
        btn.addEventListener('click', () => {
            filterOptions.forEach(b => {
                b.classList.remove('bg-slate-700', 'border-blue-500', 'text-blue-400');
                b.classList.add('bg-slate-800', 'text-slate-300');
            });
            btn.classList.add('bg-slate-700', 'border-blue-500', 'text-blue-400');
            btn.classList.remove('bg-slate-800', 'text-slate-300');

            currentFilter = btn.getAttribute('data-filter');
            sliderLabel.textContent = btn.textContent.trim();
            mainSlider.value = filters[currentFilter];
            sliderValue.textContent = filters[currentFilter] + '%';
            
            if (currentFilter === 'grayscale') {
                mainSlider.max = '100';
            } else {
                mainSlider.max = '200';
            }
        });
    });

    // ስላይደር መቀየሪያ
    mainSlider.addEventListener('input', () => {
        filters[currentFilter] = mainSlider.value;
        sliderValue.textContent = mainSlider.value + '%';
        applyStyles();
    });

    // ማዞሪያ እና ማንጸባረቂያ ቁልፎች
    rotateLeftBtn.addEventListener('click', () => { rotate -= 90; applyStyles(); });
    rotateRightBtn.addEventListener('click', () => { rotate += 90; applyStyles(); });
    flipXBtn.addEventListener('click', () => { scaleX *= -1; applyStyles(); });
    flipYBtn.addEventListener('click', () => { scaleY *= -1; applyStyles(); });

    // የጀርባ (Background) ቀለም መቀየሪያ
    bgChoices.forEach(choice => {
        choice.addEventListener('click', () => {
            currentBg = choice.getAttribute('data-bg');
            if (currentBg === 'gradient-1') {
                imageContainer.style.background = 'linear-gradient(135deg, #f43f5e, #fb923c)';
            } else {
                imageContainer.style.background = currentBg;
            }
        });
    });

    if(customColorPicker) {
        customColorPicker.addEventListener('input', (e) => {
            currentBg = e.target.value;
            imageContainer.style.background = currentBg;
        });
    }

    // በምስሉ ላይ ማስተካከያዎችን መተግበሪያ
    function applyStyles() {
        if (!hasImage) return;
        previewImg.style.transform = `rotate(${rotate}deg) scale(${scaleX}, ${scaleY})`;
        previewImg.style.filter = `brightness(${filters.brightness}%) saturate(${filters.saturation}%) contrast(${filters.contrast}%) grayscale(${filters.grayscale}%)`;
    }

    // ወደ ነበረበት መመለሻ (Reset)
    function resetAll() {
        filters = { brightness: 100, saturation: 100, contrast: 100, grayscale: 0 };
        rotate = 0; scaleX = 1; scaleY = 1;
        currentBg = '#ffffff';
        imageContainer.style.background = currentBg;
        mainSlider.value = 100;
        sliderValue.textContent = '100%';
        if(watermarkInput) watermarkInput.value = '';
        applyStyles();
    }

    resetBtn.addEventListener('click', resetAll);

    // ፎቶውን በከፍተኛ ጥራት ማውረጃ (Download)
    downloadBtn.addEventListener('click', () => {
        if (!hasImage) {
            alert('እባክዎ መጀመሪያ ፎቶ ይምረጡ!');
            return;
        }

        canvas.width = previewImg.naturalWidth;
        canvas.height = previewImg.naturalHeight;

        // የጀርባ ቀለም መሳያ
        if (currentBg === 'gradient-1') {
            let grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            grad.addColorStop(0, '#f43f5e');
            grad.addColorStop(1, '#fb923c');
            ctx.fillStyle = grad;
        } else {
            ctx.fillStyle = currentBg;
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        if (rotate !== 0) ctx.rotate((rotate * Math.PI) / 180);
        ctx.scale(scaleX, scaleY);

        ctx.filter = `brightness(${filters.brightness}%) saturate(${filters.saturation}%) contrast(${filters.contrast}%) grayscale(${filters.grayscale}%)`;
        ctx.drawImage(previewImg, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
        ctx.restore();

        // ጽሁፍ ካለ መጻፊያ
        const text = watermarkInput ? watermarkInput.value.trim() : '';
        if (text !== '') {
            ctx.filter = 'none';
            const fontSize = parseInt(textSizeSlider.value) * (canvas.width / 500);
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.fillStyle = textColorPicker.value;
            ctx.textAlign = 'center';
            ctx.fillText(text, canvas.width / 2, canvas.height - 40);
        }

        // ማውረጃ ሊንክ ማዘጋጀት
        const link = document.createElement('a');
        link.download = 'jem-photo-studio.jpg';
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();
    });
});
