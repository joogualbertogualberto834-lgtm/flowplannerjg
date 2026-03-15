import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "" });

export async function processQuestions(text: string): Promise<{ answer: string; clue: string; hint?: string }[]> {
  if (!text.trim()) return [];

  if (!(ai as any).apiKey) {
    alert("Usando dados de demonstração porque a chave API do Gemini não está configurada no .env.");
    return [
      { answer: "SOP", clue: "Síndrome com oligo-ovulação e hiperandrogenismo", hint: "Critérios de Rotterdam" },
      { answer: "METFORMINA", clue: "Medicamento de primeira linha para DM2", hint: "Biguanida" },
      { answer: "APENDICITE", clue: "Causa comum de abdome agudo cirúrgico", hint: "Sinal de Blumberg" },
      { answer: "ASMA", clue: "Doença inflamatória crônica das vias aéreas", hint: "Sibilos" },
      { answer: "PENICILINA", clue: "Tratamento de escolha para sífilis", hint: "Fleming" },
      { answer: "HIPERTENSAO", clue: "Fator de risco para AVC e IAM", hint: "Doença silenciosa" },
      { answer: "ANEMIA", clue: "Condição com redução de hemoglobina", hint: "Palidez" },
      { answer: "BRONQUIOLITE", clue: "Infecção viral de vias aéreas em lactentes", hint: "VSR" },
      { answer: "GLAUCOMA", clue: "Neuropatia óptica com escavação do disco", hint: "PIO elevada" },
      { answer: "ENDOMETRIOSE", clue: "Presença de tecido endometrial fora do útero", hint: "Dismenorreia" }
    ];
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Você é um especialista em educação médica criando um jogo de palavras cruzadas.
      
      REGRAS OBRIGATÓRIAS para o campo 'answer':
      - DEVE ser uma única palavra SEM espaços (ex: METFORMINA, PENICILINA, HEPATITE)
      - PROIBIDO usar palavras compostas ou frases (ex: NÃO use "SINDROME METABOLICA", use "METABOLICA")
      - Máximo de 12 letras
      - Sem acentos, sem hífens, apenas letras A-Z
      - Se um termo for composto, escolha apenas a palavra mais importante
      
      Para cada termo, crie:
      1. Uma dica (clue) curta no estilo "complete a frase" ou descrição clínica direta
      2. Uma pérola médica (hint) muito curta (ex: "Droga de 1ª linha", "Sinal patognomônico")
      
      Texto para processar:
      """
      ${text}
      """
      
      Retorne um array JSON com 8 a 12 objetos {'answer', 'clue', 'hint'}. O 'answer' deve seguir TODAS as regras acima.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              answer: { type: Type.STRING },
              clue: { type: Type.STRING },
              hint: { type: Type.STRING }
            },
            required: ["answer", "clue", "hint"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error processing questions:", error);
    return parseManualFormat(text);
  }
}

export function parseManualFormat(text: string): { answer: string; clue: string; hint?: string }[] {
  const lines = text.split('\n');
  const results: { answer: string; clue: string; hint?: string }[] = [];

  for (const line of lines) {
    const match = line.match(/\[(.*?)\](.*)/);
    if (match) {
      results.push({
        answer: match[1].trim().toUpperCase().replace(/[^A-Z]/g, ''),
        clue: match[2].trim()
      });
    }
  }
  return results;
}

