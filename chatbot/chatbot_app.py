import os
import json
from typing import List, Dict
from flask import Response, stream_with_context

import fitz  # PyMuPDF
import pdfplumber
from flask import Flask, request, jsonify, abort
from flask_cors import CORS
from werkzeug.exceptions import HTTPException, RequestEntityTooLarge
from sqlalchemy import create_engine, Column, Integer, Text
from sqlalchemy.orm import declarative_base, sessionmaker

from ai21 import AI21Client
from ai21.models.chat import ChatMessage

# ---------------------------
# Config (direct key)
# ---------------------------
AI21_API_KEY = "f07c26e6-195a-482d-86d2-3bfba5a3e8df".strip()  # ensure no trailing spaces/newlines
if not AI21_API_KEY:
    raise RuntimeError("AI21_API_KEY not set")
client = AI21Client(api_key=AI21_API_KEY)

MIN_TEXT_LEN = 200
MAX_CONTEXT_CHARS = 8000
PRIMARY_MODEL = "jamba-large"

# ---------------------------
# Flask + CORS
# ---------------------------
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024 * 1024
CORS(app)

# ---------------------------
# Error handlers
# ---------------------------
@app.errorhandler(RequestEntityTooLarge)
def handle_413(e):
    return jsonify({"error": "PDF too large. Max 64MB.", "status": 413}), 413

@app.errorhandler(HTTPException)
def handle_http_exception(e: HTTPException):
    return jsonify({"error": e.description, "status": e.code}), e.code

@app.errorhandler(Exception)
def handle_exception(e: Exception):
    return jsonify({"error": f"{type(e).__name__}: {str(e)}", "status": 500}), 500

# ---------------------------
# SQLite
# ---------------------------
Base = declarative_base()
engine = create_engine("sqlite:///chat_history.db", future=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, future=True)

class ChatHistory(Base):
    __tablename__ = "chat_history"
    id = Column(Integer, primary_key=True, index=True)
    user_query = Column(Text)
    bot_response = Column(Text)  # store raw model text

Base.metadata.create_all(bind=engine)

# ---------------------------
# PDF extraction
# ---------------------------
def extract_text_pymupdf(pdf_path: str) -> str:
    doc = fitz.open(pdf_path)
    try:
        parts = [(page.get_text("text") or "") for page in doc]
    finally:
        doc.close()
    return "\n".join([p for p in parts if p])

def extract_text_pdfplumber(pdf_path: str) -> str:
    parts: List[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            txt = page.extract_text()
            if txt:
                parts.append(txt)
    return "\n".join(parts)

def extract_text_from_pdf(pdf_path: str) -> str:
    t1 = extract_text_pymupdf(pdf_path)
    if len(t1) >= MIN_TEXT_LEN:
        return t1
    t2 = extract_text_pdfplumber(pdf_path)
    return t2 if len(t2) > len(t1) else t1

# ---------------------------
# Helpers
# ---------------------------
def build_context(pdf_text: str) -> str:
    if len(pdf_text) <= MAX_CONTEXT_CHARS:
        return pdf_text
    half = MAX_CONTEXT_CHARS // 2
    head = pdf_text[:half]
    tail = pdf_text[-half:]
    return head + "\n...\n" + tail

def extract_choice_content(resp) -> str:
    content = ""
    try:
        if getattr(resp, "choices", None) and isinstance(resp.choices, list) and resp.choices:
            first = resp.choices[0]
            if getattr(first, "message", None) and getattr(first.message, "content", None):
                content = (first.message.content or "").strip()
            elif getattr(first, "text", None):
                content = (first.text or "").strip()
            elif getattr(first, "delta", None) and getattr(first.delta, "content", None):
                content = (first.delta.content or "").strip()
    except Exception:
        content = ""
    return content

def try_load_json(s: str):
    # Try as-is
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        pass
    # Handle `````` or ``````
    s2 = s.strip()
    if s2.startswith("```"):
        s2 = s2.strip("`").strip()
        if s2.lower().startswith("json"):
            s2 = s2[4:].lstrip()
        start = s2.find("{")
        end = s2.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = s2[start:end+1]
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                pass
    # Give up
    return None

# ---------------------------
# Routes
# ---------------------------
@app.route("/upload_pdf", methods=["POST"])
def upload_pdf():
    file = request.files.get("file")
    if not file:
        abort(400, description="No file provided")
    os.makedirs("uploads", exist_ok=True)
    filepath = os.path.join("uploads", file.filename)
    file.save(filepath)
    text = extract_text_from_pdf(filepath)
    if len(text) < MIN_TEXT_LEN:
        abort(422, description="No parsable text extracted from PDF. Try another file or use OCR.")
    return jsonify({"extracted_text": text}), 200

@app.route("/chat_stream", methods=["POST"])
def chat_stream():
    data = request.json or {}
    user_query = (data.get("query") or "").strip()
    pdf_text = (data.get("pdf_text") or "").strip()

    if not user_query:
        abort(400, description="No query provided")
    if len(pdf_text) < MIN_TEXT_LEN:
        abort(422, description="Insufficient PDF text context; upload a clearer PDF.")

    context = build_context(pdf_text)

    # Keep your same detailed system + user instructions
    system_message = "You are a helpful assistant. Use the provided context to answer the request."
    user_prompt = f"""
Context:
{context}

You are a helpful QA test case generator.
Your job is to read the provided context (which may come from any PDF or text) and generate test cases for the Explore Phase 2 chatbot feature.

Input sources:
The context may be extracted from a PDF or provided as plain text.

If the context is long or includes noise, extract only the parts relevant to Explore Phase 2 features (e.g., intake selector, banners, handpicked services, most popular, categories, UL Infinity, talk to expert, partners, analytics, navigation).

Output format:
Always output a Markdown table only. No explanations, no headings, no code blocks.

Columns in this exact order:
Test Case ID | Category (UI, Functionality, Edge, Filter) | Description | Expected Result | Status

Rules:
- Status must always be “Not Executed”
- Max 50 rows, stop at 50
- Unique IDs TC_EXP_001 … TC_EXP_050
- Distribute across categories where possible
- Edge cases include invalid inputs, API failures, empty states, etc.
- Filter cases cover toggles, reset, persistence, etc.
- Do not fabricate features not in context.

Begin.
""".strip()

    def generate():
        try:
            # 🔹 Step 1: get full response (blocking call)
            resp = client.chat.completions.create(
                model=PRIMARY_MODEL,
                messages=[
                    ChatMessage(role="system", content=system_message),
                    ChatMessage(role="user", content=user_prompt),
                ],
                max_tokens=2000,
            )
            full_text = extract_choice_content(resp)

            # 🔹 Step 2: stream it out char-by-char
            for ch in full_text:
                yield ch

            # 🔹 Step 3: save full response to DB after streaming
            if full_text:
                db = SessionLocal()
                try:
                    chat_record = ChatHistory(user_query=user_query, bot_response=full_text)
                    db.add(chat_record)
                    db.commit()
                finally:
                    db.close()

        except Exception as e:
            yield f"[SERVER ERROR: {str(e)}]"

    return Response(stream_with_context(generate()), mimetype="text/plain")


@app.route("/history", methods=["GET"])
def history():
    db = SessionLocal()
    try:
        records = db.query(ChatHistory).all()
        history_list = [{"user_query": r.user_query, "bot_response": r.bot_response} for r in records]
    finally:
        db.close()
    return jsonify(history_list), 200

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
