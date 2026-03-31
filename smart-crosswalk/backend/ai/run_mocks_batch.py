"""
Run main.py on every image in mocks_img/ and write overlays to mocks_img_output/.
"""
import subprocess
import sys
from pathlib import Path

if __name__ == "__main__":
    root = Path(__file__).resolve().parent
    subprocess.check_call([sys.executable, str(root / "main.py")], cwd=str(root))
