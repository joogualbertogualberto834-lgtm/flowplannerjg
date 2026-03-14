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
      model: "gemini-3-flash-preview",
      contents: `Você é um especialista em educação médica. Sua tarefa é transformar o texto de um resumo médico, apostila ou questão em um conjunto de palavras cruzadas de alta qualidade.
      
      Instruções:
      1. Extraia os termos mais importantes (Patologias, Diagnósticos, Tratamentos, Sinais Clínicos).
      2. Para cada termo, crie uma dica curta e desafiadora (clue). Prefira o estilo "complete a frase" ou descrições clínicas diretas que induzam ao termo técnico.
      3. Exemplo de estilo: "Para tratamento de febre podemos usar dipirona no primeiro momento e ......" -> Resposta: PARACETAMOL.
      4. Crie também uma 'dica médica' (hint) extremamente curta e sutil (ex: "Droga de 1ª linha", "Sinal patognomônico").
      5. O 'answer' deve ser uma ÚNICA palavra técnica (sem espaços, sem acentos).
      6. O 'clue' deve ser focado em Active Recall.
      
      Texto para processar:
      """
      ${text}
      """
      
      Retorne um array JSON de objetos com 'answer', 'clue' e 'hint'. Gere entre 8 a 12 pares se o texto permitir.`,
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
      model: "gemini-3-flash-preview",
      contents: `Gere 10 dicas de palavras cruzadas sobre o tema médico: ${topic}. 
      Foque em conteúdo de alto rendimento para exames de residência (Revalida, PSU, etc.).
      
      Retorne um array JSON de objetos com as propriedades 'answer', 'clue' e 'hint'.
      O 'answer' deve ser uma única palavra (sem espaços, sem acentos).
      O 'clue' deve ser uma descrição clínica curta ou uma frase do tipo "complete a lacuna" (ex: "O tratamento de primeira linha para X é ...").
      O 'hint' é uma "pérola médica" muito curta ou uma dica sutil.`,
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
  // MOCK PARA TESTE DE CONEXÃO E FLUXO
  console.log("MOCK: Ignorando PDF e retornando questões de teste...");

  // Simulando um pequeno delay de processamento
  await new Promise(resolve => setTimeout(resolve, 1500));

  return [
    {
      question_text: "QUESTÃO MOCK 1: Qual a primeira conduta na suspeita de pancreatite aguda?",
      option_a: "Cirurgia imediata",
      option_b: "Jejum e hidratação vigorosa",
      option_c: "Antibiótico de largo espectro",
      option_d: "Alta hospitalar",
      option_e: "Dieta hipercalórica",
      correct_option: "B",
      specialty: specialty || "Cirurgia",
      subtopic: subtopic || "Pancreatite",
      explanation: "O tratamento básico inicial é suporte com hidratação e repouso glandular (jejum)."
    },
    {
      question_text: "QUESTÃO MOCK 2: Qual o sinal clássico de descompressão dolorosa no ponto de McBurney?",
      option_a: "Sinal de Murphy",
      option_b: "Sinal de Rovsing",
      option_c: "Sinal de Blumberg",
      option_d: "Sinal de Cullen",
      option_e: "Sinal de Grey-Turner",
      correct_option: "C",
      specialty: specialty || "Cirurgia",
      subtopic: subtopic || "Apendicite",
      explanation: "Blumberg é o sinal de peritonite localizada, clássico na apendicite."
    }
  ];
}
