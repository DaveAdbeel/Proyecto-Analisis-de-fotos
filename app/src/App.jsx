import React, { useState, useRef } from 'react';
import { Upload, Copy, Download, Image, Check } from 'lucide-react';

export default function ColorPaletteExtractor() {
  const [image, setImage] = useState(null);
  const [colors, setColors] = useState([]);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const VALID_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];

  const validateFile = (file) => {
    if (!VALID_TYPES.includes(file.type)) {
      setError('Formato de archivo no válido. Solo se permiten imágenes.');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('El archivo excede el límite de 10MB.');
      return false;
    }
    return true;
  };

  const extractColors = (img) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Redimensionar para mejor rendimiento
    const maxSize = 200;
    const scale = Math.min(maxSize / img.width, maxSize / img.height);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    
    // Muestrear píxeles (cada 4 píxeles para rendimiento)
    const colorMap = {};
    for (let i = 0; i < pixels.length; i += 16) {
      const r = Math.round(pixels[i] / 10) * 10;
      const g = Math.round(pixels[i + 1] / 10) * 10;
      const b = Math.round(pixels[i + 2] / 10) * 10;
      const key = `${r},${g},${b}`;
      colorMap[key] = (colorMap[key] || 0) + 1;
    }
    
    // Ordenar por frecuencia y tomar los 5 más comunes
    const sortedColors = Object.entries(colorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => {
        const [r, g, b] = color.split(',').map(Number);
        return rgbToHex(r, g, b);
      });
    
    setColors(sortedColors);
  };

  const rgbToHex = (r, g, b) => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('').toUpperCase();
  };

  const handleFile = (file) => {
    setError('');
    setCopiedIndex(null);
    
    if (!validateFile(file)) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        setImage(e.target.result);
        extractColors(img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const copyToClipboard = (color, index) => {
    navigator.clipboard.writeText(color);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const downloadPalette = () => {
    const paletteText = colors.join('\n');
    const blob = new Blob([paletteText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paleta-colores.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Extractor de Paleta de Colores</h1>
          <p className="text-slate-600">Sube una imagen y obtén sus 5 colores dominantes</p>
        </div>

        {!image ? (
          <div
            className={`border-3 border-dashed rounded-2xl p-16 text-center transition-all cursor-pointer ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-slate-300 bg-white hover:border-slate-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
          >
            <Upload className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <p className="text-xl text-slate-700 mb-2">
              Arrastra una imagen aquí o haz clic para seleccionar
            </p>
            <p className="text-sm text-slate-500">
              JPG, PNG, GIF, WEBP, BMP, SVG - Máximo 10MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Imagen cargada
                </h2>
                <button
                  onClick={() => {
                    setImage(null);
                    setColors([]);
                    setError('');
                  }}
                  className="text-sm text-slate-600 hover:text-slate-800"
                >
                  Cambiar imagen
                </button>
              </div>
              <img src={image} alt="Uploaded" className="w-full h-auto rounded-lg" />
            </div>

            {colors.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-slate-800">
                    Paleta de Colores
                  </h2>
                  <button
                    onClick={downloadPalette}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Descargar Paleta
                  </button>
                </div>
                
                <div className="grid grid-cols-5 gap-4">
                  {colors.map((color, index) => (
                    <div key={index} className="space-y-3">
                      <div
                        className="aspect-square rounded-lg shadow-md hover:shadow-lg transition-shadow"
                        style={{ backgroundColor: color }}
                      />
                      <div className="space-y-2">
                        <p className="text-sm font-mono text-center text-slate-700">{color}</p>
                        <button
                          onClick={() => copyToClipboard(color, index)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check className="w-4 h-4" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copiar
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
