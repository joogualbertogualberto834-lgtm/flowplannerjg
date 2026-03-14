
// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { pdf_base64, specialty, subtopic } = await req.json()
        const apiKey = Deno.env.get('GEMINI_API_KEY')

        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not set')
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        // Prompt para extração de questões
        const prompt = `
      Você é um motor de extração de questões médicas de alto rendimento.
      Analise o PDF (dados em base64) e extraia todas as questões disponíveis.
      Para cada questão, identifique:
      1. O texto da pergunta.
      2. As opções (A, B, C, D e E se houver).
      3. A opção correta (A, B, C, D ou E).
      4. A especialidade (${specialty || 'Geral'}).
      5. O subtema específico (${subtopic || 'Geral'}).
      6. Uma breve explicação da resposta.

      Retorne APENAS um JSON no seguinte formato:
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
    `

        // Mock/Simulação se o PDF for muito grande ou complexo
        // Em um cenário real, enviaríamos o base64 como parte do prompt multimodal
        // Para simplificar esta primeira versão, vamos focar na estrutura.

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: pdf_base64,
                    mimeType: "application/pdf"
                }
            }
        ])

        const response = await result.response
        const text = response.text()

        // Limpar markdown se houver
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim()
        const data = JSON.parse(jsonStr)

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
