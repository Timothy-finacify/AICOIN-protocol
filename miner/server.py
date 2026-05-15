"""
AICOIN Mining API Server
Connects the mining dashboard to the actual miner
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess
import threading
import os

app = Flask(__name__)
CORS(app)

miner_process = None
mining_active = False
current_wallet = ""
hash_rate = 0

@app.route("/start", methods=["POST"])
def start_mining():
    global miner_process, mining_active, current_wallet
    
    if mining_active:
        return jsonify({"status": "already running", "wallet": current_wallet})
    
    data = request.get_json()
    wallet = data.get("wallet", "0x7A92Ed305671429597FCe407a010a6868283e577")
    iterations = data.get("iterations", 10)
    
    current_wallet = wallet
    
    miner_path = os.path.join(os.path.dirname(__file__), "miner.py")
    
    def run_miner():
        global miner_process, mining_active, hash_rate
        mining_active = True
        miner_process = subprocess.Popen(
            ["python", miner_path, wallet, str(iterations)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = miner_process.communicate()
        mining_active = False
        miner_process = None
        print(stdout)
        if stderr:
            print(stderr)
    
    thread = threading.Thread(target=run_miner)
    thread.start()
    
    return jsonify({
        "status": "started",
        "wallet": wallet,
        "iterations": iterations
    })

@app.route("/stop", methods=["POST"])
def stop_mining():
    global miner_process, mining_active
    
    if miner_process:
        miner_process.terminate()
        miner_process = None
    
    mining_active = False
    
    return jsonify({"status": "stopped"})

@app.route("/status", methods=["GET"])
def get_status():
    return jsonify({
        "mining_active": mining_active,
        "wallet": current_wallet,
        "hash_rate": hash_rate
    })

if __name__ == "__main__":
    app.run(port=5000, debug=False) 