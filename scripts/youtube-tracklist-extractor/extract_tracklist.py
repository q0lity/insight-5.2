#!/usr/bin/env python3
"""
YouTube Tracklist Extractor
Extracts track lists from YouTube video descriptions and comments.

Usage:
    python extract_tracklist.py <youtube_url>
    python extract_tracklist.py --channel <channel_url> [--limit N]
    python extract_tracklist.py --playlist <playlist_url>

Requirements:
    pip install yt-dlp
"""

import argparse
import json
import re
import sys
from dataclasses import dataclass, asdict
from typing import Optional

try:
    import yt_dlp
except ImportError:
    print("Error: yt-dlp not installed. Run: pip install yt-dlp")
    sys.exit(1)


@dataclass
class Track:
    """Represents a single track in the tracklist."""
    position: int
    timestamp: Optional[str]
    timestamp_seconds: Optional[int]
    artist: Optional[str]
    title: str
    raw_line: str


@dataclass
class VideoTracklist:
    """Tracklist extracted from a YouTube video."""
    video_id: str
    video_title: str
    video_url: str
    channel: str
    upload_date: Optional[str]
    tracks: list
    source: str  # 'description' or 'comment'
    raw_text: str


def parse_timestamp(ts: str) -> Optional[int]:
    """Convert timestamp string to seconds."""
    parts = ts.split(':')
    try:
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        elif len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    except ValueError:
        pass
    return None


def extract_tracks_from_text(text: str) -> list:
    """
    Extract track information from text (description or comment).

    Handles various formats:
    - 00:00 Artist - Title
    - 00:00 Title - Artist
    - 1. 00:00 Artist - Title
    - [00:00] Artist - Title
    - 00:00:00 Artist - Title (for longer mixes)
    """
    tracks = []
    lines = text.split('\n')

    # Regex patterns for timestamp formats
    timestamp_patterns = [
        r'^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-–—]?\s*(.+)$',  # 00:00 or [00:00] followed by content
        r'^(\d+)[.\)]\s*\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-–—]?\s*(.+)$',  # 1. 00:00 content
        r'^(\d+)[.\)]\s*(.+?)\s*[-–—]\s*\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?$',  # 1. content - 00:00
    ]

    position = 0
    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Try pattern 1: timestamp at start
        match = re.match(timestamp_patterns[0], line)
        if match:
            position += 1
            timestamp = match.group(1)
            content = match.group(2).strip()
            artist, title = parse_artist_title(content)
            tracks.append(Track(
                position=position,
                timestamp=timestamp,
                timestamp_seconds=parse_timestamp(timestamp),
                artist=artist,
                title=title,
                raw_line=line
            ))
            continue

        # Try pattern 2: number, timestamp, content
        match = re.match(timestamp_patterns[1], line)
        if match:
            position = int(match.group(1))
            timestamp = match.group(2)
            content = match.group(3).strip()
            artist, title = parse_artist_title(content)
            tracks.append(Track(
                position=position,
                timestamp=timestamp,
                timestamp_seconds=parse_timestamp(timestamp),
                artist=artist,
                title=title,
                raw_line=line
            ))
            continue

        # Try pattern 3: number, content, timestamp at end
        match = re.match(timestamp_patterns[2], line)
        if match:
            position = int(match.group(1))
            content = match.group(2).strip()
            timestamp = match.group(3)
            artist, title = parse_artist_title(content)
            tracks.append(Track(
                position=position,
                timestamp=timestamp,
                timestamp_seconds=parse_timestamp(timestamp),
                artist=artist,
                title=title,
                raw_line=line
            ))
            continue

    return tracks


def parse_artist_title(content: str) -> tuple:
    """
    Parse artist and title from content string.

    Handles formats:
    - Artist - Title
    - Artist – Title (en-dash)
    - Artist — Title (em-dash)
    - "Title" by Artist
    - Title (no artist)
    """
    # Try splitting by various dash types
    for separator in [' - ', ' – ', ' — ', ' − ']:
        if separator in content:
            parts = content.split(separator, 1)
            return parts[0].strip(), parts[1].strip()

    # Try "by" format
    by_match = re.match(r'"?(.+?)"?\s+by\s+(.+)', content, re.IGNORECASE)
    if by_match:
        return by_match.group(2).strip(), by_match.group(1).strip()

    # No artist found
    return None, content


