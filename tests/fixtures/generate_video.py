"""Generate synthetic-a.webm: python generate_video.py /path/to/ffmpeg.
Requires Pillow and FFmpeg with MJPEG pipe input and libvpx VP8 output.
"""
from PIL import Image, ImageDraw, ImageFont
import io
import pathlib
import subprocess
import sys

variant = sys.argv[2] if len(sys.argv)>2 else 'a'
out = pathlib.Path(__file__).with_name('synthetic-' + variant + '.webm')
count = 8 if variant == 'a' else 12
repeat = 4 if variant == 'a' else 8
font = ImageFont.load_default(size=80)
frames = []
for i in range(count):
    color = ((i * 63 + 30) % 256, (i * 97 + 40) % 256, (i * 137 + 70) % 256) if variant == 'a' else ((i * 31 + 200) % 256, (i * 53 + 10) % 256, (i * 79 + 220) % 256)
    image = Image.new('RGB', (320, 240), color)
    ImageDraw.Draw(image).text((120, 70), str(i + 1), font=font, fill='white')
    buffer = io.BytesIO()
    image.save(buffer, format='JPEG', quality=90)
    frames.extend([buffer.getvalue()] * repeat)
subprocess.run([sys.argv[1], '-loglevel', 'error', '-y', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-framerate', '4', '-i', 'pipe:0', '-c:v', 'libvpx', '-b:v', '600k', str(out)], input=b''.join(frames), check=True)
