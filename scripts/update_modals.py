with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Remove openChangePasswordModal button
target_btn = '<button onclick="openChangePasswordModal()" class="btn-admin-action secondary">🔑 Cambiar Clave</button>'
if target_btn in text:
    text = text.replace(target_btn + '\n', '')
    text = text.replace(target_btn, '')
    print('Removed openChangePasswordModal button')
else:
    print('Button not found')

# 2. Clean up adminLoginModal to remove smtpSetupBox
old_smtp_start = text.find('<!-- Optional: SMTP App Password setup collapsible -->')
old_smtp_end = text.find('</div>\n\n  <!-- Change Password Modal -->')
if old_smtp_start == -1:
    old_smtp_end = text.find('</div>\r\n\r\n  <!-- Change Password Modal -->')

if old_smtp_start != -1 and old_smtp_end != -1:
    text = text[:old_smtp_start] + text[old_smtp_end:]
    print('Removed smtpSetupBox')
else:
    # Alternative boundary search
    idx_smtp = text.find('id="smtpSetupBox"')
    if idx_smtp != -1:
        prev_div = text.rfind('<div style="margin-top: 22px;', 0, idx_smtp)
        next_modal = text.find('<!-- Change Password Modal -->', idx_smtp)
        if prev_div != -1 and next_modal != -1:
            # find closing </div> of dialog before changePasswordModal
            prev_close = text.rfind('</div>', prev_div, next_modal)
            # actually the dialog ends before next_modal
            text = text[:prev_div] + text[next_modal:]
            print('Removed smtpSetupBox via alternative boundary')

# 3. Remove changePasswordModal
ch_start = text.find('<!-- Change Password Modal -->')
ch_end = text.find('<!-- Bulk Price Adjustment Modal -->')
if ch_start != -1 and ch_end != -1:
    text = text[:ch_start] + text[ch_end:]
    print('Removed changePasswordModal')
else:
    print('changePasswordModal boundary not found')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(text)

print('Done updating index.html')