def extract_from_video(url: str, include_comments: bool = True) -> Optional[VideoTracklist]:
    """Extract tracklist from a single YouTube video."""

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'writesubtitles': False,
        'getcomments': include_comments,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as e:
        print(f"Error extracting video info: {e}", file=sys.stderr)
        return None

    video_id = info.get('id', '')
    video_title = info.get('title', 'Unknown')
    channel = info.get('uploader', 'Unknown')
    upload_date = info.get('upload_date')
    description = info.get('description', '')

    # Try extracting from description first
    tracks = extract_tracks_from_text(description)
    source = 'description'
    raw_text = description

    # If no tracks found in description, try comments
    if not tracks and include_comments:
        comments = info.get('comments', []) or []
        # Sort by likes to get most relevant (pinned usually has most likes)
        comments_sorted = sorted(comments, key=lambda c: c.get('like_count', 0), reverse=True)

        for comment in comments_sorted[:10]:  # Check top 10 comments
            comment_text = comment.get('text', '')
            comment_tracks = extract_tracks_from_text(comment_text)
            if len(comment_tracks) >= 3:  # Assume a tracklist has at least 3 tracks
                tracks = comment_tracks
                source = 'comment'
                raw_text = comment_text
                break

    if not tracks:
        print(f"No tracklist found for: {video_title}", file=sys.stderr)
        return None

    return VideoTracklist(
        video_id=video_id,
        video_title=video_title,
        video_url=f"https://youtube.com/watch?v={video_id}",
        channel=channel,
        upload_date=upload_date,
        tracks=tracks,
        source=source,
        raw_text=raw_text
    )


def extract_from_playlist(playlist_url: str, limit: Optional[int] = None) -> list:
    """Extract tracklists from all videos in a playlist."""

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True,
        'playlistend': limit,
    }

    tracklists = []

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            playlist_info = ydl.extract_info(playlist_url, download=False)
    except Exception as e:
        print(f"Error extracting playlist: {e}", file=sys.stderr)
        return []

    entries = playlist_info.get('entries', [])
    total = len(entries)

    for i, entry in enumerate(entries, 1):
        video_url = entry.get('url') or f"https://youtube.com/watch?v={entry.get('id')}"
        print(f"Processing {i}/{total}: {entry.get('title', 'Unknown')}", file=sys.stderr)

        tracklist = extract_from_video(video_url)
        if tracklist:
            tracklists.append(tracklist)

    return tracklists


def extract_from_channel(channel_url: str, limit: int = 10) -> list:
    """Extract tracklists from recent videos on a channel."""

    # Convert channel URL to videos URL if needed
    if '/videos' not in channel_url:
        if channel_url.endswith('/'):
            channel_url = channel_url + 'videos'
        else:
            channel_url = channel_url + '/videos'

    return extract_from_playlist(channel_url, limit)


def format_tracklist_text(tracklist: VideoTracklist) -> str:
    """Format tracklist as readable text."""
    lines = [
        f"{'='*60}",
        f"Video: {tracklist.video_title}",
        f"Channel: {tracklist.channel}",
        f"URL: {tracklist.video_url}",
        f"Source: {tracklist.source}",
        f"Tracks: {len(tracklist.tracks)}",
        f"{'='*60}",
        ""
    ]

    for track in tracklist.tracks:
        ts = track.timestamp or "     "
        if track.artist:
            lines.append(f"{track.position:2}. [{ts}] {track.artist} - {track.title}")
        else:
            lines.append(f"{track.position:2}. [{ts}] {track.title}")

    lines.append("")
    return '\n'.join(lines)


def format_tracklist_json(tracklists: list) -> str:
    """Format tracklists as JSON."""
    data = []
    for tl in tracklists:
        tl_dict = asdict(tl)
        data.append(tl_dict)
    return json.dumps(data, indent=2, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(
        description='Extract track lists from YouTube video descriptions and comments.'
    )
    parser.add_argument('url', nargs='?', help='YouTube video URL')
    parser.add_argument('--channel', '-c', help='Extract from channel URL')
    parser.add_argument('--playlist', '-p', help='Extract from playlist URL')
    parser.add_argument('--limit', '-l', type=int, default=10,
                        help='Limit number of videos to process (default: 10)')
    parser.add_argument('--json', '-j', action='store_true',
                        help='Output as JSON')
    parser.add_argument('--no-comments', action='store_true',
                        help='Skip checking comments (faster)')
    parser.add_argument('--output', '-o', help='Output file (default: stdout)')

    args = parser.parse_args()

    if not any([args.url, args.channel, args.playlist]):
        parser.print_help()
        sys.exit(1)

    tracklists = []

    if args.channel:
        print(f"Extracting from channel: {args.channel}", file=sys.stderr)
        tracklists = extract_from_channel(args.channel, args.limit)
    elif args.playlist:
        print(f"Extracting from playlist: {args.playlist}", file=sys.stderr)
        tracklists = extract_from_playlist(args.playlist, args.limit)
    elif args.url:
        tracklist = extract_from_video(args.url, not args.no_comments)
        if tracklist:
            tracklists = [tracklist]

    if not tracklists:
        print("No tracklists found.", file=sys.stderr)
        sys.exit(1)

    # Format output
    if args.json:
        output = format_tracklist_json(tracklists)
    else:
        output = '\n'.join(format_tracklist_text(tl) for tl in tracklists)

    # Write output
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(output)
        print(f"Output written to: {args.output}", file=sys.stderr)
    else:
        print(output)

    print(f"\nTotal: {len(tracklists)} videos with tracklists, "
          f"{sum(len(tl.tracks) for tl in tracklists)} tracks", file=sys.stderr)


if __name__ == '__main__':
    main()
