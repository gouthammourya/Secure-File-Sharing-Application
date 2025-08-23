
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import base64

# You should persist the key securely (do not regenerate every time)
KEY = get_random_bytes(16)  # Store this securely, e.g., in a file or key vault

def encrypt_file_data(data: bytes) -> bytes:
    cipher = AES.new(KEY, AES.MODE_EAX)
    ciphertext, tag = cipher.encrypt_and_digest(data)
    encrypted = cipher.nonce + tag + ciphertext
    return base64.b64encode(encrypted)

def decrypt_file_data(encrypted_data: bytes) -> bytes:
    raw = base64.b64decode(encrypted_data)
    nonce, tag, ciphertext = raw[:16], raw[16:32], raw[32:]
    cipher = AES.new(KEY, AES.MODE_EAX, nonce=nonce)
    return cipher.decrypt_and_verify(ciphertext, tag)

