import json
import base64
import io
import requests
from typing import Dict, Any
from PIL import Image
import cv2
import numpy as np

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Улучшенная AI замена лиц с seamless cloning
    Args: event - dict с httpMethod, body (base64 или URL изображения)
          context - object с request_id
    Returns: HTTP response с base64 результатом
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
        def load_image(img_data: str) -> np.ndarray:
            if img_data.startswith('http'):
                response = requests.get(img_data, timeout=10)
                img = Image.open(io.BytesIO(response.content))
            elif img_data.startswith('data:image'):
                img_data = img_data.split(',')[1]
                img = Image.open(io.BytesIO(base64.b64decode(img_data)))
            else:
                img = Image.open(io.BytesIO(base64.b64decode(img_data)))
            
            return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        
        target_cv = load_image(target_image)
        swap_cv = load_image(swap_image)
        
        def detect_faces_dnn(image: np.ndarray):
            h, w = image.shape[:2]
            blob = cv2.dnn.blobFromImage(image, 1.0, (300, 300), [104, 117, 123], False, False)
            
            net = cv2.dnn.readNetFromCaffe(
                cv2.data.haarcascades.replace('haarcascades', 'deploy.prototxt'),
                cv2.data.haarcascades.replace('haarcascades', 'res10_300x300_ssd_iter_140000.caffemodel')
            )
            net.setInput(blob)
            detections = net.forward()
            
            faces = []
            for i in range(detections.shape[2]):
                confidence = detections[0, 0, i, 2]
                if confidence > 0.5:
                    box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                    x, y, x2, y2 = box.astype(int)
                    faces.append((x, y, x2-x, y2-y))
            return faces
        
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        target_gray = cv2.cvtColor(target_cv, cv2.COLOR_BGR2GRAY)
        swap_gray = cv2.cvtColor(swap_cv, cv2.COLOR_BGR2GRAY)
        
        target_faces = face_cascade.detectMultiScale(target_gray, 1.05, 3, minSize=(30, 30))
        swap_faces = face_cascade.detectMultiScale(swap_gray, 1.05, 3, minSize=(30, 30))
        
        if len(target_faces) == 0:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'No face detected in target image'}),
                'isBase64Encoded': False
            }
        
        if len(swap_faces) == 0:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'No face detected in swap image'}),
                'isBase64Encoded': False
            }
        
        tx, ty, tw, th = target_faces[0]
        sx, sy, sw, sh = swap_faces[0]
        
        padding = int(tw * 0.15)
        tx_pad = max(0, tx - padding)
        ty_pad = max(0, ty - padding)
        tw_pad = min(target_cv.shape[1] - tx_pad, tw + 2*padding)
        th_pad = min(target_cv.shape[0] - ty_pad, th + 2*padding)
        
        sx_pad = max(0, sx - padding)
        sy_pad = max(0, sy - padding)
        sw_pad = min(swap_cv.shape[1] - sx_pad, sw + 2*padding)
        sh_pad = min(swap_cv.shape[0] - sy_pad, sh + 2*padding)
        
        swap_face = swap_cv[sy_pad:sy_pad+sh_pad, sx_pad:sx_pad+sw_pad]
        swap_face_resized = cv2.resize(swap_face, (tw_pad, th_pad))
        
        result = target_cv.copy()
        
        mask = 255 * np.ones(swap_face_resized.shape, swap_face_resized.dtype)
        center = (tx_pad + tw_pad // 2, ty_pad + th_pad // 2)
        
        try:
            result = cv2.seamlessClone(swap_face_resized, result, mask, center, cv2.NORMAL_CLONE)
        except:
            result[ty_pad:ty_pad+th_pad, tx_pad:tx_pad+tw_pad] = swap_face_resized
        
        result_rgb = cv2.cvtColor(result, cv2.COLOR_BGR2RGB)
        result_pil = Image.fromarray(result_rgb)
        
        buffered = io.BytesIO()
        result_pil.save(buffered, format="JPEG", quality=95)
        result_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        result_data_url = f"data:image/jpeg;base64,{result_base64}"
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'result_url': result_data_url,
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