import { GoogleGenAI, Type } from "@google/genai";
import { DiseaseRecord, SoilInfo, WeatherInfo, LocationInfo, Language, CropProfitData, PesticideInfo, IrrigationSchedule, GovernmentScheme, AgriculturalLoan } from "../types";

const getAi = () => {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process.env as any).API_KEY || process.env.GEMINI_API_KEY || "";
  return new GoogleGenAI({ apiKey });
};

const getLanguageName = (code: Language): string => {
  const names: Record<Language, string> = {
    en: "English",
    hi: "Hindi (हिंदी)",
    te: "Telugu (తెలుగు)",
    ta: "Tamil (தமிழ்)",
    kn: "Kannada (కన్నడ)",
    ml: "Malayalam (മലയാളం)",
    mr: "Marathi (మరాఠీ)",
    bn: "Bengali (বাংলা)",
    gu: "Gujarati (ગુજરાતી)",
    pa: "Punjabi (ਪੰਜਾਬీ)",
    or: "Odia (ଓଡ଼ిଆ)",
    ur: "Urdu (اردو)"
  };
  return names[code] || "English";
};

export async function detectDisease(base64Image: string, language: Language): Promise<Partial<DiseaseRecord>> {
  const ai = getAi();
  const model = "gemini-3-flash-preview";
  const langName = getLanguageName(language);
  
  const prompt = `Analyze this plant image. If it's a plant, identify the plant name, the disease (if any), the cause, recommended treatment, and prevention tips. 
  Return the response in JSON format with keys: plantName, detectedDisease, cause, recommendedTreatment, preventionTips.
  If no disease is found, set detectedDisease to the word for "Healthy" in ${langName}.
  If the image is not a plant, return an error message in the plantName field.
  
  CRITICAL: You MUST provide all text values (plantName, detectedDisease, cause, recommendedTreatment, preventionTips) in the following language: ${langName}. Do not use English if the language is different.`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1] || base64Image
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          plantName: { type: Type.STRING },
          detectedDisease: { type: Type.STRING },
          cause: { type: Type.STRING },
          recommendedTreatment: { type: Type.STRING },
          preventionTips: { type: Type.STRING }
        },
        required: ["plantName", "detectedDisease", "cause", "recommendedTreatment", "preventionTips"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function getLocationName(lat: number, lng: number, language: Language): Promise<LocationInfo> {
  const ai = getAi();
  const model = "gemini-3-flash-preview";
  const langName = getLanguageName(language);
  const prompt = `Given the coordinates Latitude: ${lat}, Longitude: ${lng}, identify the Village/City, District, and State in India.
  Return the response in JSON format with keys: village, district, state.
  IMPORTANT: Provide the values in the following language: ${langName}.`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          village: { type: Type.STRING },
          district: { type: Type.STRING },
          state: { type: Type.STRING }
        },
        required: ["village", "district", "state"]
      }
    }
  });

  const data = JSON.parse(response.text);
  return { ...data, lat, lng };
}

