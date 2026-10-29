"""Generate synthetic-a.webm: python generate_video.py /path/to/ffmpeg.
Requires Pillow and FFmpeg with MJPEG pipe input and libvpx VP8 output.
"""
from PIL import Image, ImageDraw, ImageFont
import io
import pathlib
import subprocess
import sys

out = pathlib.Path(__file__).with_name('synthetic-a.webm')
font = ImageFont.load_default(size=80)
frames = []
for i in range(8):
    image = Image.new('RGB', (320, 240), ((i * 63 + 30) % 256, (i * 97 + 40) % 256, (i * 137 + 70) % 256))
    ImageDraw.Draw(image).text((120, 70), str(i + 1), font=font, fill='white')
    buffer = io.BytesIO()
    image.save(buffer, format='JPEG', quality=90)
    frames.extend([buffer.getvalue()] * 4)
subprocess.run([sys.argv[1], '-loglevel', 'error', '-y', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-framerate', '4', '-i', 'pipe:0', '-c:v', 'libvpx', '-b:v', '600k', str(out)], input=b''.join(frames), check=True)
