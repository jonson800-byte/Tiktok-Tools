import React, { useState, useRef } from 'react';
import { Industry, GeneratedImage, SceneSuggestion } from '../types';
import { suggestScenes, generateEditedImage, fileToGenerativePart } from '../services/geminiService';

type GenMode = 'img2img' | 'txt2img';

export const ImageSuite: React.FC = () => {
  const [genMode, setGenMode] = useState<GenMode>('img2img');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [industry, setIndustry] = useState<Industry>(Industry.BEAUTY);
  const [customIndustry, setCustomIndustry] = useState('');
  const [productDescription, setProductDescription] = useState('');

  const [scenes, setScenes] = useState<SceneSuggestion[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const base64 = await fileToGenerativePart(file);
      setPreviewUrl(`data:${file.type};base64,${base64}`);
      setScenes([]);
      setGeneratedImages([]);
    }
  };

  const handleGetSuggestions = async () => {
    // Validation: Need file for img2img, need description for txt2img
    if (genMode === 'img2img' && !selectedFile) return;
    if (genMode === 'txt2img' && !productDescription) return;

    setIsSuggesting(true);
    try {
      const finalIndustry = industry === Industry.CUSTOM ? customIndustry : industry;
      const suggestions = await suggestScenes(finalIndustry, productDescription);
      setScenes(suggestions);
    } catch (error) {
      alert("场景构思失败，请重试");
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (scenes.length === 0) return;
    
    setIsGeneratingBatch(true);

    let base64: string | null = null;
    let mimeType = 'image/png';

    if (genMode === 'img2img' && selectedFile) {
      base64 = await fileToGenerativePart(selectedFile);
      mimeType = selectedFile.type;
    }

    const initialImages = scenes.map((scene, index) => ({
      id: `gen-${index}`,
      url: '',
      prompt: scene.description,
      isLoading: true,
    }));
    setGeneratedImages(initialImages);

    const newImages = [...initialImages];
    
    for (let i = 0; i < scenes.length; i++) {
      try {
        // Construct full prompt: if Txt2Img, we need to describe the product in the prompt explicitly
        let fullPrompt = scenes[i].description;
        if (genMode === 'txt2img') {
          fullPrompt = `Product: ${productDescription}. Scene: ${scenes[i].description}`;
        }

        const url = await generateEditedImage(base64, fullPrompt, mimeType);
        newImages[i] = { ...newImages[i], url, isLoading: false };
        setGeneratedImages([...newImages]); // Trigger re-render per image
      } catch (err) {
        newImages[i] = { ...newImages[i], isLoading: false }; 
        setGeneratedImages([...newImages]);
      }
    }
    setIsGeneratingBatch(false);
  };

  const handleEditImage = async (id: string) => {
    const targetImage = generatedImages.find(img => img.id === id);
    if (!targetImage || !editPrompt) return;

    setEditingId(id);
    try {
       // Re-use original image as base if in img2img mode
       let base64: string | null = null;
       let mimeType = 'image/png';

       if (genMode === 'img2img' && selectedFile) {
         base64 = await fileToGenerativePart(selectedFile);
         mimeType = selectedFile.type;
       } 
       // NOTE: If in txt2img mode, we could technically re-use the *generated* image as input for editing,
       // but for simplicity in this demo, we might just generate a new variation from text or use the original flow.
       // Here, if it's txt2img, we will treat it as a new generation with the refined prompt unless we implemented "Image from URL".
       // For a robust "Edit" in txt2img, we'd ideally pass the generated image back. 
       // However, to keep it simple and consistent with `generateEditedImage` taking a base64 string:
       // We will generate a new image with the new prompt if no base file exists.

       const fullPrompt = genMode === 'txt2img' ? `Product: ${productDescription}. ${editPrompt}` : editPrompt;
       
       const url = await generateEditedImage(base64, fullPrompt, mimeType);
       
       setGeneratedImages(prev => prev.map(img => 
         img.id === id ? { ...img, url, prompt: editPrompt } : img
       ));
       setEditPrompt('');
    } catch (e) {
      alert("修改失败");
    } finally {
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm">
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
          TikTok 套图生成器
        </h2>

        {/* Mode Toggle */}
        <div className="flex bg-slate-900/50 p-1 rounded-lg w-fit mb-6 border border-slate-700">
          <button
            onClick={() => { setGenMode('img2img'); setScenes([]); setGeneratedImages([]); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              genMode === 'img2img' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            图生图 (上传商品)
          </button>
          <button
            onClick={() => { setGenMode('txt2img'); setScenes([]); setGeneratedImages([]); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              genMode === 'txt2img' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            文生图 (创意生成)
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Input Area */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-400">
              {genMode === 'img2img' ? '1. 上传商品主图' : '1. 描述你的商品/画面'}
            </label>
            
            {genMode === 'img2img' ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-600 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 transition-colors bg-slate-800/50 min-h-[240px] relative group"
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Product" className="max-h-52 object-contain rounded-lg shadow-lg" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                      <span className="text-white font-medium">点击更换图片</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <svg className="w-12 h-12 text-slate-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="text-slate-400">点击上传图片</span>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>
            ) : (
              <textarea 
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="例如：一瓶粉色的保湿面霜，放在白色的沙滩上，阳光明媚，周围有贝壳和海星装饰..."
                className="w-full h-[240px] bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-teal-500 outline-none resize-none"
              />
            )}
          </div>

          {/* Right: Configuration Area */}
          <div className="space-y-6 flex flex-col justify-center">
            
            {/* Product Description Input for Img2Img (Optional but recommended) */}
            {genMode === 'img2img' && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">补充商品描述 (可选)</label>
                <input
                  type="text"
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="例如：红色运动鞋，透气网面"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-teal-500 outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">添加描述有助于生成更精准的场景。</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">2. 选择投放行业</label>
              <select 
                value={industry}
                onChange={(e) => setIndustry(e.target.value as Industry)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-teal-500 outline-none"
              >
                {Object.values(Industry).map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            {/* Custom Industry Input */}
            {industry === Industry.CUSTOM && (
               <div className="animate-in fade-in slide-in-from-top-2">
                <input 
                  type="text"
                  value={customIndustry}
                  onChange={(e) => setCustomIndustry(e.target.value)}
                  placeholder="请输入行业名称 (如: 宠物用品)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-teal-500 outline-none"
                />
               </div>
            )}

            <button
              onClick={handleGetSuggestions}
              disabled={(genMode === 'img2img' && !selectedFile) || (genMode === 'txt2img' && !productDescription) || isSuggesting}
              className={`w-full py-3 rounded-lg font-semibold transition-all ${
                (genMode === 'img2img' && !selectedFile) || (genMode === 'txt2img' && !productDescription)
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white shadow-lg shadow-teal-500/20'
              }`}
            >
              {isSuggesting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                  智能分析场景中...
                </span>
              ) : '智能构思场景'}
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Scenes & Generation */}
      {scenes.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">推荐场景方案 ({scenes.length})</h3>
            <button
              onClick={handleBatchGenerate}
              disabled={isGeneratingBatch}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-medium transition-colors disabled:opacity-50"
            >
              {isGeneratingBatch ? '生成中...' : '一键生成全套素材'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scenes.map((scene, idx) => (
              <div key={idx} className="bg-slate-800/30 p-4 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
                 <h4 className="font-medium text-teal-300 mb-2">{scene.title}</h4>
                 <p className="text-sm text-slate-400 line-clamp-3">{scene.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Grid */}
      {generatedImages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {generatedImages.map((img) => (
            <div key={img.id} className="group relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
              <div className="aspect-[3/4] relative bg-slate-800 w-full">
                {img.isLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 space-y-3">
                    <svg className="animate-spin w-8 h-8 text-teal-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                    <span className="text-sm animate-pulse">Gemini 正在绘图...</span>
                  </div>
                ) : img.url ? (
                   <img src={img.url} alt="Generated" className="w-full h-full object-cover" />
                ) : (
                   <div className="absolute inset-0 flex items-center justify-center text-red-400">生成失败</div>
                )}
                
                {/* Overlay Controls */}
                {!img.isLoading && img.url && (
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                    <p className="text-xs text-slate-300 mb-3 line-clamp-2">{img.prompt}</p>
                    <div className="space-y-2">
                       <input 
                         type="text" 
                         placeholder="输入修改指令 (如: 添加复古滤镜)"
                         className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                         value={editPrompt}
                         onChange={(e) => setEditPrompt(e.target.value)}
                         onKeyDown={(e) => {
                           if(e.key === 'Enter') handleEditImage(img.id);
                         }}
                       />
                       <button 
                         onClick={() => handleEditImage(img.id)}
                         disabled={editingId === img.id}
                         className="w-full bg-teal-600 hover:bg-teal-500 text-white text-xs py-1.5 rounded transition-colors"
                       >
                         {editingId === img.id ? '修正中...' : '提交修正'}
                       </button>
                       <a 
                         href={img.url} 
                         download={`tiktok_ad_${img.id}.png`}
                         className="block w-full bg-slate-700 hover:bg-slate-600 text-white text-xs py-1.5 rounded text-center transition-colors"
                       >
                         下载图片
                       </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};