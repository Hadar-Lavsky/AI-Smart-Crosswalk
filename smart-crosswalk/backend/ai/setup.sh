#!/bin/bash

echo "============================================"
echo " Smart Crosswalk - AI Service Setup"
echo "============================================"
echo ""

# Check Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python3 is not installed."
    echo "Install it with:"
    echo "  macOS:  brew install python"
    echo "  Ubuntu: sudo apt install python3 python3-venv python3-pip"
    exit 1
fi

echo "Found Python:"
python3 --version
echo ""

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "Virtual environment created."
else
    echo "Virtual environment already exists."
fi
echo ""

# Activate and install
echo "Installing dependencies..."
source venv/bin/activate
pip install -r requirements.txt

echo ""
echo "============================================"
echo " Setup complete!"
echo "============================================"
echo ""
echo "To activate the environment, run:"
echo "  cd backend/ai"
echo "  source venv/bin/activate"
echo ""
echo "To run the detection script:"
echo "  python main.py"
