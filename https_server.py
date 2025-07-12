#!/usr/bin/env python3
import http.server
import ssl
import socketserver
import os

PORT = 8000

class HTTPSHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # CORS headers for AR functionality
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

# Change to the directory containing the AR app
os.chdir('/Users/mizunomasaharu/ar-mosasaurus-in-a-box')

# Create HTTPS server
with socketserver.TCPServer(("", PORT), HTTPSHandler) as httpd:
    # Add SSL layer
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    # セキュリティ向上: 環境変数から証明書パスを取得
    cert_path = os.environ.get('SSL_CERT_PATH', 'cert.pem')
    key_path = os.environ.get('SSL_KEY_PATH', 'key.pem')
    context.load_cert_chain(cert_path, key_path)
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    
    print(f"Serving HTTPS on port {PORT}")
    print(f"Open in browser: https://localhost:{PORT}")
    print("Note: You'll need to accept the self-signed certificate warning")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")