export async function getSoilInfo(location: LocationInfo, language: Language): Promise<SoilInfo> {
  const ai = getAi();
  const model = "gemini-3-flash-preview";
  const langName = getLanguageName(language);
  const prompt = `Based on the location: ${location.village}, ${location.district}, ${location.state}, India, provide typical soil information for farming.
  Return the response in JSON format with keys: type, n, p, k, moisture, waterAvailability.
  - type: Soil type (e.g., Alluvial, Black, Red, etc.)
  - n, p, k: Percentage values (0-100)
  - moisture: Percentage value (0-100)
  - waterAvailability: "High", "Medium", or "Low"
  IMPORTANT: Provide the text values in the following language: ${langName}.`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          n: { type: Type.NUMBER },
          p: { type: Type.NUMBER },
          k: { type: Type.NUMBER },
          moisture: { type: Type.NUMBER },
          waterAvailability: { type: Type.STRING }
        },
        required: ["type", "n", "p", "k", "moisture", "waterAvailability"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function generateFarmingBackground(): Promise<string> {
  const staticImages = [
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1920",
    "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=1920",
    "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=1920",
    "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=1920"
  ];
  
  return staticImages[Math.floor(Math.random() * staticImages.length)];
}

export async function getCropRecommendations(
  location: LocationInfo,
  soil: SoilInfo,
  weather: WeatherInfo,
  season: string,
  landSize: string,
  language: Language
): Promise<string[]> {
  const ai = getAi();
  const model = "gemini-3-flash-preview";
  const langName = getLanguageName(language);
  
  const prompt = `Based on the following data, recommend the top 5 best crops for a farmer to grow.
  Location: ${location.village}, ${location.district}, ${location.state}
  Soil Type: ${soil.type}
  Nutrients: N:${soil.n}%, P:${soil.p}%, K:${soil.k}%
  Weather: ${weather.temp}°C, Humidity: ${weather.humidity}%, Condition: ${weather.condition}
  Season: ${season}
  Land Size: ${landSize} acres
  
  Return only a JSON array of 5 crop names.
  IMPORTANT: Provide the crop names in the following language: ${langName}.`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  return JSON.parse(response.text);
}

export async function searchVillages(query: string, language: Language): Promise<LocationInfo[]> {
  const ai = getAi();
  const model = "gemini-3-flash-preview";
  const langName = getLanguageName(language);
  const prompt = `Search for villages or farming regions in India matching the query: "${query}". 
  Return a list of up to 5 matching locations.
  Return the response in JSON format as an array of objects with keys: name, village, district, state, lat, lng.
  IMPORTANT: Ensure the latitude (lat) and longitude (lng) are as accurate as possible for the specific village or region. Use real-world geographical data.
  IMPORTANT: Provide the text values in the following language: ${langName}.`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            village: { type: Type.STRING },
            district: { type: Type.STRING },
            state: { type: Type.STRING },
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER }
          },
          required: ["name", "village", "district", "state", "lat", "lng"]
        }
      }
    }
  });

  return JSON.parse(response.text);
}

export async function getProfitAnalysis(language: Language, crops?: string[]): Promise<CropProfitData[]> {
  const ai = getAi();
  const model = "gemini-3-flash-preview";
  const langName = getLanguageName(language);
  
  let prompt = "";
  if (crops && crops.length > 0) {
    prompt = `Provide profit and yield data for the following crops: ${crops.join(", ")}. 
    For each crop, include: cropName, totalCost (in ₹ per acre), expectedYield (in quintals per acre), estimated profit (in ₹ per acre), and season (e.g. Kharif, Rabi, Zaid).
    Return the response in JSON format as an array of objects.
    IMPORTANT: Provide ALL text values (especially cropName and season) in the following language: ${langName}.`;
  } else {
    prompt = `Provide data for the top 12 high-profit crops in India across different seasons (Kharif, Rabi, Zaid). 
    For each crop, include: cropName, totalCost (in ₹ per acre), expectedYield (in quintals per acre), estimated profit (in ₹ per acre), and season (Kharif, Rabi, or Zaid).
    Return the response in JSON format as an array of objects.
    IMPORTANT: Provide ALL text values (especially cropName and season) in the following language: ${langName}.`;
  }

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            cropName: { type: Type.STRING },
            totalCost: { type: Type.NUMBER },
            expectedYield: { type: Type.NUMBER },
            estimatedProfit: { type: Type.NUMBER },
            season: { type: Type.STRING }
          },
          required: ["cropName", "totalCost", "expectedYield", "estimatedProfit", "season"]
        }
      }
    }
  });

  return JSON.parse(response.text);
}

