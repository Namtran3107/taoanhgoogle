import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { AppMode, AspectRatio } from "../types";

const MODEL_NAME = 'gemini-2.5-flash-image';

// Sửa cách lấy API key - tương thích với Vercel
const getApiKey = () => {
  // Vercel sẽ inject env vars vào process.env
  return import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const processImage = async (
  mode: AppMode,
  modelImage: File,
  productImages: File[],
  aspectRatio: AspectRatio,
  maskImage?: string,
  poseInstruction?: string
): Promise<string> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured. Please add it in Vercel Environment Variables.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const parts: Part[] = [];
  
  // Add model image
  const modelBase64 = await fileToBase64(modelImage);
  parts.push({
    inlineData: {
      data: modelBase64,
      mimeType: modelImage.type
    }
  });

  // Task-specific logic
  let prompt = "";
  
  switch (mode) {
    case AppMode.TRY_ON:
      prompt = `Virtually dress the person in the first image (the model) with the products shown in the subsequent images. 
      IMPORTANT: 
      1. Keep the model's identity, face, hair, and background identical.
      2. Naturally fit the clothing to the person's body anatomy.
      3. Create realistic shadows, highlights, and fabric folds.
      4. If multiple products are provided (e.g., top and bottom), layer them correctly.
      Output the final high-quality fashion lookbook image.`;
      
      for (const prod of productImages) {
        const prodBase64 = await fileToBase64(prod);
        parts.push({
          inlineData: {
            data: prodBase64,
            mimeType: prod.type
          }
        });
      }
      break;

    case AppMode.POSE_CHANGE:
      prompt = `Change the model's body pose to "${poseInstruction || 'a natural fashion stance'}". 
      KEEP EVERYTHING ELSE EXACTLY THE SAME: the model's face, hair, current clothing, lighting, and background. 
      Ensure the new pose looks anatomically correct and professional.`;
      break;

    case AppMode.OBJECT_REMOVAL:
      prompt = `Remove the object highlighted in the provided mask or specified area. Inpaint the background realistically, matching the texture, lighting, and perspective of the surrounding environment.`;
      if (maskImage) {
         parts.push({
           inlineData: {
             data: maskImage.split(',')[1],
             mimeType: 'image/png'
           }
         });
      }
      break;

    case AppMode.REMOVE_BG:
      prompt = `Remove the background from this image completely. Keep only the main subject (person or product) with clean, sharp edges. Output the result on a pure white or transparent-equivalent background. Ensure hair and clothing edges are handled with high precision.`;
      break;
  }

  parts.push({ text: prompt });

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any
      }
    }
  });

  if (!response.candidates?.[0]?.content?.parts) {
    throw new Error("No image generated from API");
  }

  // Find the image part in the response
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("Could not find image in API response");
};
