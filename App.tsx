
import React, { useState, useRef, useCallback } from 'react';
import { AppMode, AspectRatio, ImageFile, ProcessingState } from './types';
import { processImage } from './services/gemini';
import { 
  Shirt, 
  User, 
  Trash2, 
  Eraser, 
  Image as ImageIcon, 
  Download, 
  RefreshCw,
  Layers,
  Layout,
  ChevronRight,
  Plus
} from 'lucide-react';

const ASPECT_RATIOS: { label: string; value: AspectRatio }[] = [
  { label: '1:1 Square', value: '1:1' },
  { label: '9:16 Story', value: '9:16' },
  { label: '16:9 Banner', value: '16:9' },
];

const MODES = [
  // Fix: changed icon to Shirt
  { id: AppMode.TRY_ON, name: 'AI Try-On', icon: Shirt, desc: 'Swap clothes instantly' },
  { id: AppMode.POSE_CHANGE, name: 'Pose Swap', icon: User, desc: 'Change body posture' },
  { id: AppMode.OBJECT_REMOVAL, name: 'Smart Eraser', icon: Eraser, desc: 'Remove unwanted objects' },
  { id: AppMode.REMOVE_BG, name: 'Cutout', icon: Layers, desc: 'Remove background' },
];

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.TRY_ON);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [modelImage, setModelImage] = useState<ImageFile | null>(null);
  const [productImages, setProductImages] = useState<ImageFile[]>([]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: '',
    error: null
  });

  // For Object Removal
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [poseInput, setPoseInput] = useState('standing casually');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'model' | 'product') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      url: URL.createObjectURL(file),
      file
    }));

    if (type === 'model') {
      setModelImage(newImages[0]);
      setResultImage(null);
    } else {
      setProductImages(prev => [...prev, ...newImages]);
    }
  };

  const removeProduct = (id: string) => {
    setProductImages(prev => prev.filter(p => p.id !== id));
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeMode !== AppMode.OBJECT_REMOVAL) return;
    setIsDrawing(true);
    draw(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleProcess = async () => {
    if (!modelImage) {
      setProcessing({ isProcessing: false, progress: '', error: 'Please upload a model image first.' });
      return;
    }

    setProcessing({ isProcessing: true, progress: 'AI is analyzing your images...', error: null });

    try {
      let maskData: string | undefined;
      if (activeMode === AppMode.OBJECT_REMOVAL && canvasRef.current) {
        maskData = canvasRef.current.toDataURL('image/png');
      }

      const result = await processImage(
        activeMode,
        modelImage.file,
        productImages.map(p => p.file),
        aspectRatio,
        maskData,
        poseInput
      );

      setResultImage(result);
      setProcessing({ isProcessing: false, progress: '', error: null });
    } catch (err: any) {
      console.error(err);
      setProcessing({ 
        isProcessing: false, 
        progress: '', 
        error: err.message || 'An unexpected error occurred. Please try again.' 
      });
    }
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `fashion-studio-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar Controls */}
      <aside className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-display font-bold text-indigo-600 mb-1">Fashion Studio</h1>
          <p className="text-xs text-slate-400 font-medium tracking-wider uppercase mb-8">AI Creative Engine</p>

          <section className="space-y-6">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-3 block">Process Mode</label>
              <div className="grid grid-cols-1 gap-2">
                {MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setActiveMode(mode.id);
                      setResultImage(null);
                    }}
                    className={`flex items-center p-3 rounded-xl border-2 transition-all text-left ${
                      activeMode === mode.id 
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg mr-3 ${activeMode === mode.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <mode.icon size={18} />
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${activeMode === mode.id ? 'text-indigo-900' : 'text-slate-700'}`}>{mode.name}</div>
                      <div className="text-[11px] text-slate-500">{mode.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 mb-3 block">Layout & Ratio</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.value}
                    onClick={() => setAspectRatio(ratio.value)}
                    className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                      aspectRatio === ratio.value 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {ratio.value}
                  </button>
                ))}
              </div>
            </div>

            {activeMode === AppMode.POSE_CHANGE && (
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Desired Pose</label>
                <input 
                  type="text" 
                  value={poseInput}
                  onChange={(e) => setPoseInput(e.target.value)}
                  placeholder="e.g. Sitting on a stool"
                  className="w-full text-sm p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            )}

            {activeMode === AppMode.TRY_ON && (
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-3 block">
                  Product Assets <span className="text-slate-400 font-normal">({productImages.length})</span>
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {productImages.map(img => (
                    <div key={img.id} className="relative aspect-square group">
                      <img src={img.url} className="w-full h-full object-cover rounded-md border border-slate-200" alt="product" />
                      <button 
                        onClick={() => removeProduct(img.id)}
                        className="absolute -top-1 -right-1 bg-white shadow-md border border-slate-100 rounded-full p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  <label className="aspect-square border-2 border-dashed border-slate-200 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all text-slate-400 hover:text-indigo-500">
                    <Plus size={20} />
                    <input type="file" multiple onChange={(e) => handleFileUpload(e, 'product')} className="hidden" accept="image/*" />
                  </label>
                </div>
              </div>
            )}

            <button
              onClick={handleProcess}
              disabled={processing.isProcessing || !modelImage}
              className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg ${
                processing.isProcessing || !modelImage
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0'
              }`}
            >
              {processing.isProcessing ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <ChevronRight size={18} />
                  <span>Generate AI Visual</span>
                </>
              )}
            </button>
          </section>
        </div>

        <div className="mt-auto p-6 border-t border-slate-100 bg-slate-50/50">
          <div className="text-xs text-slate-400 text-center">
            Precision Fashion Image Processing <br />Powered by Gemini 2.5
          </div>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 flex flex-col h-screen">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tight">
              {activeMode.replace('_', ' ')}
            </div>
            {processing.error && (
              <span className="text-red-500 text-xs font-medium animate-pulse">{processing.error}</span>
            )}
          </div>
          
          {resultImage && (
            <button 
              onClick={downloadResult}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-md"
            >
              <Download size={16} />
              Export Result
            </button>
          )}
        </header>

        <div className="flex-1 overflow-hidden p-8 flex items-center justify-center bg-slate-100">
          <div 
            className={`relative bg-white shadow-2xl rounded-2xl overflow-hidden transition-all duration-500 ${
              aspectRatio === '1:1' ? 'aspect-square w-full max-w-2xl' : 
              aspectRatio === '9:16' ? 'aspect-[9/16] h-full max-h-[80vh]' : 
              'aspect-[16/9] w-full max-w-4xl'
            }`}
          >
            {!modelImage ? (
              <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors group">
                <div className="w-20 h-20 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ImageIcon size={40} />
                </div>
                <p className="text-xl font-semibold text-slate-800 mb-2">Upload Model Photo</p>
                <p className="text-slate-500 text-sm mb-6 px-12 text-center">Click or drag your base image to start. Use a clear full-body or half-body portrait for best results.</p>
                <span className="px-6 py-3 bg-indigo-600 text-white rounded-full font-medium shadow-md">Select Image</span>
                <input type="file" onChange={(e) => handleFileUpload(e, 'model')} className="hidden" accept="image/*" />
              </label>
            ) : (
              <div className="relative w-full h-full">
                {/* Before Image */}
                <img 
                  src={resultImage || modelImage.url} 
                  className={`w-full h-full object-cover transition-opacity duration-700 ${processing.isProcessing ? 'opacity-40 grayscale blur-sm' : 'opacity-100'}`} 
                  alt="preview" 
                />

                {/* Object Removal Mask Overlay */}
                {activeMode === AppMode.OBJECT_REMOVAL && !resultImage && (
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="absolute inset-0 z-10 cursor-crosshair"
                    width={800} // Logical width, actual size controlled by parent CSS
                    height={800}
                  />
                )}

                {/* Controls overlay */}
                {modelImage && !resultImage && (
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button 
                      onClick={() => setModelImage(null)}
                      className="p-3 bg-white/90 backdrop-blur rounded-full shadow-lg text-slate-700 hover:text-red-500 transition-colors"
                      title="Remove model image"
                    >
                      <Trash2 size={20} />
                    </button>
                    {activeMode === AppMode.OBJECT_REMOVAL && (
                      <button 
                        onClick={clearMask}
                        className="p-3 bg-white/90 backdrop-blur rounded-full shadow-lg text-slate-700 hover:text-indigo-600 transition-colors"
                        title="Clear mask"
                      >
                        <RefreshCw size={20} />
                      </button>
                    )}
                  </div>
                )}

                {/* After - Result Tag */}
                {resultImage && (
                  <div className="absolute top-6 left-6 bg-indigo-600 text-white px-4 py-2 rounded-full font-bold text-sm shadow-xl animate-bounce">
                    AI GEN RESULT
                  </div>
                )}

                {/* Floating Processing Loader */}
                {processing.isProcessing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-indigo-900/10 backdrop-blur-sm">
                    <div className="relative">
                      <div className="w-24 h-24 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        {/* Fix: changed icon to Shirt */}
                        <Shirt className="text-indigo-600 animate-pulse" size={32} />
                      </div>
                    </div>
                    <p className="mt-8 text-indigo-900 font-bold tracking-widest text-lg animate-pulse">{processing.progress}</p>
                    <p className="mt-2 text-indigo-700/60 text-sm">Fine-tuning pixels and lighting...</p>
                  </div>
                )}
                
                {resultImage && (
                  <button 
                    onClick={() => setResultImage(null)}
                    className="absolute bottom-6 right-6 px-6 py-3 bg-white/90 backdrop-blur rounded-full shadow-lg text-slate-800 font-semibold hover:bg-white transition-all hover:scale-105 active:scale-95"
                  >
                    Back to Original
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
