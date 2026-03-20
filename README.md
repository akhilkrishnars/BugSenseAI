# 🐞 BugSense AI

**Intelligent Bug Classification & Triage System using AI**

BugSense AI is a full-stack web application that automates bug classification, prioritization, and duplicate detection using Natural Language Processing (NLP) and Machine Learning.

It helps developers and QA teams reduce manual triaging effort and improve software quality through intelligent automation.

---

## 🚀 Features

- 🤖 **AI-Powered Bug Classification**
  - Uses NLP models (DistilBERT) to classify bugs into categories
- 📊 **Smart Prioritization**
  - Automatically ranks bugs based on severity and impact
- 🔍 **Duplicate Detection**
  - Identifies similar bug reports with high accuracy
- ⚡ **Automated Triage**
  - Reduces manual effort by routing bugs intelligently
- 📈 **Analytics Dashboard**
  - Visual insights into bug trends and categories
- 🔐 **Authentication System**
  - Secure login and registration for users

---

## 🏗️ Tech Stack

### 🔹 Frontend
- React / Next.js
- Tailwind CSS
- Framer Motion
- Lucide Icons

### 🔹 Backend
- Python
- Django
- Django REST Framework

### 🔹 Machine Learning
- DistilBERT (HuggingFace Transformers)
- PyTorch

### 🔹 Database
- MySQL / SQLite

### 🔹 Tools
- Git & GitHub
- VS Code
- Postman

---

## 📂 Project Structure

```
BugSense-AI/
├── backend/
├── frontend/
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/BugSense-AI.git
cd BugSense-AI
```

---

### 2️⃣ Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

---

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## 🤖 AI Model Details

- Model: **DistilBERT**
- Task: Bug classification

### Categories
- UI
- Functional
- Performance
- Security

---

## 📊 Key Metrics (Estimated)

| Metric | Value |
|--------|------|
| Accuracy | ~85% |
| Triage Reduction | ~80% |
| Duplicate Detection | ~60–95% |

---

## 🔐 Environment Variables

```
SECRET_KEY=your_secret_key
DEBUG=True
DATABASE_URL=your_database_url
```

---

## 🚧 Future Enhancements

- Mobile App Integration
- Real-time Notifications
- Explainable AI (SHAP)
- Multi-language Support
- Advanced Analytics
- Jira/GitHub Integration

---

## 👨‍💻 Author

Akhil  
MCA (2024–2026)

---

## 📜 License

Educational use only.
