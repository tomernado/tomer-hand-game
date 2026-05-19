# 1. מאיפה להתחיל? אנחנו לוקחים אימג' מוכן של פייתון (גרסה קלה)
FROM python:3.11-slim

# 2. איפה הקוד "יחיה" בתוך הקונטיינר?
WORKDIR /app

# 3. העתקת קובץ הדרישות והתקנתן
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. העתקת כל שאר הקוד שלנו לתוך הקונטיינר
COPY . .

# 5. הפקודה שמריצה את הבוט כשהקונטיינר עולה
CMD ["python", "main.py"]