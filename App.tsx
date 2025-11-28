import React, { useState } from 'react';
import { ImageSuite } from './components/ImageSuite';
import { VideoSuite } from './components/VideoSuite';
import { AppMode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.IMAGE_SUITE);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 selection:bg-teal-500 selection:text-white">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-bold text-xl tracking-tight">TikTok Creative Studio</span>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setMode(AppMode.IMAGE_SUITE)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === AppMode.IMAGE_SUITE 
                    ? 'bg-slate-800 text-teal-400 shadow-inner' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                图生图套件 (Gemini 2.5)
              </button>
              <button
                onClick={() => setMode(AppMode.VIDEO_SUITE)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === AppMode.VIDEO_SUITE 
                    ? 'bg-slate-800 text-purple-400 shadow-inner' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                视频二创 (Veo)
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {mode === AppMode.IMAGE_SUITE ? (
            <div className="space-y-2">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">电商图文素材生成</h1>
                <p className="text-slate-400">上传商品主图，一键生成适配TikTok风格的9张高点击率营销图。</p>
              </div>
              <ImageSuite />
            </div>
          ) : (
            <div className="space-y-2">
               <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">AI 视频创意工坊</h1>
                <p className="text-slate-400">基于Veo模型，将静态商品图转化为具有动感的高转化短视频。</p>
              </div>
              <VideoSuite />
            </div>
          )}
        </div>
      </main>
      
      {/* Simple Footer */}
      <footer className="border-t border-slate-800 mt-12 py-8 text-center text-slate-500 text-sm">
        <p>© 2024 TikTok Creative Studio. Powered by Google Gemini & Veo.</p>
      </footer>
    </div>
  );
};

export default App;