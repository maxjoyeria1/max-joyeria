#!/usr/bin/env python3
"""
MAX JOYERÍA - SECURE ADMIN API SERVER & EMAIL OTP DISPATCHER
Includes:
- Dynamic Email OTP (One-Time Password) to wicontable@gmail.com
- Real Google SMTP Email Delivery via TLS
- Fallback Instant Dev Code display if SMTP credentials not yet provided
- Multi-Threaded HTTP Server (socketserver.ThreadingTCPServer)
- Bearer Token Session Management (24h validity)
- Disk persistence to data/products.js
"""

import http.server
import socketserver
import json
import os
import sys
import time
import secrets
import hashlib
import re
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PRODUCTS_FILE = os.path.join(BASE_DIR, 'data', 'products.js')
CONFIG_FILE = os.path.join(BASE_DIR, 'admin_config.json')
ADMIN_EMAIL = "wicontable@gmail.com"

# In-memory security stores
active_tokens = {}      # token -> expiration_timestamp
active_otps = {}        # code -> { 'code', 'email', 'expires_at', 'attempts' }
last_otp_request = {}   # ip -> timestamp (cooldown rate-limit)
failed_attempts = {}    # ip -> { 'count', 'locked_until' }

def load_admin_config():
    default_config = {
        "admin_email": ADMIN_EMAIL,
        "smtp_configured": False,
        "smtp_host": "smtp.gmail.com",
        "smtp_port": 587,
        "smtp_user": ADMIN_EMAIL,
        "smtp_app_password": "",
        "password_hash": "0a0f9151c769ead9ada3ed100dcb1d9e022ea46c49d595140134f8c88caef052"
    }
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                default_config.update(data)
                return default_config
        except Exception as e:
            print(f"[CONFIG ERROR] Error leyendo admin_config.json: {e}")
    return default_config

def save_admin_config(new_data):
    config = load_admin_config()
    config.update(new_data)
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    return config

