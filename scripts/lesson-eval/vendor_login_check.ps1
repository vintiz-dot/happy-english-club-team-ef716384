# Owner step: sign in as an admin to check the vendor proxy accepts you.
# Asks for the admin email, then the password (hidden). Nothing is saved or printed.
& "C:\Users\Dell\hec-audio-eval\.venv\Scripts\python.exe" "$PSScriptRoot\vendor_run.py" --login --whoami
