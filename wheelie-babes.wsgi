import sys
import os

sys.path.insert(0, '/var/www/wheelie-babes.bsik.net/public_html')

venv_path = os.path.join('/var/www/wheelie-babes.bsik.net/public_html', '.venv', 'lib', 'python3.12', 'site-packages')
sys.path.insert(0, venv_path)

from app import app as application
