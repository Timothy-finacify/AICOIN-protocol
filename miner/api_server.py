#!/usr/bin/env python3
"""AICOIN Miner API — Persistent background miner"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess
import json
import os
import sys
import atexit

app = Flask(__name__)
CORS(app)

MINER_PATH = os.path.join(os.path.dirname(__file__), "miner_v3.py")
STATE_FILE = os.path.join(os.path.dirname(__file__), "miner_state.json")
PRIVATE_KEY = "0xd633c30688b6c17d932c8e91100393ddd41d49f809b4d2dd5207ef87e03b6e1f"
WALLET = "0x7A92Ed305671429597FCe407a010a6868283e577"

miner_process = None

def start_miner():
    global miner_process
    if miner_process and miner_process.poll() is None:
        return False
    try:
        miner_process = subprocess.Popen(
            [sys.executable, MINER_PATH, "--private-key", PRIVATE_KEY, "--wallet", WALLET],
            stdout=sys.stdout, stderr=sys.stderr
        )
        return True
    except:
        return False

def stop_miner():
    global miner_process
    if miner_process:
        miner_process.terminate()
        miner_process = None
        return True
    return False

def is_mining():
    if miner_process and miner_process.poll() is None:
        return True
    return False

def read_state():
    try:
        if os.path.exists(STATE_FILE):
            with open(STATE_FILE, 'r') as f:
                return json.load(f)
    except:
        pass
    return {}

@app.route("/start", methods=["POST"])
def api_start():
    started = start_miner()
    return jsonify({"status": "started" if started else "already_running", "mining_active": is_mining()})

@app.route("/stop", methods=["POST"])
def api_stop():
    stop_miner()
    return jsonify({"status": "stopped", "mining_active": False})

@app.route("/status", methods=["GET"])
def api_status():
    state = read_state()
    return jsonify({
        "mining_active": is_mining(),
        "total_mined_aic": state.get("total_mined", 0) / 1e9,
        "blocks_mined": state.get("blocks_mined", 0),
        "hardware_tier": state.get("hardware_tier", 0),
        "is_registered": state.get("is_registered", False),
        "is_staked": state.get("is_staked", False),
        "staked_amount": state.get("staked_amount", 0) / 1e9,
    })

atexit.register(stop_miner)

if __name__ == "__main__":
    app.run(port=5000, debug=False)