def send_otp_via_smtp(to_email, otp_code):
    config = load_admin_config()
    smtp_user = config.get('smtp_user', ADMIN_EMAIL).strip()
    smtp_pass = config.get('smtp_app_password', '').strip()
    smtp_host = config.get('smtp_host', 'smtp.gmail.com').strip()
    smtp_port = int(config.get('smtp_port', 587))

    if not smtp_pass:
        print("\n" + "="*60)
        print(f" [EMAIL OTP MAX JOYERÍA]")
        print(f" Correo destinatario: {to_email}")
        print(f" CÓDIGO DE SEGURIDAD GENERADO: >>> {otp_code} <<<")
        print(f" Validez: 10 Minutos")
        print(f" (Para enviar al correo real, configura tu Contraseña de Aplicación de Google)")
        print("="*60 + "\n")
        return False, "SMTP_NOT_CONFIGURED"

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"Max Joyería - Tu Código de Acceso de Administrador: {otp_code}"
        msg['From'] = f"Max Joyería Seguridad <{smtp_user}>"
        msg['To'] = to_email

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0c0c0e; color: #ffffff; margin: 0; padding: 30px; }}
            .card {{ max-width: 500px; margin: 0 auto; background: #17171c; border: 1px solid #d4af37; border-radius: 12px; padding: 36px; text-align: center; }}
            .logo {{ font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #d4af37; margin-bottom: 8px; }}
            .sub {{ font-size: 11px; letter-spacing: 3px; color: #a1a1aa; margin-bottom: 28px; text-transform: uppercase; }}
            .code-box {{ background: #22222a; border: 1px dashed #d4af37; border-radius: 8px; padding: 18px; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #f59e0b; margin: 24px 0; }}
            .text {{ font-size: 14px; color: #d1d5db; line-height: 1.6; margin-bottom: 20px; }}
            .warn {{ font-size: 12px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #27272a; padding-top: 16px; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">MAX JOYERÍA</div>
            <div class="sub">ORO 18K Y ORO LAMINADO • ACCESO PANEL</div>
            <p class="text">Has solicitado ingresar al panel de administración para ajustar precios del catálogo oficial.</p>
            <p class="text" style="margin-bottom: 6px;">Tu código de seguridad temporal de 6 dígitos es:</p>
            <div class="code-box">{otp_code}</div>
            <p class="text">Este código es de un solo uso y expirará en <strong>10 minutos</strong>.</p>
            <p class="warn">Si no solicitaste este código, puedes ignorar este mensaje de forma segura. Nadie puede acceder sin este código.</p>
          </div>
        </body>
        </html>
        """

        msg.attach(MIMEText(f"Tu código de acceso de administrador en Max Joyería es: {otp_code} (Válido 10 minutos).", 'plain', 'utf-8'))
        msg.attach(MIMEText(html_body, 'html', 'utf-8'))

        with smtplib.SMTP(smtp_host, smtp_port, timeout=12) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, [to_email], msg.as_string())

        print(f"[SMTP SUCCESS] Correo con código {otp_code} entregado con éxito a {to_email}")
        return True, "Enviado a tu correo exitosamente"

    except Exception as e:
        print(f"[SMTP ERROR] No se pudo enviar el correo a {to_email}: {e}")
        return False, str(e)


class MaxJoyeriaHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_POST(self):
        if self.path == '/api/request-otp':
            self.handle_request_otp()
        elif self.path == '/api/verify-otp':
            self.handle_verify_otp()
        elif self.path == '/api/configure-smtp':
            self.handle_configure_smtp()
        elif self.path == '/api/admin-login':
            self.handle_admin_login()
        elif self.path == '/api/admin-logout':
            self.handle_admin_logout()
        elif self.path == '/api/change-password':
            self.handle_change_password()
        elif self.path == '/api/update-price':
            self.handle_update_price()
        elif self.path == '/api/bulk-price':
            self.handle_bulk_price()
        else:
            self.send_error(404, "Endpoint no encontrado")

    def get_client_ip(self):
        return self.client_address[0] if self.client_address else 'unknown'

    def verify_auth(self):
        auth_header = self.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return False
        token = auth_header.split('Bearer ', 1)[1].strip()
        if not token or token not in active_tokens:
            return False
        # Check token expiration (24h)
        if time.time() > active_tokens[token]:
            del active_tokens[token]
            return False
        return True

    def handle_request_otp(self):
        ip = self.get_client_ip()
        now = time.time()

        # Cooldown: 15 seconds
        last_req = last_otp_request.get(ip, 0)
        if now - last_req < 15:
            remaining = int(15 - (now - last_req))
            self.send_json_response({
                'ok': False,
                'error': f'Por favor espera {remaining} segundos antes de solicitar otro código.'
            }, status=429)
            return

        last_otp_request[ip] = now

        # Generate 6-digit cryptographic OTP
        otp_code = f"{secrets.randbelow(900000) + 100000:06d}"
        active_otps[otp_code] = {
            'code': otp_code,
            'email': ADMIN_EMAIL,
            'expires_at': now + 600, # 10 minutes
            'attempts': 0
        }

        # Attempt to deliver via SMTP
        sent, info = send_otp_via_smtp(ADMIN_EMAIL, otp_code)

        config = load_admin_config()
        has_smtp_password = bool(config.get('smtp_app_password'))

        response_data = {
            'ok': True,
            'email': ADMIN_EMAIL,
            'email_sent': sent,
            'expiresIn': 600,
            'smtp_configured': has_smtp_password
        }

        if sent:
            response_data['message'] = f'Código de seguridad enviado a {ADMIN_EMAIL}. Revisa tu bandeja de entrada.'
        else:
            # If SMTP is not yet set up, provide instant access code so user is never locked out
            response_data['dev_code'] = otp_code
            response_data['message'] = f'Código temporal generado: {otp_code}. (Configura la clave de aplicación de Gmail para enviarlo directo a tu bandeja).'

        self.send_json_response(response_data)

    def handle_verify_otp(self):
        ip = self.get_client_ip()
        now = time.time()

        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8'))
            entered_code = str(payload.get('code', '')).strip().replace(' ', '')

            if not entered_code:
                self.send_json_response({'ok': False, 'error': 'Ingresa el código de 6 dígitos'}, status=400)
                return

            if entered_code not in active_otps:
                self.send_json_response({'ok': False, 'error': 'Código de seguridad no válido o ya utilizado.'}, status=400)
                return

            otp_record = active_otps[entered_code]

            # Check expiration
            if now > otp_record['expires_at']:
                del active_otps[entered_code]
                self.send_json_response({'ok': False, 'error': 'El código ha expirado (validez: 10 minutos). Solicita uno nuevo.'}, status=400)
                return

            # Match!
            del active_otps[entered_code]
            failed_attempts.pop(ip, None)

            # Issue 24h Bearer Token
            token = secrets.token_hex(32)
            active_tokens[token] = now + 86400

            print(f"[AUTH OTP SUCCESS] Acceso administrador concedido a {ADMIN_EMAIL} desde {ip}")
            self.send_json_response({
                'ok': True,
                'token': token,
                'email': ADMIN_EMAIL,
                'expiresIn': 86400,
                'message': f'Acceso verificado exitosamente para {ADMIN_EMAIL}'
            })

        except Exception as e:
            self.send_json_response({'ok': False, 'error': str(e)}, status=500)

    def handle_configure_smtp(self):
        # Allow configuring or updating Google App Password
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8'))
            app_password = str(payload.get('appPassword', '')).strip().replace(' ', '')

            if not app_password or len(app_password) < 14:
                self.send_json_response({'ok': False, 'error': 'La contraseña de aplicación de Google suele tener 16 caracteres.'}, status=400)
                return

            save_admin_config({
                'smtp_configured': True,
                'smtp_app_password': app_password
            })

            # Send a confirmation email
            test_code = f"{secrets.randbelow(900000) + 100000:06d}"
            active_otps[test_code] = {
                'code': test_code,
                'email': ADMIN_EMAIL,
                'expires_at': time.time() + 600,
                'attempts': 0
            }
            sent, info = send_otp_via_smtp(ADMIN_EMAIL, test_code)

            if sent:
                self.send_json_response({
                    'ok': True,
                    'message': f'¡Configuración exitosa! Te hemos enviado un código de confirmación a {ADMIN_EMAIL}.'
                })
            else:
                self.send_json_response({
                    'ok': False,
                    'error': f'Google rechazó la contraseña de aplicación: {info}. Verifica que la verificación en 2 pasos de tu cuenta Google esté activa.'
                }, status=400)

        except Exception as e:
            self.send_json_response({'ok': False, 'error': str(e)}, status=500)

    def handle_admin_login(self):
        # Backward-compatible password login
        ip = self.get_client_ip()
        now = time.time()

        attempt_info = failed_attempts.get(ip, {'count': 0, 'locked_until': 0})
        if now < attempt_info['locked_until']:
            remaining = int(attempt_info['locked_until'] - now)
            self.send_json_response({
                'ok': False, 
                'error': f'Demasiados intentos fallidos. Bloqueado temporalmente ({remaining}s).'
            }, status=429)
            return

        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8'))
            password = str(payload.get('password', '')).strip()

            config = load_admin_config()
            expected_hash = config.get('password_hash')
            entered_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()

            if secrets.compare_digest(entered_hash, expected_hash):
                failed_attempts.pop(ip, None)
                token = secrets.token_hex(32)
                active_tokens[token] = now + 86400
                print(f"[AUTH SUCCESS] Sesión iniciada desde {ip}")
                self.send_json_response({
                    'ok': True,
                    'token': token,
                    'expiresIn': 86400,
                    'message': 'Autenticación exitosa'
                })
            else:
                attempt_info['count'] += 1
                if attempt_info['count'] >= 5:
                    attempt_info['locked_until'] = now + 900
                    failed_attempts[ip] = attempt_info
                    self.send_json_response({
                        'ok': False,
                        'error': 'Has superado el límite de 5 intentos. Bloqueado por 15 minutos.'
                    }, status=429)
                else:
                    failed_attempts[ip] = attempt_info
                    remaining = 5 - attempt_info['count']
                    self.send_json_response({
                        'ok': False,
                        'error': f'Clave incorrecta. Intentos restantes: {remaining}'
                    }, status=401)

        except Exception as e:
            self.send_json_response({'ok': False, 'error': str(e)}, status=500)

    def handle_admin_logout(self):
        auth_header = self.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split('Bearer ', 1)[1].strip()
            active_tokens.pop(token, None)
        self.send_json_response({'ok': True, 'message': 'Sesión cerrada'})

    def handle_change_password(self):
        if not self.verify_auth():
            self.send_json_response({'ok': False, 'error': 'Acceso denegado: Token no válido.'}, status=401)
            return

        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8'))
            new_password = str(payload.get('newPassword', '')).strip()

            if len(new_password) < 6:
                self.send_json_response({'ok': False, 'error': 'La contraseña debe tener al menos 6 caracteres'}, status=400)
                return

            new_hash = hashlib.sha256(new_password.encode('utf-8')).hexdigest()
            save_admin_config({'password_hash': new_hash})
            self.send_json_response({'ok': True, 'message': 'Contraseña actualizada exitosamente'})

        except Exception as e:
            self.send_json_response({'ok': False, 'error': str(e)}, status=500)

    def handle_update_price(self):
        if not self.verify_auth():
            self.send_json_response({'ok': False, 'error': 'Acceso denegado: Token no válido o expirado.'}, status=401)
            return

        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8'))

            prod_id = payload.get('id')
            new_price = int(payload.get('price', 0))

            if not prod_id or new_price < 0:
                self.send_json_response({'ok': False, 'error': 'Datos inválidos'}, status=400)
                return

            with open(PRODUCTS_FILE, 'r', encoding='utf-8') as f:
                content = f.read()

            match = re.search(r'const PRODUCTS_DATA\s*=\s*(\[[\s\S]*?\]);', content)
            if not match:
                self.send_json_response({'ok': False, 'error': 'Estructura no encontrada en products.js'}, status=500)
                return

            products = json.loads(match.group(1))

            updated = False
            for p in products:
                if p.get('id') == prod_id or p.get('sku') == prod_id:
                    p['price'] = new_price
                    updated = True
                    break

            if not updated:
                self.send_json_response({'ok': False, 'error': 'Producto no encontrado'}, status=404)
                return

            with open(PRODUCTS_FILE, 'w', encoding='utf-8') as f:
                f.write('// Auto-generated catalogue database with 487 products from orolaminado18.com\n')
                f.write('// Enriched with real authentic descriptions, features, and technical specifications\n')
                f.write('const PRODUCTS_DATA = ')
                json.dump(products, f, ensure_ascii=False, indent=2)
                f.write(';\n\nif (typeof module !== "undefined" && module.exports) {\n  module.exports = { PRODUCTS_DATA };\n}\n')

            self.send_json_response({'ok': True, 'id': prod_id, 'newPrice': new_price})
            print(f"[ADMIN SECURE] Precio actualizado: {prod_id} -> ${new_price:,} COP")

        except Exception as e:
            self.send_json_response({'ok': False, 'error': str(e)}, status=500)

    def handle_bulk_price(self):
        if not self.verify_auth():
            self.send_json_response({'ok': False, 'error': 'Acceso denegado: Token no válido o expirado.'}, status=401)
            return

        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8'))

            collection = payload.get('collection', 'all')
            percent = float(payload.get('percent', 0))

            with open(PRODUCTS_FILE, 'r', encoding='utf-8') as f:
                content = f.read()

            match = re.search(r'const PRODUCTS_DATA\s*=\s*(\[[\s\S]*?\]);', content)
            if not match:
                self.send_json_response({'ok': False, 'error': 'Estructura no encontrada en products.js'}, status=500)
                return

            products = json.loads(match.group(1))

            count = 0
            for p in products:
                if collection == 'all' or p.get('collection') == collection or p.get('metal') == collection:
                    current_p = p.get('price', 0)
                    factor = 1 + (percent / 100.0)
                    new_p = int(round(current_p * factor / 100.0) * 100)
                    p['price'] = new_p
                    count += 1

            with open(PRODUCTS_FILE, 'w', encoding='utf-8') as f:
                f.write('// Auto-generated catalogue database with 487 products from orolaminado18.com\n')
                f.write('// Enriched with real authentic descriptions, features, and technical specifications\n')
                f.write('const PRODUCTS_DATA = ')
                json.dump(products, f, ensure_ascii=False, indent=2)
                f.write(';\n\nif (typeof module !== "undefined" && module.exports) {\n  module.exports = { PRODUCTS_DATA };\n}\n')

            self.send_json_response({
                'ok': True, 
                'count': count, 
                'percent': percent, 
                'collection': collection,
                'message': f'Se actualizaron {count} productos correctamente (+{percent}%)'
            })
            print(f"[ADMIN SECURE] Ajuste masivo aplicado: {count} productos ({percent}%)")

        except Exception as e:
            self.send_json_response({'ok': False, 'error': str(e)}, status=500)

    def send_json_response(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def end_headers(self):
        self.send_header('X-Frame-Options', 'SAMEORIGIN')
        self.send_header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        self.send_header('X-Content-Type-Options', 'nosniff')
        if self.path.endswith('.js') or self.path.endswith('.html'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("", PORT), MaxJoyeriaHandler) as httpd:
        print(f"Max Joyería Secure Server (Multi-threaded) activo en http://localhost:{PORT}")
        print(f"Correo de verificación administrador: {ADMIN_EMAIL}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")
            sys.exit(0)
