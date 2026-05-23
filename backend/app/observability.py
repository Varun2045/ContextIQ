from langfuse import Langfuse
from dotenv import load_dotenv

import os

load_dotenv()

langfuse = Langfuse(
    secret_key=os.getenv(
        "LANGFUSE_SECRET_KEY"
    ),
    public_key=os.getenv(
        "LANGFUSE_PUBLIC_KEY"
    ),
    host=os.getenv(
        "LANGFUSE_HOST"
    )
)