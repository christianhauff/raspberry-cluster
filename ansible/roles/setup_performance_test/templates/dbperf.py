import socket, sys, subprocess, time

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
        s.bind(('0.0.0.0', 8080))
except socket.error as msg:
        print 'Bind failed. Error Code : ' + str(msg[0]) + ' Message ' + msg[1]
        sys.exit()

print("Socket Server started on 0.0.0.0:8080")

s.listen(10)

while 1:
        conn, addr = s.accept()
        print('Connected with ' + addr[0] + ':' + str(addr[1]))
        #p = subprocess.call(['ls', '-la'], stdout=subprocess.PIPE)

        start = time.time()

	#TODO must be blocking, but seems to continue
        res = subprocess.Popen(['mongo', 'testdb', '/opt/insert_random.js'], stdout = subprocess.PIPE)

        duration = time.time() - start

        print(res)
        print("duration: " + str(duration))
	conn.sendall(str(duration))
        conn.close()
s.close()