export async function getPesticideRecommendations(crop: string, language: Language): Promise<PesticideInfo> {
  const ai = getAi();
  const model = "gemini-3-flash-preview";
  const langName = getLanguageName(language);
  const prompt = `Provide pesticide recommendations for the crop: "${crop}".
  Include both chemical and organic options with specific usage details.
  Return the response in JSON format with keys: cropName, chemical (array of {name, usage, details}), organic (array of {name, usage, details}).
  IMPORTANT: Provide all text values in the following language: ${langName}.`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          cropName: { type: Type.STRING },
          chemical: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                usage: { type: Type.STRING },
                details: { type: Type.STRING }
              },
              required: ["name", "usage", "details"]
            }
          },
          organic: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                usage: { type: Type.STRING },
                details: { type: Type.STRING }
              },
              required: ["name", "usage", "details"]
            }
          }
        },
        required: ["cropName", "chemical", "organic"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function getWaterManagement(location: LocationInfo, crop: string, language: Language): Promise<IrrigationSchedule> {
  const ai = getAi();
  const model = "gemini-3-flash-preview";
  const langName = getLanguageName(language);
  const prompt = `Based on the location: ${location.village}, ${location.district}, ${location.state} and crop: "${crop}", suggest the best irrigation timing and watering schedule.
  Return the response in JSON format with keys: bestTime, nextWatering, schedule (array of {stage, frequency, details}).
  IMPORTANT: Provide all text values in the following language: ${langName}.`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          bestTime: { type: Type.STRING },
          nextWatering: { type: Type.STRING },
          schedule: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                stage: { type: Type.STRING },
                frequency: { type: Type.STRING },
                details: { type: Type.STRING }
              },
              required: ["stage", "frequency", "details"]
            }
          }
        },
        required: ["bestTime", "nextWatering", "schedule"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function getSeedQuantity(crop: string, acres: number, language: Language): Promise<string> {
  const ai = getAi();
  const model = "gemini-3-flash-preview";
  const langName = getLanguageName(language);
  const prompt = `Calculate the recommended seed quantity for growing "${crop}" on ${acres} acres of land.
  Provide the answer in a short, clear sentence in ${langName}. Include the total quantity in kg.`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
  });

  return response.text || "";
}

export async function translateSchemesAndLoans(
  schemes: GovernmentScheme[],
  loans: AgriculturalLoan[],
  language: Language
): Promise<{ schemes: GovernmentScheme[], loans: AgriculturalLoan[] }> {
  if (language === 'en') return { schemes, loans };

  const ai = getAi();
  const model = "gemini-3-flash-preview";
  const langName = getLanguageName(language);

  const prompt = `Translate the following agricultural schemes and loans data into ${langName}.
  Keep the IDs and links exactly the same. Translate names, descriptions, benefits, eligibility, bank names, and loan types.
  
  Schemes: ${JSON.stringify(schemes)}
  Loans: ${JSON.stringify(loans)}
  
  Return the response in JSON format with two keys: "schemes" and "loans".
  IMPORTANT: Provide ALL translated text values in ${langName}.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            schemes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  benefits: { type: Type.STRING },
                  eligibility: { type: Type.STRING },
                  applicationLink: { type: Type.STRING },
                  category: { type: Type.STRING },
                  location: { type: Type.ARRAY, items: { type: Type.STRING } },
                  farmerType: { type: Type.ARRAY, items: { type: Type.STRING } },
                  cropType: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["id", "name", "description", "benefits", "eligibility", "applicationLink", "category", "location", "farmerType", "cropType"]
              }
            },
            loans: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  bankName: { type: Type.STRING },
                  loanType: { type: Type.STRING },
                  interestRate: { type: Type.STRING },
                  maxAmount: { type: Type.STRING },
                  repaymentPeriod: { type: Type.STRING },
                  eligibility: { type: Type.STRING },
                  location: { type: Type.ARRAY, items: { type: Type.STRING } },
                  farmerType: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["id", "bankName", "loanType", "interestRate", "maxAmount", "repaymentPeriod", "eligibility", "location", "farmerType"]
              }
            }
          },
          required: ["schemes", "loans"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (err) {
    console.error("Translation failed:", err);
    return { schemes, loans };
  }
}
