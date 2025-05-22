import sys, time, socketio

PLAYER_ID = sys.argv[1]          # e.g. "P1"  or  "P2"
ROOM_ID   = "default"            # same as server

sio = socketio.Client()

@sio.event
def connect():
    print(f"[{PLAYER_ID}] Connected")

@sio.on("lobby_state")
def on_lobby(state):
    print(f"[{PLAYER_ID}] Lobby ->", state)

@sio.on("game_started")
def on_start(state):
    print(f"[{PLAYER_ID}] GAME START ->", state)

@sio.on("round_update")
def on_round(state):
    print(f"[{PLAYER_ID}] ROUND ->", state)

@sio.on("game_over")
def on_gameover(state):
    print(f"[{PLAYER_ID}] GAME OVER ->", state)
    sio.disconnect()

sio.connect("http://localhost:5050")
sio.emit("join", {"room_id": ROOM_ID, "player_id": PLAYER_ID})

# Only PLAYER 1 will start and drive the game
if PLAYER_ID == "P1":
    sio.emit("start_game", {"num_players": 2})   # two-player match
    time.sleep(1)
    for _ in range(15):                          # play 15 rounds
        sio.emit("next_round")
        time.sleep(0.8)
    time.sleep(2)
    sio.disconnect()
else:
    sio.wait()    # stay online and print updates
