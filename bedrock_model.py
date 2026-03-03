import boto3
import os
import json
from botocore.exceptions import ClientError

# --- Credentials setup ---
# Option A: If you have Access Key ID + Secret in env
AWS_ACCESS_KEY = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
AWS_BEDROCK_KEY = os.environ.get("AWS_BEDROCK_KEY")  # whatever you saved

# Bedrock Marketplace model needs endpoint ARN from your deployment
# Go to: AWS Bedrock Console > Deployments > your endpoint > copy ARN
# Looks like: arn:aws:sagemaker:us-east-1:123456789:endpoint/your-endpoint-name
ENDPOINT_ARN = "arn:aws:sagemaker:us-east-1:ACCOUNT_ID:endpoint/YOUR_ENDPOINT_NAME"

# Build client
client = boto3.client(
    service_name="bedrock-runtime",
    region_name="us-east-1",
    aws_access_key_id=AWS_ACCESS_KEY,      # or pass AWS_BEDROCK_KEY here if it's an access key
    aws_secret_access_key=AWS_SECRET_KEY,
)

def invoke_qwen(prompt: str, system: str = None, max_tokens: int = 1024) -> str:
    messages = [{"role": "user", "content": [{"text": prompt}]}]
    kwargs = {
        "modelId": ENDPOINT_ARN,   # use ARN for Marketplace models
        "messages": messages,
        "inferenceConfig": {
            "maxTokens": max_tokens,
            "temperature": 0.3,
        }
    }
    if system:
        kwargs["system"] = [{"text": system}]

    try:
        response = client.converse(**kwargs)
        output = response["output"]["message"]["content"][0]["text"]
        usage = response["usage"]
        print(f"[Tokens] in={usage['inputTokens']} out={usage['outputTokens']}")
        return output
    except ClientError as e:
        raise RuntimeError(f"Bedrock error: {e.response['Error']['Message']}")


# --- Test ---
if __name__ == "__main__":
    result = invoke_qwen(
        prompt="Extract cultural references from this transcript: 'Pongal festival is celebrated in Tamil Nadu...'",
        system="You are a cultural entity extractor for Indian content. Return entities as JSON list.",
    )
    print(result)
