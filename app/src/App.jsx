import React, { useState, useRef, useEffect } from 'react';
import { Upload, Copy, Download, Image, Check, Share2, AlertCircle, Info, Palette, Trash2, X } from 'lucide-react';

// ============================================
// CONFIGURACIÓN PARA TESTING (HARDCODED)
// ============================================
const TEST_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB (CP004 y CP005)
  MAX_RESOLUTION: { width: 1920, height: 1200 }, // CP006
  NUM_COLORS: 5, // Cambiar a 20 para CP007
  VALID_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
};

export default function ColorPaletteExtractor() {
  const [image, setImage] = useState(null);
  const [colors, setColors] = useState([]);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [imageInfo, setImageInfo] = useState(null);
  const [showTestInfo, setShowTestInfo] = useState(true);
  const [previousPalette, setPreviousPalette] = useState(null); // CP011
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  // ============================================
  // CP011: RECUPERAR PALETA DE SESIÓN ANTERIOR
  // ============================================
  useEffect(() => {
    // Cargar paleta anterior de localStorage al iniciar
    try {
      const savedPalette = localStorage.getItem('lastPalette');
      if (savedPalette) {
        const parsedPalette = JSON.parse(savedPalette);
        setPreviousPalette(parsedPalette);
      }
    } catch (error) {
      console.error('Error al cargar paleta de localStorage:', error);
    }
  }, []);

  const savePaletteToSession = (paletteData) => {
    try {
      // Guardar en localStorage
      localStorage.setItem('lastPalette', JSON.stringify(paletteData));
      setPreviousPalette(paletteData);
    } catch (error) {
      console.error('Error al guardar paleta en localStorage:', error);
    }
  };

  const clearPreviousPalette = () => {
    try {
      // Borrar de localStorage
      localStorage.removeItem('lastPalette');
      setPreviousPalette(null);
    } catch (error) {
      console.error('Error al borrar paleta de localStorage:', error);
    }
  };

  // ============================================
  // VALIDACIONES (CP002, CP003, CP004, CP005, CP006)
  // ============================================
  const validateFile = async (file) => {
    // CP002: Validar tipo de archivo
    if (!TEST_CONFIG.VALID_TYPES.includes(file.type)) {
      setError('Error: El archivo no es válido');
      return false;
    }

    // CP005: Validar tamaño máximo (más de 50MB)
    if (file.size > TEST_CONFIG.MAX_FILE_SIZE) {
      setError('Error: El archivo excede el tamaño máximo permitido');
      return false;
    }

    // CP003: Intentar detectar archivo corrupto
    try {
      const isValid = await validateImageIntegrity(file);
      if (!isValid) {
        setError('Error: El archivo no es válido');
        return false;
      }
    } catch (err) {
      setError('Error: El archivo no es válido');
      return false;
    }

    return true;
  };

  // Validar integridad de la imagen (CP003)
  const validateImageIntegrity = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(false);
      reader.readAsDataURL(file);
    });
  };

  // CP006: Validar resolución de la imagen
  const validateResolution = (img) => {
    const { width, height } = img;
    const maxWidth = TEST_CONFIG.MAX_RESOLUTION.width;
    const maxHeight = TEST_CONFIG.MAX_RESOLUTION.height;

    if (width > maxWidth || height > maxHeight) {
      setError(`Error: La resolución máxima de ${maxWidth}×${maxHeight}px ha sido excedida`);
      return false;
    }
    return true;
  };

  // ============================================
  // CP013: DETECTAR SI ES IMAGEN EN BLANCO Y NEGRO
  // ============================================
  const isGrayscaleImage = (pixels) => {
    let grayscaleCount = 0;
    const sampleSize = Math.min(1000, pixels.length / 4); // Muestrear 1000 píxeles

    for (let i = 0; i < sampleSize * 4; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      
      // Verificar si R, G, B son similares (tolerancia de ±5)
      if (Math.abs(r - g) <= 5 && Math.abs(g - b) <= 5 && Math.abs(r - b) <= 5) {
        grayscaleCount++;
      }
    }

    // Si más del 90% de los píxeles son escala de grises
    return (grayscaleCount / sampleSize) > 0.9;
  };

  // ============================================
  // EXTRACCIÓN DE COLORES (CP001, CP007, CP013, CP015)
  // ============================================
  const extractColors = (img, filename = '') => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const maxSize = 200;
    const scale = Math.min(maxSize / img.width, maxSize / img.height);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    
    // CP015: Para GIF, solo procesa el primer frame (que ya está en img)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    
    // CP013: Detectar si es imagen en blanco y negro
    const isGrayscale = isGrayscaleImage(pixels);
    
    const colorMap = {};
    for (let i = 0; i < pixels.length; i += 16) {
      const r = Math.round(pixels[i] / 10) * 10;
      const g = Math.round(pixels[i + 1] / 10) * 10;
      const b = Math.round(pixels[i + 2] / 10) * 10;
      const key = `${r},${g},${b}`;
      colorMap[key] = (colorMap[key] || 0) + 1;
    }
    
    // CP007: Usar NUM_COLORS configurado (5 por defecto, 20 para prueba)
    const sortedColors = Object.entries(colorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, TEST_CONFIG.NUM_COLORS)
      .map(([color]) => {
        const [r, g, b] = color.split(',').map(Number);
        return rgbToHex(r, g, b);
      });
    
    setColors(sortedColors);

    // CP011: Guardar en sesión
    const paletteData = {
      colors: sortedColors,
      timestamp: new Date().toISOString(),
      filename: filename,
      isGrayscale: isGrayscale
    };
    savePaletteToSession(paletteData);
  };

  const rgbToHex = (r, g, b) => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('').toUpperCase();
  };

  // ============================================
  // MANEJO DE ARCHIVOS
  // ============================================
  const handleFile = async (file) => {
    setError('');
    setCopiedIndex(null);
    
    const isValid = await validateFile(file);
    if (!isValid) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        // CP006: Validar resolución
        if (!validateResolution(img)) {
          setImage(null);
          setColors([]);
          return;
        }

        setImage(e.target.result);
        setImageInfo({
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2),
          dimensions: `${img.width}×${img.height}`,
          type: file.type,
          isGif: file.type === 'image/gif' // CP015
        });
        extractColors(img, file.name);
      };
      img.onerror = () => {
        setError('Error: El archivo no es válido');
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

  // ============================================
  // CP014: RECARGAR PÁGINA LIMPIAMENTE
  // ============================================
  const handleNewUpload = () => {
    setImage(null);
    setColors([]);
    setError('');
    setImageInfo(null);
    // CP014: No borramos la paleta anterior, solo limpiamos el formulario
  };

  // ============================================
  // FUNCIONALIDADES ADICIONALES
  // ============================================
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

  // ============================================
  // CP010: CREAR IMAGEN PARA COMPARTIR
  // ============================================
  const createShareImage = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Dimensiones de la imagen a compartir
    canvas.width = 1200;
    canvas.height = 630; // Tamaño óptimo para OpenGraph
    
    // Fondo degradado
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Título
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText('Paleta de Colores', 60, 80);
    
    // Subtítulo
    ctx.fillStyle = '#64748b';
    ctx.font = '24px sans-serif';
    ctx.fillText(`${colors.length} colores dominantes`, 60, 120);
    
    // Dibujar paleta de colores
    const colorWidth = 1080 / colors.length;
    const startY = 180;
    const colorHeight = 250;
    
    colors.forEach((color, index) => {
      // Rectángulo de color
      ctx.fillStyle = color;
      ctx.fillRect(60 + (index * colorWidth), startY, colorWidth - 10, colorHeight);
      
      // Sombra suave
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 5;
      
      // Código hexadecimal
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 20px monospace';
      ctx.shadowColor = 'transparent';
      const textWidth = ctx.measureText(color).width;
      const textX = 60 + (index * colorWidth) + (colorWidth - 10) / 2 - textWidth / 2;
      ctx.fillText(color, textX, startY + colorHeight + 35);
    });
    
    // Pie de página
    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px sans-serif';
    ctx.fillText('Generado con Extractor de Paleta de Colores', 60, 570);
    
    return canvas;
  };

  // ============================================
  // SUBIR A IMGBB (alternativa más simple que Imgur)
  // ============================================
  const uploadToImgBB = async (imageDataUrl) => {
    // API Key de ImgBB (obtén la tuya gratis en https://api.imgbb.com/)
    const IMGBB_API_KEY = '2a9683657b6fed5e994603409968142a'; // Reemplaza con tu API Key
    
    try {
      // Extraer solo el base64 (sin el prefijo data:image/png;base64,)
      const base64Data = imageDataUrl.split(',')[1];
      
      // Crear FormData
      const formData = new FormData();
      formData.append('image', base64Data);
      
      // Subir a ImgBB
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.data.url; // URL pública de la imagen
      } else {
        throw new Error('Error al subir imagen a ImgBB');
      }
    } catch (error) {
      console.error('Error al subir a ImgBB:', error);
      return null;
    }
  };

  // También mantenemos Imgur como alternativa
  const uploadToImgur = async (imageDataUrl) => {
    // Client ID de Imgur (si logras obtenerlo)
    const IMGUR_CLIENT_ID = 'c5f3def536dd123';
    
    try {
      const blob = await fetch(imageDataUrl).then(r => r.blob());
      const formData = new FormData();
      formData.append('image', blob);
      
      const response = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: {
          'Authorization': `Client-ID ${IMGUR_CLIENT_ID}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.data.link;
      } else {
        throw new Error('Error al subir imagen a Imgur');
      }
    } catch (error) {
      console.error('Error al subir a Imgur:', error);
      return null;
    }
  };

  // ============================================
  // CP010: COMPARTIR EN REDES SOCIALES CON IMAGEN
  // ============================================
  const [isUploading, setIsUploading] = useState(false);

  const shareToSocial = async (platform) => {
    setIsUploading(true);
    
    try {
      // Crear imagen combinada
      const shareCanvas = createShareImage();
      const imageDataUrl = shareCanvas.toDataURL('image/png', 0.9);
      
      // Intentar subir a ImgBB primero, luego Imgur como fallback
      let publicUrl = await uploadToImgBB(imageDataUrl);
      
      if (!publicUrl) {
        console.log('ImgBB falló, intentando con Imgur...');
        publicUrl = await uploadToImgur(imageDataUrl);
      }
      
      if (!publicUrl) {
        alert('❌ Error al subir la imagen.\n\n💡 Tip: Obtén tu API Key gratis en https://api.imgbb.com/ y reemplázala en el código.');
        setIsUploading(false);
        return;
      }
      
      const paletteText = `🎨 Paleta de Colores: ${colors.join(', ')}`;
      
      const urls = {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(paletteText)}&url=${encodeURIComponent(publicUrl)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(paletteText + '\n' + publicUrl)}`,
      };
      
      window.open(urls[platform], '_blank', 'width=600,height=400');
      
    } catch (error) {
      console.error('Error al compartir:', error);
      alert('Hubo un error al compartir la imagen.');
    } finally {
      setIsUploading(false);
    }
  };

  // Alternativa: Descargar imagen para compartir manualmente
  const downloadShareImage = () => {
    const shareCanvas = createShareImage();
    shareCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paleta-colores-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png', 0.9);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* CP012: Header con Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-2xl shadow-lg">
              <Palette className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-800">
              Paleta de Colores
            </h1>
          </div>
          <p className="text-slate-600">
            Sube una imagen y obtén sus {TEST_CONFIG.NUM_COLORS} colores dominantes
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Compatible con JPG, PNG, GIF animado, WEBP, BMP • Máx {TEST_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB
          </p>
        </div>

        {/* Panel de Información de Testing */}
        {showTestInfo && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Configuración de Testing
                </h3>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• Tamaño máximo: {TEST_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB (CP004, CP005)</p>
                  <p>• Resolución máxima: {TEST_CONFIG.MAX_RESOLUTION.width}×{TEST_CONFIG.MAX_RESOLUTION.height}px (CP006)</p>
                  <p>• Colores a extraer: {TEST_CONFIG.NUM_COLORS} (CP001, CP007)</p>
                  <p>• Formatos: JPG, PNG, GIF animado, WEBP, BMP (CP002, CP015)</p>
                  <p>• Detección B&N: Activa (CP013) • Persistencia: Activa (CP011)</p>
                </div>
              </div>
              <button
                onClick={() => setShowTestInfo(false)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* CP011: PALETA DE SESIÓN ANTERIOR */}
        {previousPalette && !image && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-amber-900 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Última paleta generada (CP011)
                </h3>
                <p className="text-xs text-amber-700 mt-1">
                  {previousPalette.filename} • {new Date(previousPalette.timestamp).toLocaleString()}
                  {previousPalette.isGrayscale && ' • Imagen en B&N detectada'}
                </p>
              </div>
              <button
                onClick={clearPreviousPalette}
                className="text-amber-600 hover:text-amber-800 p-1"
                title="Borrar paleta anterior"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              {previousPalette.colors.map((color, idx) => (
                <div
                  key={idx}
                  className="flex-1 h-12 rounded-lg shadow-sm border border-amber-200"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}

        {/* Área de carga */}
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
              JPG, PNG, GIF, WEBP, BMP - Máximo {TEST_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Resolución máxima: {TEST_CONFIG.MAX_RESOLUTION.width}×{TEST_CONFIG.MAX_RESOLUTION.height}px
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
            {/* Imagen cargada */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                    <Image className="w-5 h-5" />
                    Imagen cargada
                  </h2>
                  {imageInfo && (
                    <p className="text-xs text-slate-500 mt-1">
                      {imageInfo.name} • {imageInfo.size}MB • {imageInfo.dimensions}
                      {imageInfo.isGif && ' • GIF Animado (primer frame)'}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleNewUpload}
                  className="text-sm text-slate-600 hover:text-slate-800 px-4 py-2 rounded-lg hover:bg-slate-100"
                >
                  Cambiar imagen
                </button>
              </div>
              <img src={image} alt="Uploaded" className="w-full h-auto rounded-lg" />
            </div>

            {/* Paleta de colores */}
            {colors.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-slate-800">
                    Paleta de Colores ({colors.length} colores)
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={downloadPalette}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Descargar
                    </button>
                  </div>
                </div>
                
                {/* CP013: Indicador de imagen B&N */}
                {previousPalette?.isGrayscale && (
                  <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-sm text-slate-700">
                      ✓ Imagen en blanco y negro detectada (CP013) - Mostrando escala de grises
                    </p>
                  </div>
                )}

                <div className={`grid gap-4 ${colors.length > 10 ? 'grid-cols-10' : 'grid-cols-5'}`}>
                  {colors.map((color, index) => (
                    <div key={index} className="space-y-3">
                      <div
                        className="aspect-square rounded-lg shadow-md hover:shadow-lg transition-shadow"
                        style={{ backgroundColor: color }}
                      />
                      <div className="space-y-2">
                        <p className="text-xs font-mono text-center text-slate-700">{color}</p>
                        <button
                          onClick={() => copyToClipboard(color, index)}
                          className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check className="w-3 h-3" />
                              OK
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copiar
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CP010: Compartir en Redes Sociales */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Share2 className="w-4 h-4" />
                    Compartir en Redes Sociales (CP010)
                  </h3>
                  
                  {isUploading && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                      ⏳ Subiendo imagen a Imgur...
                    </div>
                  )}
                  
                  <div className="flex gap-3 mb-3">
                    <button
                      onClick={() => shareToSocial('twitter')}
                      disabled={isUploading}
                      className="flex-1 px-4 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? 'Subiendo...' : 'Twitter / X'}
                    </button>
                    <button
                      onClick={() => shareToSocial('facebook')}
                      disabled={isUploading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? 'Subiendo...' : 'Facebook'}
                    </button>
                    <button
                      onClick={() => shareToSocial('whatsapp')}
                      disabled={isUploading}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? 'Subiendo...' : 'WhatsApp'}
                    </button>
                  </div>
                  
                  <button
                    onClick={downloadShareImage}
                    className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Descargar imagen para compartir
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mensajes de error */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 flex-1">{error}</p>
          </div>
        )}

        {/* CP012: Footer con información */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Extractor de Paleta de Colores v1.0 • Casos de prueba: CP001-CP015</p>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}