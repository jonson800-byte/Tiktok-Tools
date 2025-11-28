import React, { useState, useRef } from 'react';
import { analyzeVideoScript, analyzeUploadedVideo, generateVeoVideo, fileToGenerativePart } from '../services/geminiService';

export const VideoSuite: React.FC = () => {
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  
  const [sampleVideoFile, setSampleVideoFile] = useState<File | null>(null);
  const [sampleVideoPreview, setSampleVideoPreview] = useState<string | null>(null);

  const [scriptInput, setScriptInput] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [veoPrompt, setVeoPrompt] = useState('');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [progressStatus, setProgressStatus] = useState('');

  const productInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleProductFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProductFile(file);
      const base64 = await fileToGenerativePart(file);
      setProductPreview(`data:${file.type};base64,${base64}`);
    }
  };

  const handleSampleVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSampleVideoFile(file);
      // For video preview, Object URL is more efficient than base64
      setSampleVideoPreview(URL.createObjectURL(file));
      // Reset previous analysis
      setAnalysisResult('');
      setVeoPrompt('');
    }
  };

  const handleAnalyze = async () => {
    if (!scriptInput.trim() && !sampleVideoFile) {
       alert("请输入脚本或上传视频样片");
       return;
    }

    setIsAnalyzing(true);
    setAnalysisResult('');
    
    try {
      let result = '';
      if (sampleVideoFile) {
         // Multimodal Analysis
         const base64Video = await fileToGenerativePart(sampleVideoFile);
         result = await analyzeUploadedVideo(base64Video, sampleVideoFile.type);
      } else {
         // Text Analysis
         result = await analyzeVideoScript(scriptInput);
      }

      setAnalysisResult(result);
      
      // Attempt to extract the English prompt part (Simple heuristic)
      const promptMatch = result.match(/【Veo生成提示词】\s*([\s\S]*)/);
      if (promptMatch && promptMatch[1]) {
        setVeoPrompt(promptMatch[1].trim());
      }
    } catch (error) {
      setAnalysisResult("分析出错，请重试");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!productFile || !veoPrompt) {
      alert("请先上传主图并填写生成提示词");
      return;
    }

    setIsGeneratingVideo(true);
    setProgressStatus('检查 API Key 权限...');
    setGeneratedVideoUrl(null);

    try {
      const base64 = await fileToGenerativePart(productFile);
      setProgressStatus('Veo 正在渲染视频 (约需 1-2 分钟)...');
      
      const videoUrl = await generateVeoVideo(base64, veoPrompt, '9:16');
      setGeneratedVideoUrl(videoUrl);
      setProgressStatus('生成完成！');
    } catch (error) {
      console.error(error);
      setProgressStatus('生成失败: ' + (error instanceof Error ? error.message : "未知错误"));
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in pb-20">
      
      {/* Left Column: Input & Script */}
      <div className="space-y-6">
        
        {/* Step 1: Product Image */}
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="bg-pink-500 w-2 h-2 rounded-full"></span>
            1. 上传商品主图 (必填)
          </h3>
          <div 
            onClick={() => productInputRef.current?.click()}
            className="border-2 border-dashed border-slate-600 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-pink-500 transition-colors bg-slate-900/50 h-48 relative overflow-hidden group"
          >
             {productPreview ? (
                <>
                  <img src={productPreview} alt="Product" className="h-full object-contain rounded z-10" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                     <span className="text-white text-sm">点击更换</span>
                  </div>
                </>
              ) : (
                <div className="text-center text-slate-400">
                  <svg className="w-8 h-8 mx-auto mb-2 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p>点击上传主图</p>
                  <p className="text-xs mt-2 text-slate-500">将以此图为基准生成视频</p>
                </div>
              )}
             <input type="file" ref={productInputRef} onChange={handleProductFile} className="hidden" accept="image/*" />
          </div>
        </div>

        {/* Step 2: Analysis Source (Video OR Script) */}
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
           <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="bg-blue-500 w-2 h-2 rounded-full"></span>
            2. 创意分析 (上传样片或输入脚本)
          </h3>
          
          {/* Sample Video Upload */}
          <div className="mb-4">
             <label className="block text-sm text-slate-400 mb-2">上传样片 (可选 - 将分析视频内容和运镜)</label>
             <div className="flex gap-4 items-start">
               <div 
                  onClick={() => videoInputRef.current?.click()}
                  className="w-32 h-32 flex-shrink-0 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors bg-slate-900/50"
               >
                  {sampleVideoPreview ? (
                    <video src={sampleVideoPreview} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <div className="text-center text-slate-400">
                      <svg className="w-6 h-6 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      <span className="text-xs">上传样片</span>
                    </div>
                  )}
                  <input type="file" ref={videoInputRef} onChange={handleSampleVideoFile} className="hidden" accept="video/*" />
               </div>
               
               <div className="flex-1">
                 <p className="text-xs text-slate-500 mb-2">或者直接输入脚本/创意描述：</p>
                 <textarea 
                   value={scriptInput}
                   onChange={(e) => setScriptInput(e.target.value)}
                   placeholder="如果未上传样片，请在此描述你想生成的视频内容..."
                   className="w-full h-20 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                   disabled={!!sampleVideoFile} 
                 />
                 {sampleVideoFile && <p className="text-xs text-blue-400 mt-1">* 已上传样片，将优先分析样片内容</p>}
               </div>
             </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || (!scriptInput && !sampleVideoFile)}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-medium transition-colors"
          >
            {isAnalyzing ? 'Gemini 正在分析内容...' : (sampleVideoFile ? '分析样片并提取 Prompt' : '分析脚本并提取 Prompt')}
          </button>

          {analysisResult && (
            <div className="mt-4 p-4 bg-slate-900 rounded-lg text-sm text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap border border-slate-700">
              {analysisResult}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Generation Control & Preview */}
      <div className="space-y-6">
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 h-full flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="bg-purple-500 w-2 h-2 rounded-full"></span>
            3. Veo 视频生成
          </h3>
          
          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-2">生成提示词 (Prompt)</label>
            <textarea 
              value={veoPrompt}
              onChange={(e) => setVeoPrompt(e.target.value)}
              className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none text-sm"
              placeholder="Analysis will appear here..."
            />
            <p className="text-xs text-slate-500 mt-2">提示词将结合你的主图，驱动 Veo 生成视频。</p>
          </div>

          <div className="flex-grow flex flex-col items-center justify-center bg-black/40 rounded-xl min-h-[300px] border border-slate-700 relative overflow-hidden">
             {isGeneratingVideo ? (
               <div className="text-center p-8">
                 <div className="relative w-20 h-20 mx-auto mb-4">
                   <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin"></div>
                 </div>
                 <p className="text-purple-300 font-medium animate-pulse">{progressStatus}</p>
                 <p className="text-slate-500 text-xs mt-2">Veo 模型正在逐帧渲染，请勿关闭页面</p>
               </div>
             ) : generatedVideoUrl ? (
               <div className="w-full h-full flex flex-col">
                  <video 
                    src={generatedVideoUrl} 
                    controls 
                    autoPlay 
                    loop 
                    className="w-full h-full object-contain bg-black"
                  />
                  <a 
                    href={generatedVideoUrl}
                    download="generated_video.mp4"
                    className="absolute bottom-4 right-4 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-full text-sm shadow-lg backdrop-blur-md"
                  >
                    下载视频
                  </a>
               </div>
             ) : (
               <div className="text-slate-500 flex flex-col items-center">
                 <svg className="w-16 h-16 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                 <span>视频生成预览</span>
               </div>
             )}
          </div>

          <button
            onClick={handleGenerateVideo}
            disabled={isGeneratingVideo || !veoPrompt}
            className={`w-full mt-6 py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
              isGeneratingVideo || !veoPrompt
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-500/30'
            }`}
          >
            {isGeneratingVideo ? '生成中...' : '开始生成 (Veo)'}
          </button>
        </div>
      </div>
    </div>
  );
};