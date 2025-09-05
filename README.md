

# 🤖 AI QA Chatbot  

A **React-based AI-powered QA chatbot** that generates structured test cases from PDF documents using **AI21’s Jamba model**.  

This application enables you to upload PDFs, extract text content, and generate test cases interactively via a modern chat interface.  

---

## ✨ Features  

- 📂 **PDF Upload & Text Extraction** – Upload PDF files and extract readable text  
- 🤖 **AI-Powered Test Case Generation** – Generate detailed test cases using **AI21’s Jamba Large** model  
- ⚡ **Real-time Streaming** – Character-by-character streaming for a natural conversation feel  
- 🌓 **Dark/Light Theme** – Switch between dark and light modes for better UX  
- 💾 **Chat History** – Persistent conversation storage with SQLite  
- 📱 **Responsive Design** – Works smoothly across desktop and mobile devices  
- 📋 **One-click Copy** – Copy generated test cases to clipboard easily  

---

<img width="1640" height="804" alt="image" src="https://github.com/user-attachments/assets/66cbfc35-0cf4-4f56-920d-4b64201e4ee3" />

## 🛠️ Technology Stack  

### **Frontend**  
- React 18 (with Hooks)  
- ReactMarkdown + remark-gfm (render markdown responses)  
- CSS-in-JS (dynamic theming with light/dark support)  

### **Backend**  
- Flask (Python web framework)  
- AI21 SDK (Jamba model integration)  
- SQLAlchemy (SQLite ORM)  
- PyMuPDF & pdfplumber (PDF text extraction)  
- Flask-CORS (CORS support)  

---

## 📦 Prerequisites  

- [Node.js](https://nodejs.org/) (v16 or higher)  
- [Python](https://www.python.org/) (3.8+)  
- AI21 API key ([Get one here](https://www.ai21.com/studio))  

---

## 🚀 Installation  

### 1. Clone the Repository  
```bash
git clone https://github.com/your-username/ai-qa-chatbot.git
cd ai-qa-chatbot
````

### 2. Frontend Setup

```bash
cd frontend
npm install
npm install react-markdown remark-gfm
```

### 3. Backend Setup

```bash
cd backend

# Create & activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install flask flask-cors sqlalchemy pymupdf pdfplumber ai21 werkzeug
```

---

## ⚙️ Configuration

### AI21 API Key

In `backend/app.py`, replace with your API key:

```python
AI21_API_KEY = "your-ai21-api-key-here"
```

### Frontend API Base URL

In `frontend/src/App.js` (or config file):

```javascript
const API_BASE = 'http://localhost:5000';
```

---

## ▶️ Usage

### Start Backend Server

```bash
cd backend
python app.py
```

Server runs at: **[http://localhost:5000](http://localhost:5000)**

### Start Frontend

```bash
cd frontend
npm start
```

Frontend runs at: **[http://localhost:3000](http://localhost:3000)**

---

## 💬 Using the Application

1. **Upload PDF** – Select a PDF file
2. **Review Extracted Text** – Verify extracted content
3. **Generate Test Cases** – Ask chatbot to generate test cases
4. **Copy Results** – Use "Copy Test Cases" button
5. **Switch Theme** – Toggle between light/dark mode

---

## 🔗 API Endpoints

| Method | Endpoint       | Description                          |
| ------ | -------------- | ------------------------------------ |
| POST   | `/upload_pdf`  | Upload & extract text from PDF files |
| POST   | `/chat_stream` | Generate streaming AI responses      |
| GET    | `/history`     | Retrieve chat history                |

---

## 📂 Project Structure

```
ai-qa-chatbot/
├── frontend/
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   └── index.js       # Entry point
│   ├── public/
│   └── package.json
├── backend/
│   ├── app.py             # Flask backend
│   ├── uploads/           # PDF upload directory
│   └── chat_history.db    # SQLite database
└── README.md
```

---

## 🔍 Features in Detail

### PDF Processing

* Multiple extraction methods (PyMuPDF, pdfplumber)
* Handles various PDF layouts and formats
* Validates minimum text length

### AI Integration

* Uses **AI21 Jamba-large** model
* Context truncation for large docs
* Structured prompting for consistent test case format

### UX Enhancements

* Typing animation (adjustable speed)
* Responsive breakpoints (default: 980px)
* Persistent theme preference

### Backend Configurations

* `MAX_CONTEXT_CHARS` = 8000 (default)
* `MIN_TEXT_LEN` = 200 (default)
* `PRIMARY_MODEL` = `"jamba-large"`

---

## ⚠️ Error Handling

* **PDF Upload** – Max size 64MB, validates text extraction quality
* **AI Responses** – Graceful handling of API errors
* **Network** – Timeout handling & retries
* **File Processing** – Fallback extraction methods

---

## 🤝 Contributing

1. Fork this repo
2. Create a new branch:

   ```bash
   git checkout -b feature/your-feature
   ```
3. Commit changes:

   ```bash
   git commit -am "Add new feature"
   ```
4. Push branch:

   ```bash
   git push origin feature/your-feature
   ```
5. Open a Pull Request

---

## 🙏 Acknowledgments

* [AI21 Labs](https://www.ai21.com/) for the **Jamba** model
* [React Community](https://react.dev/) for docs and ecosystem
* [Flask](https://flask.palletsprojects.com/) for the backend framework

