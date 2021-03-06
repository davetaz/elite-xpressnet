import sys
import serial
import time
import redis

ser = serial.Serial('/dev/ttyACM0',9600)
redis = redis.Redis()

def send(message):
	ok = False
	trys = 1
	while (not ok and trys < 5) :
	  ser.write(message)
	  print 'trys = %d send:' % (trys) , 
	  for byte in message:print(hex(byte)) ,
	  time.sleep(.1)
	  print ' receive: ',     
	  while ser.inWaiting() > 0 :
	  	enq = ser.read()
	  	print enq.encode('hex') ,  
	  	if enq == '05'.decode('hex') : 
		  ok = True
	  print 
	  trys += 1

def send2(message):
	ret = ""
	ser.write(message)
	for byte in message:print(hex(byte)) ,
	time.sleep(.1)
	print ' receive: ',     
	while ser.inWaiting() > 0 :
		enq = ser.read()
	  	print enq.encode('hex') ,  
		ret += enq
	print
	return ret.strip()

def parity(message):
	edb = 0
	for byte in message: edb ^= byte
	message.append(edb)

def setThrottle(address,direction,speed):
	message = bytearray('E400000000'.decode('hex'))
	message[1] = 0x13
	message[3] = address
	message[4] = speed
	print direction;
	if direction  == 'F' : message[4] |= int(b'10000000',2)
	elif direction == 'R' : message[4] &= int(b'01111111',2)
	parity(message) 
	send(message) 
#	test(message)

def getFirmwareVersion():
	message = bytearray('212100'.decode('hex'))
	ret = send2(message)
	version = ret[0];
	xor = ret[2];
	print version.encode('hex')
	print
	message = bytearray('8d00'.decode('hex'))
	edb = 0
	for byte in message: edb ^= byte
	print edb

def test(message):
	for c in message: print(c)

while 1:
        message = redis.lpop('traincon')
        if (message):
                bits = message.split(',')
                train_id = int(bits[0])
		direction = bits[1]
		speed = int(bits[2])
		print("setting speed of " + str(train_id) + " in direction " + direction + " to speed " + str(speed));
		setThrottle(train_id,direction,speed)
		try:
			getFirmwareVersion()
		except:
			pass;

#print "Loco: " + sys.argv[1]
#print "Direction: " + sys.argv[2]
#print "Speed: " + sys.argv[3]
#setThrottle(3,"b",0);
#setThrottle(int(sys.argv[1]),sys.argv[2],int(sys.argv[3]));
#getFirmwareVersion()
