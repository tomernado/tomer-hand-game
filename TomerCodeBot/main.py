import os
import google.generativeai as genai
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, CommandHandler, MessageHandler, filters

# 1. טעינת הגדרות
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# פונקציית עזר לחיתוך טקסט ארוך (תיקון לשגיאת Message too long)
def split_text(text, n=4000):
    return [text[i:i+n] for i in range(0, len(text), n)]

# 2. פונקציית הניתוח - Gemini 2.5 Flash
async def get_ai_response(text):
    system_instruction = """
    אתה בודק קוד נוקשה ב-HIT לפי הסטנדרטים של גיא רונן. 
    נתח את הקוד הבא:
    - שמות משתנים: חייבים להיות משמעותיים ומלאים.
    - Magic Numbers: הכל חייב להיות ב-Constants.
    - Encapsulation: משתנים פרטיים עם Getters/Setters.
    - תיעוד: JavaDoc מלא לכל מתודה.
    תן ציון מ-1 עד 100 ופירוט תיקונים מעמיק.
    """
    
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(f"{system_instruction}\n\nCode:\n{text}")
        return response.text
    except Exception as e:
        return f"שגיאה בפנייה ל-AI: {str(e)}"

# 3. טיפול בהודעות
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_text = update.message.text
    await context.bot.send_message(chat_id=update.effective_chat.id, text="מנתח ב-Gemini 2.5 Flash... ⚡")
    
    ai_feedback = await get_ai_response(user_text)
    
    # שליחת התשובה בחלקים אם היא ארוכה מדי
    for part in split_text(ai_feedback):
        await context.bot.send_message(chat_id=update.effective_chat.id, text=part)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await context.bot.send_message(chat_id=update.effective_chat.id, text="אהלן תומר! אני מוכן על 2.5 Flash. שלח קוד!")

if __name__ == '__main__':
    application = ApplicationBuilder().token(os.getenv("TELEGRAM_TOKEN")).build()
    application.add_handler(CommandHandler('start', start))
    application.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handle_message))
    
    print("Agent is running on Gemini 2.5...")
    application.run_polling()