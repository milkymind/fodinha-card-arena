import socketio
s = socketio.Client()
s.connect("http://localhost:5000")
s.emit("join", {"player_id": 1})
s.wait(seconds=3)
