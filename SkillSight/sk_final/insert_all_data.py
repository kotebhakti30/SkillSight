import json
import mysql.connector

conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="Jac@2024",
    database="skillsight"
)

cursor = conn.cursor()

with open("questions.JSON", "r", encoding="utf-8") as f:
    data = json.load(f)

domains = data["word_quiz"]["domains"]["english"]

for domain, questions in domains.items():
    for q in questions:
        cursor.execute("""
        INSERT INTO word_quiz (domain, question, option1, option2, option3, option4, answer)
        VALUES (%s,%s,%s,%s,%s,%s,%s)
        """, (
            domain,
            q["q"],
            q["options"][0],
            q["options"][1],
            q["options"][2],
            q["options"][3],
            q["a"]
        ))

conn.commit()
conn.close()

print("All data inserted successfully!")