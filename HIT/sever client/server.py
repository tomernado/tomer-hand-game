import socket
import threading

# פונקציה לטיפול בכל לקוח
def handle_client(client_socket, client_address):
    print(f"New connection from {client_address}")
    try:
        while True:
            data = client_socket.recv(1024).decode('utf-8')
            if not data:
                break
            print(f"Received from {client_address}: {data}")
            client_socket.send(f"Server received: {data}".encode('utf-8'))
    except Exception as e:
        print(f"Error with client {client_address}: {e}")
    finally:
        client_socket.close()
        print(f"Connection with {client_address} closed.")

# הגדרת שרת
def main():
    host = '0.0.0.0'  # מאזין לכל הכתובות
    port = 12345      # הפורט שבו השרת יאזין

    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)  # מאפשר שימוש חוזר בכתובת
    try:
        server_socket.bind((host, port))
        print(f"Server successfully bound to {host}:{port}")
    except Exception as e:
        print(f"Error binding to port {port}: {e}")
        return

    server_socket.listen(5)  # הגבלת 5 חיבורים בו-זמנית
    print(f"Server is listening on {host}:{port}")

    while True:
        client_socket, client_address = server_socket.accept()
        threading.Thread(target=handle_client, args=(client_socket, client_address)).start()

if __name__ == "__main__":
    main()
