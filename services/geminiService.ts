import { GoogleGenAI, Type } from "@google/genai";

// Helper to convert file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// 1. Scene Suggestion (Text Generation)
export const suggestScenes = async (industry: string, productDescription: string = ''): Promise<any[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `作为一个TikTok资深电商运营，请为${industry}行业的产品（${productDescription || '未指定产品'}）构思9个极具吸引力的TikTok带货场景。
    请返回JSON格式，包含一个数组，每个元素包含 'title' (场景简短名称) 和 'description' (详细的视觉提示词，用于生成图片，包含光影、氛围、背景细节，要求写实风格)。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error suggesting scenes:", error);
    throw error;
  }
};

// 2. Image Generation / Editing (Gemini 2.5 Flash Image)
// imageBase64 is now optional to support Text-to-Image
export const generateEditedImage = async (
  imageBase64: string | null, 
  prompt: string, 
  mimeType: string = 'image/png'
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const parts: any[] = [
      { text: prompt + " 保持产品主体清晰，TikTok高转化率风格，写实摄影，高质量，4k。" }
    ];

    if (imageBase64) {
      parts.unshift({
        inlineData: {
          mimeType: mimeType,
          data: imageBase64
        }
      });
    }

    // Using gemini-2.5-flash-image for image editing/generation capabilities
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: parts
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data in response");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

// 3. Script Analysis (Text Generation)
export const analyzeVideoScript = async (script: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `分析以下TikTok短视频脚本，并给出3条优化建议以提高完播率和转化率。同时，基于这个脚本生成一个适合Veo视频生成模型的英文提示词(Prompt)。
      
      脚本内容:
      ${script}
      
      请按如下格式返回:
      【优化建议】
      1. ...
      2. ...
      3. ...

      【Veo生成提示词】
      (这里放英文Prompt)
      `
    });
    return response.text || "无法分析脚本";
  } catch (e) {
    console.error(e);
    return "分析服务暂时不可用";
  }
};

// 3.1 Video Content Analysis (Multimodal)
export const analyzeUploadedVideo = async (videoBase64: string, mimeType: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: videoBase64
            }
          },
          {
            text: `你是一位TikTok短视频专家。请分析这段样片视频的内容、运镜、节奏和脚本。
            
            请输出以下内容：
            1. 【脚本拆解】：详细描述视频发生的事情，分镜脚本。
            2. 【优化建议】：如果我想基于这个视频拍摄类似的产品视频，有什么建议？
            3. 【Veo生成提示词】：请写一段英文Prompt，用于Veo视频生成模型。这段Prompt需要描述一段类似的视频，但是主角可以被替换为通用的"Product"。确保描述清楚光影、动作（Cinematic lighting, dynamic camera movement, etc.）。
            `
          }
        ]
      }
    });
    return response.text || "无法分析视频";
  } catch (e) {
    console.error(e);
    return "视频分析失败，可能是文件过大或格式不支持";
  }
};

// 4. Video Generation (Veo)
export const generateVeoVideo = async (
  imageBase64: string, 
  prompt: string, 
  aspectRatio: '16:9' | '9:16' = '9:16'
): Promise<string> => {
  // Ensure we have a key selected for Veo
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
     const hasKey = await window.aistudio.hasSelectedApiKey();
     if (!hasKey) {
       await window.aistudio.openSelectKey();
     }
  }

  // Create new instance to ensure key is picked up
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: imageBase64,
        mimeType: 'image/png', // Simplified assumption, in prod convert properly
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
      }
    });

    // Polling
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed to return URI");

    // Construct download link with API key
    return `${videoUri}&key=${process.env.API_KEY}`;
  } catch (error) {
    console.error("Veo generation error:", error);
    throw error;
  }
};