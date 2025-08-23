from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_socketio import SocketIO, emit
from flask_mysqldb import MySQL
import hashlib

app = Flask(__name__)
app.secret_key = "yoursecreatekey"
socketio = SocketIO(app, cors_allowed_origins="*")

# Setup your MySQL config here
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = 'yourmysqlpassword'
app.config['MYSQL_DB'] = 'secure_file_sharing'
mysql = MySQL(app)

connected_users = {}  # userId -> socket ID

@app.route('/')
def index():
    return render_template("login.html")

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        uname = request.form['username']
        email = request.form['email']
        password = request.form['password']

        cur = mysql.connection.cursor()
        cur.execute("SELECT * FROM users WHERE email = %s", (email,))
        existing_user = cur.fetchone()

        if existing_user:
            return jsonify({'status': 'error', 'message': 'User already exists!'})

        pwd_hash = hashlib.sha256(password.encode()).hexdigest()
        cur.execute("INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)", (uname, email, pwd_hash))
        mysql.connection.commit()
        cur.close()

        return jsonify({'status': 'success', 'message': 'User registered successfully!'})

    return render_template("register.html")

@app.route('/login', methods=['POST'])
def login():
    email = request.form['email']
    pwd = hashlib.sha256(request.form['password'].encode()).hexdigest()
    cur = mysql.connection.cursor()
    cur.execute("SELECT id, email FROM users WHERE email=%s AND password_hash=%s", (email, pwd))
    user = cur.fetchone()
    cur.close()
    if user:
        session['user_id'] = str(user[0])
        session['user_email'] = user[1]
        return redirect('/dashboard')
    return "Login Failed"

@app.route('/forgot', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = request.form['email']
        new_pass = hashlib.sha256(request.form['new_password'].encode()).hexdigest()
        cur = mysql.connection.cursor()
        cur.execute("UPDATE users SET password_hash=%s WHERE email=%s", (new_pass, email))
        mysql.connection.commit()
        cur.close()
        return redirect('/')
    return render_template("forgot.html")

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template("dashboard.html", user_id=session['user_id'], user_email=session['user_email'])

@app.route('/resolve-email')
def resolve_email():
    email = request.args.get('email')
    cur = mysql.connection.cursor()
    cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    user = cur.fetchone()
    cur.close()
    if user:
        return jsonify({'user_id': str(user[0])})
    else:
        return jsonify({'error': 'User not found'}), 404

# ✅ Log received files
@app.route('/log-received', methods=['POST'])
def log_received():
    data = request.get_json()
    sender_id = data.get('sender_id')
    receiver_id = data.get('receiver_id')
    file_name = data.get('file_name')

    cur = mysql.connection.cursor()
    cur.execute(
        "INSERT INTO received_files (receiver_id, sender_id, file_name) VALUES (%s, %s, %s)",
        (receiver_id, sender_id, file_name)
    )
    mysql.connection.commit()
    cur.close()
    return jsonify({'status': 'success'})

# ✅ Fetch received file history
@app.route('/received-history')
def received_history():
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Not logged in'}), 401

    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT sender_id, file_name, timestamp FROM received_files
        WHERE receiver_id = %s ORDER BY timestamp DESC
    """, (session['user_id'],))
    files = cur.fetchall()
    cur.close()

    file_list = [{
        'sender_id': f[0],
        'file_name': f[1],
        'timestamp': f[2].strftime('%Y-%m-%d %H:%M:%S')
    } for f in files]

    return jsonify(file_list)

# 🔌 WebRTC Signaling Handlers
@socketio.on('register_user')
def handle_register(data):
    user_id = str(data['userId'])
    connected_users[user_id] = request.sid
    print(f"[+] Registered user {user_id} with SID {request.sid}")

@socketio.on('offer')
def handle_offer(data):
    target_sid = connected_users.get(data['receiverId'])
    if target_sid:
        emit('offer', data, room=target_sid)

@socketio.on('answer')
def handle_answer(data):
    target_sid = connected_users.get(data['receiverId'])
    if target_sid:
        emit('answer', data, room=target_sid)

@socketio.on('ice-candidate')
def handle_ice(data):
    target_sid = connected_users.get(data['targetId'])
    if target_sid:
        emit('ice-candidate', data, room=target_sid)

if __name__ == '__main__':
    socketio.run(app, debug=True)
