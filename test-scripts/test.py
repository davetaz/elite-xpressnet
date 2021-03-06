import smbus
import time
import sys

bus = smbus.SMBus(1)
addresses = [0x20,0x21]

IODIRA =  0x00 
IODIRB =  0x01
GPINTENA = 0X04
GPINTENB = 0x05
GPPUA  =  0x0c
GPPUB  =  0x0d
INTFA  =  0x0e
INTFB  =  0x0f
INTCAPA=  0x10
INTCAPB=  0x11
GPIOA  =  0x12
GPIOB  =  0x13

prev = {}

for address in addresses:
	bus.write_byte_data(address,IODIRA,0xff)
	bus.write_byte_data(address,IODIRB,0x00)

	bus.write_byte_data(address,GPPUA,0xff)
	bus.write_byte_data(address,GPINTENA,0xff)

	status = bus.read_byte_data(address,0x13)
	bus.write_byte_data(address,0x13,int(status))
	prev[address]="00000000"


while 1 :
	for address in addresses:
		x=bus.read_byte_data(address,INTCAPA)
		bar=bin(x)[2:].zfill(8)
		if (bar != prev[address]) :
			prev[address] = bar
			print str(address) + " READING " + str(bar)
