#pragma config(Sensor, S1, colorSensor, sensorEV3_Color)
#pragma config(Motor, motorB, leftMotor, tmotorEV3_Large, PIDControl, driveLeft, encoder)
#pragma config(Motor, motorC, rightMotor, tmotorEV3_Large, PIDControl, driveRight, encoder)

task main()
{
	int valueOfColorReflected;
	
	int fast = 20; 
	int slow = 1;  
	int white = 60;
	
	int threshold = 20; 

	setMotorSpeed(leftMotor, fast);
	setMotorSpeed(rightMotor, fast);

	while(true)
	{
		valueOfColorReflected = getColorReflected(S1);
		displayCenteredTextLine(2, "%d", valueOfColorReflected);


		if (valueOfColorReflected == 0)
		{
			clearTimer(T1);
			setMotorSpeed(leftMotor, 0);
			setMotorSpeed(rightMotor, 0);
		}
		
		else if( valueOfColorReflected >= white && time1[T1] > 1500)
		{
    setMotorSpeed(leftMotor, slow); 
    setMotorSpeed(rightMotor, fast);  
    sleep(400); 


    setMotorSpeed(leftMotor, fast);
    setMotorSpeed(rightMotor, fast);
    sleep(1000); 



    if(valueOfColorReflected <= white)
    {
    	    clearTimer(T1);
    }

			
		}
		
		

		else if (valueOfColorReflected < threshold)
		{
			clearTimer(T1);
			setMotorSpeed(leftMotor, fast);
			setMotorSpeed(rightMotor, slow);
		}
		

		else if(valueOfColorReflected <= white)
		{
			clearTimer(T1);
			setMotorSpeed(leftMotor, slow);
			setMotorSpeed(rightMotor, fast);
		}
	}
}
