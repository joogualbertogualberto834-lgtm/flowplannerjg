import asyncio
import sys
import time
import json
import traceback
import re
from notebooklm_mcp.api_client import NotebookLMClient
from notebooklm_mcp.auth import load_cached_tokens

async def generate_quiz(topic_title):
    notebook_id = "1d10f388-d7c3-4606-9068-0c804d89fc8e"
    try:
        tokens = load_cached_tokens()
        if not tokens:
            return {"status": "error", "message": "Authentication tokens not found."}
            
        client = NotebookLMClient(
            cookies=tokens.cookies,
            csrf_token=tokens.csrf_token,
            session_id=tokens.session_id
        )
        
        # 1. Get all sources for mapping and validation
        print(f"Debug: Fetching source list for notebook {notebook_id}...")
        notebook_data = client.get_notebook(notebook_id)
        all_source_ids = client._extract_source_ids_from_notebook(notebook_data)
        
        if not all_source_ids:
             return {"status": "error", "message": "No sources found in the notebook."}

        # Build a list of Titles and IDs to help the AI
        sources_list = [] 
        id_to_title = {}
        try:
            # Notebook structure can be complex, extract sources manually
            raw_sources = []
            if isinstance(notebook_data, list) and len(notebook_data) > 0:
                inner = notebook_data[0]
                if isinstance(inner, list) and len(inner) > 0:
                    raw_sources = inner[0]
            
            for s in raw_sources:
                 if isinstance(s, list) and len(s) >= 2:
                     sid = s[0][0] if isinstance(s[0], list) else s[0]
                     stitle = s[1]
                     sources_list.append({"id": sid, "title": stitle})
                     id_to_title[sid] = stitle
        except Exception as e:
            print(f"Debug: Error parsing source titles: {e}")

        # 2. Query AI to find "exclusive" and "most current" material
        # We provide the title mapping to ensure the AI can return IDs
        mapping_text = "\n".join([f"- {s['title']} (ID: {s['id']})" for s in sources_list])
        
        print(f"Debug: Asking NotebookLM for the most current exclusive material for '{topic_title}'...")
        prompt = (
            f"Você é um especialista em medicina. Analise as fontes deste notebook enumeradas abaixo e identifique quais são as "
            f"EXCLUSIVAS e as MAIS ATUAIS (ex: 2025) para o tema '{topic_title}'.\n\n"
            f"FONTES DISPONÍVEIS:\n{mapping_text}\n\n"
            f"IMPORTANTE: Retorne APENAS os UUIDs (IDs) das fontes escolhidas, separados por vírgula. "
            f"Não escreva nada além dos IDs. Se houver material de 2025, priorize-o."
        )
        
        query_result = client.query(notebook_id, prompt)
        answer = query_result.get("answer", "")
        print(f"Debug: AI matched content: {answer}")
        
        # Extract UUIDs from the answer
        matched_ids = re.findall(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', answer)
        
        # Validation: only IDs that belong to the notebook
        final_source_ids = [sid for sid in matched_ids if sid in all_source_ids]
        
        # Fallback 1: If AI mentioned titles instead of IDs, match them
        if not final_source_ids:
            print("Debug: No UUIDs in AI answer. Trying to match titles from AI text...")
            for s in sources_list:
                if s["title"] and str(s["title"]).lower() in answer.lower():
                    final_source_ids.append(s["id"])
        
        # Fallback 2: Simple title matching if all above failed
        if not final_source_ids:
            print("Debug: No specific match found via AI. Falling back to simple title-topic match.")
            for s in sources_list:
                # Basic heuristic: if topic title is in source title
                if s["title"] and topic_title.lower() in str(s["title"]).lower():
                    final_source_ids.append(s["id"])

        if not final_source_ids:
             # Final absolute fallback: if we can't find anything, just use all sources to avoid failing the user
             print("Debug: Final fallback: using all sources.")
             final_source_ids = all_source_ids

        print(f"Debug: Creating quiz with {len(final_source_ids)} sources...")
        result = client.create_quiz(
            notebook_id=notebook_id,
            source_ids=final_source_ids,
            question_count=5, 
            difficulty=2 
        )
        
        if not result or "artifact_id" not in result:
             return {"status": "error", "message": "Falha ao iniciar geração de teste no NotebookLM."}
            
        artifact_id = result["artifact_id"]
        print(f"Debug: Quiz generation started (ID: {artifact_id}). Task: {topic_title}")
        
        # 3. Poll
        max_polls = 40
        for i in range(max_polls):
            time.sleep(10)
            status_result = client.poll_studio_status(notebook_id)
            if not status_result: continue

            for artifact in status_result:
                if artifact.get("artifact_id") == artifact_id:
                    status = artifact.get("status")
                    print(f"Debug: Poll {i+1} - Status: {status}")
                    if status == "completed":
                        url = f"https://notebooklm.google.com/notebook/{notebook_id}/studio/{artifact_id}"
                        return {
                            "status": "success", 
                            "quiz_url": url,
                            "title": topic_title,
                            "source_count": len(final_source_ids)
                        }
                    elif status == "failed":
                        return {"status": "error", "message": "A geração do teste falhou no NotebookLM."}
            
        return {"status": "error", "message": "O tempo de espera para a geração do teste expirou."}
            
    except Exception as e:
        print(f"Debug: Exception in generate_quiz: {e}")
        # traceback.print_exc()
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Topic title required."}))
        sys.exit(1)
    topic = sys.argv[1]
    res = asyncio.run(generate_quiz(topic))
    print(json.dumps(res))
