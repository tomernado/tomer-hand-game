package org.exemple.demo;

import javax.print.attribute.standard.DateTimeAtCompleted;

public abstract class Model {
    private int data;
    public  Model() {
      this.data = 5;
    }
    public int getData() {
        return data;
    }
    public abstract void increase();{
      if (data < MAX_DATA)
          data++;
    }

    public abstract void decrease();{
        if (data > MIN_DATA)
            data--;
    }
}