const imageUpload = document.getElementById('imageUpload');
const imageCanvas = document.getElementById('imageCanvas');
const histogramCanvas = document.getElementById('histogramCanvas');
const ctx = imageCanvas.getContext('2d');
const histogramCtx = histogramCanvas.getContext('2d');
let imgData;
let startX = 123;
let startY = 123;

imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            imageCanvas.width = img.width;
            imageCanvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            imgData = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);
});
// Kodlarınız...
function showSegmentation() {
    document.getElementById('histogramSection').style.display = 'none';
    document.getElementById('filtersSection').style.display = 'none';
    document.getElementById('segmentationSection').style.display = 'block';
    setRegionGrowing();
}

// applyActiveContour() fonksiyonunu burada tanımlamanız gerekebilir

function showFilters() {
    document.getElementById('histogramSection').style.display = 'none';
    document.getElementById('filtersSection').style.display = 'block';
    document.getElementById('segmentationSection').style.display = 'none';
}

function showSegmentation() {
    document.getElementById('histogramSection').style.display = 'none';
    document.getElementById('filtersSection').style.display = 'none';
    document.getElementById('segmentationSection').style.display = 'block';
}

function generateHistogram() {
    const data = imgData.data;
    const width = imgData.width;
    const height = imgData.height;

    // Initialize histograms
    const rHist = new Array(256).fill(0);
    const gHist = new Array(256).fill(0);
    const bHist = new Array(256).fill(0);
    const grayHist = new Array(256).fill(0);

    // Populate histograms
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = Math.round((r + g + b) / 3);

        rHist[r]++;
        gHist[g]++;
        bHist[b]++;
        grayHist[gray]++;
    }

    // Draw histograms
    drawHistogram(rHist, 'red');
    drawHistogram(gHist, 'green');
    drawHistogram(bHist, 'blue');
    drawHistogram(grayHist, 'gray');
}

function drawHistogram(hist, color) {
    histogramCanvas.width = 256;
    histogramCanvas.height = 100;
    histogramCtx.fillStyle = 'white';
    histogramCtx.fillRect(0, 0, histogramCanvas.width, histogramCanvas.height);

    const max = Math.max(...hist);
    histogramCtx.fillStyle = color;

    for (let i = 0; i < hist.length; i++) {
        const value = hist[i];
        const percent = value / max;
        const height = percent * histogramCanvas.height;
        histogramCtx.fillRect(i, histogramCanvas.height - height, 1, height);
    }
}

function equalizeHistogram() {
    const data = imgData.data;
    const width = imgData.width;
    const height = imgData.height;

    const hist = new Array(256).fill(0);

    // Compute histogram
    for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
        hist[gray]++;
    }

    // Compute cumulative histogram
    const cumHist = new Array(256).fill(0);
    cumHist[0] = hist[0];
    for (let i = 1; i < hist.length; i++) {
        cumHist[i] = cumHist[i - 1] + hist[i];
    }

    // Normalize cumulative histogram
    const totalPixels = width * height;
    for (let i = 0; i < cumHist.length; i++) {
        cumHist[i] = Math.round((cumHist[i] / totalPixels) * 255);
    }

    // Equalize image
    for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
        const newGray = cumHist[gray];
        data[i] = data[i + 1] = data[i + 2] = newGray;
    }

    ctx.putImageData(imgData, 0, 0);
    generateHistogram();
}

function applyFilter(type) {
    const data = imgData.data;
    const width = imgData.width;
    const height = imgData.height;
    let filteredData;

    switch(type) {
        case 'sharpen':
            filteredData = applySharpenFilter(data, width, height);
            break;
        case 'blur':
            filteredData = applyBlurFilter(data, width, height);
            break;
        case 'edge':
            filteredData = applyEdgeDetectionFilter(data, width, height);
            break;
    }

    ctx.putImageData(new ImageData(filteredData, width, height), 0, 0);
}

function applySharpenFilter(data, width, height) {
    const kernel = [
        [ 0, -1,  0],
        [-1,  5, -1],
        [ 0, -1,  0]
    ];
    return applyConvolution(data, width, height, kernel);
}

function applyBlurFilter(data, width, height) {
    const kernel = [
        [1/9, 1/9, 1/9],
        [1/9, 1/9, 1/9],
        [1/9, 1/9, 1/9]
    ];
    return applyConvolution(data, width, height, kernel);
}

function applyEdgeDetectionFilter(data, width, height) {
    const kernel = [
        [-1, -1, -1],
        [-1,  8, -1],
        [-1, -1, -1]
    ];
    return applyConvolution(data, width, height, kernel);
}

function applyConvolution(data, width, height, kernel) {
    const output = new Uint8ClampedArray(data.length);
    const kernelSize = kernel.length;
    const half = Math.floor(kernelSize / 2);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0;
            for (let ky = -half; ky <= half; ky++) {
                for (let kx = -half; kx <= half; kx++) {
                    const iy = y + ky;
                    const ix = x + kx;
                    if (ix >= 0 && ix < width && iy >= 0 && iy < height) {
                        const weight = kernel[ky + half][kx + half];
                        const index = (iy * width + ix) * 4;
                        r += data[index] * weight;
                        g += data[index + 1] * weight;
                        b += data[index + 2] * weight;
                    }
                }
            }
            const index = (y * width + x) * 4;
            output[index] = r;
            output[index + 1] = g;
            output[index + 2] = b;
            output[index + 3] = data[index + 3];
        }
    }
    
    return output;
}

function setRegionGrowing() {
    imageCanvas.addEventListener('click', function(e) {
        const rect = imageCanvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        applyRegionGrowing(clickX, clickY);
    }, { once: true });
}

function applyRegionGrowing(startX, startY) {
    console.log('Clicked Coordinates:', startX, startY);
    const data = imgData.data;
    const width = imgData.width;
    const height = imgData.height;

    const seedIndex = (Math.floor(startY) * width + Math.floor(startX)) * 4;
    const seedValue = getGrayValue(data, seedIndex);

    const visited = new Array(width * height).fill(false);
    const threshold = 30;
    const stack = [[startX, startY]];

    while (stack.length > 0) {
        const [cx, cy] = stack.pop();
        const index = (Math.floor(cy) * width + Math.floor(cx)) * 4;

        if (visited[Math.floor(cy) * width + Math.floor(cx)]) continue;

        visited[Math.floor(cy) * width + Math.floor(cx)] = true;

        data[index] = 255;
        data[index + 1] = 255;
        data[index + 2] = 255;
        data[index + 3] = 255;

        const neighbors = getNeighbors(cx, cy, width, height);
        for (const [nx, ny] of neighbors) {
            const nIndex = (Math.floor(ny) * width + Math.floor(nx)) * 4;
            const nValue = getGrayValue(data, nIndex);
            if (!visited[Math.floor(ny) * width + Math.floor(nx)] && Math.abs(nValue - seedValue) < threshold) {
                stack.push([nx, ny]);
            }
        }
    }

    ctx.putImageData(imgData, 0, 0);
}

function getGrayValue(data, index) {
    return (data[index] + data[index + 1] + data[index + 2]) / 3;
}

function getNeighbors(x, y, width, height) {
    const neighbors = [];
    if (x > 0) neighbors.push([x - 1, y]);
    if (x < width - 1) neighbors.push([x + 1, y]);
    if (y > 0) neighbors.push([x, y - 1]);
    if (y < height - 1) neighbors.push([x, y + 1]);
    return neighbors;
}
