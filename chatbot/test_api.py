#3b5ec8d2-bbe3-45fe-a308-51fa2a6f253d
#f07c26e6-195a-482d-86d2-3bfba5a3e8df       -  shockwave id ai21 labs

from ai21 import AI21Client
from ai21.models.chat import ChatMessage

client = AI21Client(
    api_key='3b5ec8d2-bbe3-45fe-a308-51fa2a6f253d',  # No #
)

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
