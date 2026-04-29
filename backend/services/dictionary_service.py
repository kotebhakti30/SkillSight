import requests

def get_meaning(word):
    url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
    response = requests.get(url, timeout=5)

    if response.status_code != 200:
        return "Sorry, I could not find the meaning of this word."

    data = response.json()

    try:
        meaning = data[0]["meanings"][0]["definitions"][0]["definition"]
        return meaning
    except (KeyError, IndexError):
        return "Meaning not available for this word."
