

from ai21 import AI21Client
from ai21.models.chat import ChatMessage

client = AI21Client(
)    api_key='apikey',  # No #


system = "You're a support engineer in a SaaS company"
messages = [
    ChatMessage(content=system, role="system"),
    ChatMessage(content="Hello, I need help with a signup process.", role="user"),
]

chat_completions = client.chat.completions.create(
    messages=messages,
    model="jamba-mini",
)

print(chat_completions.choices[0].message.content)

