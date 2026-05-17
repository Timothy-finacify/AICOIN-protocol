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

def run_miner(wallet, iterations):
    global miner_process, mining_active, hash_rate
    
    miner_path = os.path.join(os.path.dirname(__file__), "miner.py")
    
    print(f"[SERVER] Starting miner: wallet={wallet}, iterations={iterations}")
    print(f"[SERVER] Miner path: {miner_path}")
    
    try:
        mining_active = True
        miner_process = subprocess.Popen(
            ["python", miner_path, wallet, str(iterations)],
            stdout=None,
            stderr=None,
            shell=False
        )
        print(f"[SERVER] Miner process started with PID: {miner_process.pid}")
        miner_process.wait()
        print(f"[SERVER] Miner process finished")
    except Exception as e:
        print(f"[SERVER] ERROR: {e}")
    finally:
        mining_active = False
        miner_process = None 
@app.route("/start", methods=["POST"])
def start_mining():
    global mining_active, current_wallet
    
    if mining_active:
        return jsonify({"status": "already running", "wallet": current_wallet})
    
    data = request.get_json()
    wallet = data.get("wallet", "0x7A92Ed305671429597FCe407a010a6868283e577")
    iterations = data.get("iterations", 10)
    
    current_wallet = wallet
    
    thread = threading.Thread(target=run_miner, args=(wallet, iterations))
    thread.daemon = True
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