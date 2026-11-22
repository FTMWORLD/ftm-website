"""Make the cover the first frame of a video (owner 22 Nov 2026: every post must show its cover).
TikTok (personal account) and YouTube Shorts ignore the uploaded thumbnail and show the video's first frame,
so the first 0.4 s of every feed video show the designed cover; the sound is untouched.
python3 social/tools/coverfirst.py video.mp4 cover.jpg   (edits video.mp4 in place; safe to run twice)"""
import sys, os, subprocess, shutil, tempfile

def apply(video, cover, secs=0.4):
    if not (os.path.exists(video) and os.path.exists(cover)):
        return False
    fd, tmp = tempfile.mkstemp(suffix='.mp4', dir=os.path.dirname(os.path.abspath(video))); os.close(fd)
    vf = "[1:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[c];[0:v][c]overlay=0:0:enable='lt(t,%s)'" % secs
    r = subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', video, '-loop', '1', '-i', cover, '-filter_complex', vf,
                        '-map', '0:a?', '-c:a', 'copy', '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-pix_fmt', 'yuv420p',
                        '-movflags', '+faststart', '-shortest', tmp])
    if r.returncode != 0:
        os.remove(tmp); return False
    shutil.move(tmp, video); return True

if __name__ == '__main__':
    print('ok' if apply(sys.argv[1], sys.argv[2]) else 'skipped')
