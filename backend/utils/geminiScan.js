import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
});

const RECEIPT_SCAN_PROMPT = `
You are an expert document scanner. Analyze the uploaded file (which is a receipt or proof of payment/upload) and extract all relevant information.

Return a JSON object with the following structure:
{
  "documentType": "receipt" | "invoice" | "payment_proof" | "other",
  "amount": "extracted amount with currency if visible",
  "date": "extracted date if visible (ISO format if possible)",
  "merchant": "merchant/payee name if visible",
  "paymentMethod": "cash" | "card" | "bank_transfer" | "mobile_money" | "crypto" | "unknown",
  "transactionId": "transaction reference number if visible",
  "accountNumber": "masked account number if visible",
  "phoneNumber": "phone number if visible",
  "items": "array of line items if this is an itemized receipt",
  "total": "total amount if visible",
  "currency": "currency code if visible",
  "confidence": "confidence score 0-1 for the extracted data",
  "rawText": "full extracted text from the image"
}

Only return valid JSON. Do not wrap in markdown code blocks.
`;

const PROOF_SCAN_PROMPT = `
You are an expert document scanner. Analyze the uploaded file (which is a proof of upload or user verification document) and extract all relevant information.

Return a JSON object with the following structure:
{
  "documentType": "id" | "address_proof" | "business_proof" | "other",
  "fullName": "full name as shown on the document if visible",
  "dob": "date of birth if visible (ISO format if possible)",
  "address": "full address if visible",
  "documentNumber": "ID/document number if visible",
  "issueDate": "issue date if visible (ISO format if possible)",
  "expiryDate": "expiry date if visible (ISO format if possible)",
  "issuingAuthority": "issuing authority if visible",
  "documentTypeValue": "type of ID (passport, driver_license, etc.) if visible",
  "confidence": "confidence score 0-1 for the extracted data",
  "rawText": "full extracted text from the document"
}

Only return valid JSON. Do not wrap in markdown code blocks.
`;

export const scanImage = async (imageUrl, documentType = "receipt") => {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    throw new Error("Gemini API key not configured");
  }

  const prompt = documentType === "receipt" ? RECEIPT_SCAN_PROMPT : PROOF_SCAN_PROMPT;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            fileData: {
              mimeType: "image/jpeg",
              fileUri: imageUrl,
            },
          },
        ],
      },
    ],
  });

  const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  try {
    const parsed = JSON.parse(text);
    return parsed;
  } catch {
    return {
      rawText: text,
      confidence: 0,
      parseError: true,
      documentType: documentType === "receipt" ? "receipt" : "proof",
    };
  }
};

export const scanImageAsBase64 = async (base64Image, mimeType, documentType = "receipt") => {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    throw new Error("Gemini API key not configured");
  }

  const prompt = documentType === "receipt" ? RECEIPT_SCAN_PROMPT : PROOF_SCAN_PROMPT;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
        ],
      },
    ],
  });

  const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  try {
    const parsed = JSON.parse(text);
    return parsed;
  } catch {
    return {
      rawText: text,
      confidence: 0,
      parseError: true,
      documentType: documentType === "receipt" ? "receipt" : "proof",
    };
  }
};

export const scanDocument = async (input, documentType = "receipt") => {
  if (typeof input === "string" && input.startsWith("http")) {
    return scanImage(input, documentType);
  }

  if (typeof input === "string" && input.startsWith("data:")) {
    const match = input.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    if (match) {
      return scanImageAsBase64(match[2], match[1], documentType);
    }
  }

  throw new Error("Invalid input: must be a URL or base64 data URI");
};
