import json
import os
import base64
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: AI замена лиц на фотографиях через Replicate API
    Args: event - dict с httpMethod, body (base64 изображения)
          context - object с request_id
    Returns: HTTP response с результатом обработки
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    api_token = os.environ.get('REPLICATE_API_TOKEN')
    if not api_token:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'REPLICATE_API_TOKEN not configured'}),
            'isBase64Encoded': False
        }
    
    try:
        import replicate
    except ImportError:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Replicate library not installed'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    target_image = body_data.get('target_image')
    swap_image = body_data.get('swap_image')
    
    if not target_image or not swap_image:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing target_image or swap_image'}),
            'isBase64Encoded': False
        }
    
    try:
        output = replicate.run(
            "yan-ops/face-swap",
            input={
                "target_image": target_image,
                "swap_image": swap_image,
                "cache_days": 1
            }
        )
        
        result_url = output if isinstance(output, str) else output[0] if isinstance(output, list) else None
        
        if not result_url:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'No output from model'}),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'result_url': result_url,
                'request_id': context.request_id
            }),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Processing failed: {str(e)}'}),
            'isBase64Encoded': False
        }