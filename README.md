# 🔐 Secure File Sharing Application  

A **real-time, peer-to-peer secure file sharing system** built with **Flask, Flask-SocketIO, WebRTC, and AES encryption (PyCryptodome + CryptoJS)**. This application allows users to **register, login, pair via email, and share files securely** over the browser with **end-to-end encryption**.  

## 🚀 Features  
- 🧑‍💻 User registration, login, and password reset  
- 📧 Email-based pairing for secure file transfer  
- 🔒 AES encryption & decryption (PyCryptodome for backend, CryptoJS for frontend)  
- 🌐 Real-time peer-to-peer file transfer via WebRTC  
- 📊 Transfer history stored in MySQL database  
- 📂 Multi-file & large file transfer (chunked sending)  
- ⏹ Cancel transfer option with real-time progress  
- 🎨 Modern UI with animations and attractive dashboard  

## 🛠️ Tech Stack  
**Backend:** Flask, Flask-SocketIO, Python (PyCryptodome)  
**Frontend:** HTML, CSS, JavaScript, WebRTC, CryptoJS  
**Database:** MySQL  
**Other:** Socket.IO, WebSocket, Email integration  

## 📁 Project Structure  
```
secure_file_sharing_app/
│── backend/
│   ├── app.py                 # Flask backend
│   ├── models.py              # Database models
│   ├── utils/                 # Encryption & helper functions
│   ├── static/                # CSS, JS, images
│   ├── templates/             # HTML pages
│── database/
│   ├── schema.sql             # MySQL schema
│── requirements.txt           # Python dependencies
│── README.md                  # Project documentation
```

## ⚙️ Installation & Setup  

### 1️⃣ Clone the repository  
```bash
git clone https://github.com/your-username/secure-file-sharing-app.git
cd secure-file-sharing-app
```

### 2️⃣ Create virtual environment & install dependencies  
```bash
python -m venv venv
source venv/bin/activate   # On Linux/Mac
venv\Scripts\activate      # On Windows

pip install -r requirements.txt
```

### 3️⃣ Configure Database  
- Install MySQL and create a database:  
```sql
CREATE DATABASE secure_file_sharing;
```
- Update `app.py` with your DB credentials:  
```python
SQLALCHEMY_DATABASE_URI = "mysql://username:password@localhost/secure_file_sharing"
```
- Import schema:  
```bash
mysql -u username -p secure_file_sharing < database/schema.sql
```

### 4️⃣ Run the application  
```bash
python backend/app.py
```
Visit **http://127.0.0.1:5000/** in your browser.  

## 🔐 Security Implementation  
- Files are encrypted using **AES-256-CBC** before transfer.  
- Encrypted chunks are transmitted via **WebRTC DataChannel**.  
- Receiver decrypts chunks in real time and reconstructs the original file.  
- Transfer logs & history stored securely in **MySQL**.   

## 📸 Screenshots  
<img width="1920" height="1020" alt="Image" src="https://github.com/user-attachments/assets/b33737ae-ae70-4045-9efc-fbcb809f19b5" />
<img width="1920" height="1020" alt="Image" src="https://github.com/user-attachments/assets/29d24c07-52e7-426b-be09-e43adcb24e40" />
<img width="1920" height="1020" alt="Image" src="https://github.com/user-attachments/assets/980d9c6b-49e2-4eed-b323-ab50eb0dd015" />
<img width="1920" height="1020" alt="Image" src="https://github.com/user-attachments/assets/a695b40a-79d9-45a2-886d-6dce96a0d80a" />

### 🧑‍💻 Sender dashboard
<img width="1920" height="1020" alt="Image" src="https://github.com/user-attachments/assets/704b6ee1-c22d-486a-9458-44b0dfdd4481" />
<img width="960" height="1020" alt="Image" src="https://github.com/user-attachments/assets/7c908eee-2798-4cd6-b0c2-1774424cb0a5" />

### 🧑‍💻 Receiver dashboard
<img width="1920" height="1020" alt="Image" src="https://github.com/user-attachments/assets/3a1fbd9e-7eaa-4782-a10a-d4afd28e7013" />
<img width="960" height="1020" alt="Image" src="https://github.com/user-attachments/assets/669a06c8-1078-44d1-93e9-9be738413b4f" />

## 🌟 Future Enhancements  
- 📱 Mobile app version (Android & iOS) with the same secure transfer protocol  
- ☁️ Cloud backup & storage integration for received files  
- 🤖 AI-powered anomaly detection to identify suspicious file transfers  
- 🔑 Integration with blockchain for decentralized file verification  
- 🖥️ Desktop client for offline secure file transfer  
- 📊 Advanced analytics & admin dashboard for monitoring transfers

## 🧑‍💻 Author
- Developed by Goutham Mourya A M