export async function generateRandomCrossword(topic: string): Promise<{ answer: string; clue: string; hint?: string }[]> {
  if (!(ai as any).apiKey) {
    alert("Usando dados de demonstração porque a chave API do Gemini não está configurada no .env.");
    return [
      { answer: "SOP", clue: "Síndrome com oligo-ovulação e hiperandrogenismo", hint: "Critérios de Rotterdam" },
      { answer: "METFORMINA", clue: "Medicamento de primeira linha para DM2", hint: "Biguanida" },
      { answer: "APENDICITE", clue: "Causa comum de abdome agudo cirúrgico", hint: "Sinal de Blumberg" },
      { answer: "ASMA", clue: "Doença inflamatória crônica das vias aéreas", hint: "Sibilos" },
      { answer: "PENICILINA", clue: "Tratamento de escolha para sífilis", hint: "Fleming" },
      { answer: "HIPERTENSAO", clue: "Fator de risco para AVC e IAM", hint: "Doença silenciosa" },
      { answer: "ANEMIA", clue: "Condição com redução de hemoglobina", hint: "Palidez" },
      { answer: "BRONQUIOLITE", clue: "Infecção viral de vias aéreas em lactentes", hint: "VSR" },
      { answer: "GLAUCOMA", clue: "Neuropatia óptica com escavação do disco", hint: "PIO elevada" },
      { answer: "ENDOMETRIOSE", clue: "Presença de tecido endometrial fora do útero", hint: "Dismenorreia" }
    ];
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Crie um jogo de palavras cruzadas médicas sobre o tema: ${topic}.
      Foque em conteúdo de alto rendimento para Revalida, PSU e provas de residência.
      
      REGRAS OBRIGATÓRIAS para o campo 'answer':
      - Uma ÚNICA palavra, SEM espaços (ex: METFORMINA, PENICILINA, HEPATITE, APENDICITE)
      - PROIBIDO palavras compostas (NÃO use "SINDROME X", use apenas "METFORMINA")
      - Máximo de 12 letras
      - Sem acentos, sem hífens, apenas letras A-Z
      - Se um conceito for composto, escolha a palavra técnica mais específica
      
      O 'clue' deve ser do tipo: "O tratamento de 1ª linha para X é ..." ou uma descrição clínica curta.
      O 'hint' é uma pérola médica muito curta (ex: "Droga de 1ª linha", "Critério diagnóstico").
      
      Gere 10 pares no formato JSON [{answer, clue, hint}]. O 'answer' DEVE seguir todas as regras acima.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              answer: { type: Type.STRING },
              clue: { type: Type.STRING },
              hint: { type: Type.STRING }
            },
            required: ["answer", "clue", "hint"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error generating random crossword:", error);
    return [];
  }
}

export async function extractQuestionsFromPDF(pdfBase64: string, specialty: string, subtopic: string): Promise<any[]> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY || (import.meta as any).env?.VITE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Chave do Gemini não encontrada no .env (VITE_GEMINI_API_KEY).");
  }

  try {
    const prompt = `
      Você é um motor de extração de questões médicas.
      Analise o PDF e extraia as questões de múltipla escolha.
      Especialidade: ${specialty}
      Subtema: ${subtopic}

      Retorne APENAS um JSON:
      {
        "questions": [
          {
            "question_text": "...",
            "option_a": "...",
            "option_b": "...",
            "option_c": "...",
            "option_d": "...",
            "option_e": "...",
            "correct_option": "A",
            "specialty": "...",
            "subtopic": "...",
            "explanation": "..."
          }
        ]
      }
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: pdfBase64,
                mimeType: "application/pdf"
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const data = JSON.parse(result.text || "{}");
    return data.questions || [];
  } catch (error: any) {
    console.error("Erro na extração via SDK:", error);
    throw new Error(error.message || "Erro ao processar PDF com a IA.");
  }
}

export async function processRawTextQuestions(text: string): Promise<any[]> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY || (import.meta as any).env?.VITE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Chave do Gemini não encontrada no .env (VITE_GEMINI_API_KEY).");
  }

  console.log(`[processRawTextQuestions] Sending text to Gemini (length: ${text.length})`);
  // console.log(`[processRawTextQuestions] Raw text:`, text); // Para debug se necessário

  try {
    const prompt = `
      Você é um motor de parsing de exames médicos de alto desempenho. Sua tarefa é converter texto bruto de qualquer prova de residência médica em um JSON estruturado.
      
      REGRAS:
      1. Identifique o enunciado, as alternativas (A, B, C, D ou E), o gabarito correto e o tema clínico (ex: Infectologia, Pediatria, etc).
      2. Se a instituição não for mencionada, classifique apenas pelo tema.
      3. O retorno deve ser EXCLUSIVAMENTE um array de objetos JSON dentro de um campo "questions".
      4. Seja resiliente a quebras de linha e caracteres especiais vindos de cópia de PDF.
      
      PROMPT DE ENTRADA:
      """
      ${text}
      """

      Retorne APENAS o JSON no formato:
      {
        "questions": [
          {
            "question_text": "...",
            "option_a": "...",
            "option_b": "...",
            "option_c": "...",
            "option_d": "...",
            "option_e": "...",
            "correct_option": "A",
            "specialty": "...",
            "subtopic": "...",
            "explanation": "..."
          }
        ]
      }
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const data = JSON.parse(result.text || "{}");
    console.log(`[processRawTextQuestions] Successfully parsed ${data.questions?.length || 0} questions.`);
    return data.questions || [];
  } catch (error: any) {
    console.error("Erro no processamento de texto via SDK:", error);
    throw new Error(error.message || "Erro ao processar o texto com a IA.");
  }
}
