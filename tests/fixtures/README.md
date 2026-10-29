# Synthetic media

`synthetic-a.webm` contains only eight numbered solid-color images, each shown for one second. The image content was generated for this test; no personal media is used. `generate_video.py` uses Pillow's default font and an FFmpeg build with libvpx. Recreate with `python3 tests/fixtures/generate_video.py /path/to/ffmpeg` (Pillow required). The generated test data may be reused with this repository. Pillow and FFmpeg are separate dependencies governed by their own licenses.
