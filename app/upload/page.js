'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function Upload() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [songs, setSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tags = [
    '새벽감성',
    '신나는',
    '잔잔한',
    '집중',
    '운동',
    '드라이브',
    '인디',
    '힙합',
    'lo-fi',
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/');
      else setUser(session.user);
    });
  }, []);

  function toggleTag(tag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function addSongFromSearch(title, artist, youtubeUrl) {
    if (songs.find((s) => s.title === title)) return;
    setSongs((prev) => [
      ...prev,
      { title, artist, youtube_url: youtubeUrl, order_index: prev.length },
    ]);
  }

async function addSongFromUrl() {
  if (!youtubeUrl.includes('youtube') && !youtubeUrl.includes('youtu.be')) {
    setError('올바른 YouTube 링크를 입력해주세요')
    return
  }

  // oEmbed로 제목 자동 가져오기
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`)
    const data = await res.json()

    const shortMatch = youtubeUrl.match(/youtu\.be\/([^?&\s]+)/)
    const longMatch = youtubeUrl.match(/[?&]v=([^&\s]+)/)
    const videoId = shortMatch ? shortMatch[1] : longMatch ? longMatch[1] : null

    setSongs(prev => [...prev, {
      title: data.title || 'YouTube 곡',
      artist: data.author_name || 'YouTube',
      youtube_url: youtubeUrl,
      thumbnail_url: videoId ? `https://img.youtube.com/vi/${videoId}/0.jpg` : '',
      order_index: prev.length
    }])
    setYoutubeUrl('')
    setError('')
  } catch {
    setError('영상 정보를 가져올 수 없어요. 링크를 확인해주세요.')
  }
}
const videoId = (() => {
  const shortMatch = youtubeUrl.match(/youtu\.be\/([^?&\s]+)/)
  if (shortMatch) return shortMatch[1]
  const longMatch = youtubeUrl.match(/[?&]v=([^&\s]+)/)
  if (longMatch) return longMatch[1]
  return null
})()
    setSongs((prev) => [
      ...prev,
      {
        title: 'YouTube 곡 ' + (prev.length + 1),
        artist: 'YouTube',
        youtube_url: youtubeUrl,
        thumbnail_url: `https://img.youtube.com/vi/${videoId}/0.jpg`,
        order_index: prev.length,
      },
    ]);
    setYoutubeUrl('');
    setError('');
  }

  function removeSong(idx) {
    setSongs((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleUpload() {
    if (!title.trim()) {
      setError('플레이리스트 이름을 입력해주세요');
      return;
    }
    if (songs.length === 0) {
      setError('곡을 1개 이상 추가해주세요');
      return;
    }
    setLoading(true);
    setError('');

    // 1. 플레이리스트 저장
    const { data: pl, error: plError } = await supabase
      .from('playlists')
      .insert({ title, description, tags: selectedTags, user_id: user.id })
      .select()
      .single();

    if (plError) {
      setError('업로드 실패: ' + plError.message);
      setLoading(false);
      return;
    }

    // 2. 곡 저장
    const songsData = songs.map((s) => ({ ...s, playlist_id: pl.id }));
    const { error: songsError } = await supabase
      .from('songs')
      .insert(songsData);

    if (songsError) {
      setError('곡 저장 실패: ' + songsError.message);
      setLoading(false);
      return;
    }

    router.push('/feed');
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        fontFamily: 'DM Sans, sans-serif',
        paddingBottom: '40px',
      }}
    >
      {/* 네비게이션 */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(10,10,15,0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <button
          onClick={() => router.push('/feed')}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#1c1c27',
            border: '1px solid rgba(255,255,255,0.07)',
            color: '#f0f0f0',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          ←
        </button>
        <div
          style={{
            flex: 1,
            fontSize: '16px',
            fontWeight: '500',
            color: '#f0f0f0',
          }}
        >
          새 플레이리스트
        </div>
        <button
          onClick={handleUpload}
          disabled={loading}
          style={{
            padding: '8px 18px',
            background: loading ? '#888' : '#b9ff66',
            border: 'none',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '600',
            color: '#0a0a0f',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '올리는 중...' : '올리기'}
        </button>
      </div>

      <div
        style={{
          maxWidth: '520px',
          margin: '0 auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {error && (
          <div
            style={{
              background: 'rgba(255,107,107,0.1)',
              border: '1px solid rgba(255,107,107,0.3)',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '13px',
              color: '#ff6b6b',
            }}
          >
            {error}
          </div>
        )}

        {/* 기본 정보 */}
        <div
          style={{
            background: '#13131a',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px',
            padding: '20px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: '500',
              color: '#6b6b80',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              marginBottom: '14px',
            }}
          >
            기본 정보
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="플레이리스트 이름 (필수)"
            style={{
              width: '100%',
              background: '#1c1c27',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '10px',
              padding: '11px 14px',
              fontSize: '14px',
              color: '#f0f0f0',
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: '12px',
            }}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="소개를 입력해주세요 (선택)"
            style={{
              width: '100%',
              background: '#1c1c27',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '10px',
              padding: '11px 14px',
              fontSize: '14px',
              color: '#f0f0f0',
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'none',
              height: '80px',
              lineHeight: '1.5',
              marginBottom: '14px',
            }}
          />
          <div
            style={{
              fontSize: '11px',
              fontWeight: '500',
              color: '#6b6b80',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              marginBottom: '10px',
            }}
          >
            분위기 태그
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {tags.map((tag) => (
              <span
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  background: selectedTags.includes(tag)
                    ? 'rgba(185,255,102,0.12)'
                    : '#1c1c27',
                  color: selectedTags.includes(tag) ? '#b9ff66' : '#6b6b80',
                  border: selectedTags.includes(tag)
                    ? '1px solid rgba(185,255,102,0.3)'
                    : '1px solid rgba(255,255,255,0.07)',
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* 곡 추가 */}
        <div
          style={{
            background: '#13131a',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px',
            padding: '20px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: '500',
              color: '#6b6b80',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              marginBottom: '14px',
            }}
          >
            곡 추가
          </div>

          {/* YouTube 링크 */}
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                fontSize: '12px',
                color: '#6b6b80',
                marginBottom: '8px',
              }}
            >
              🔗 YouTube 링크로 추가
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                style={{
                  flex: 1,
                  background: '#1c1c27',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: '#f0f0f0',
                  outline: 'none',
                }}
              />
              <button
                onClick={addSongFromUrl}
                style={{
                  padding: '0 16px',
                  background: '#b9ff66',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#0a0a0f',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                추가
              </button>
            </div>
          </div>

          {/* 샘플 곡 검색 */}
          <div>
            <div
              style={{
                fontSize: '12px',
                color: '#6b6b80',
                marginBottom: '8px',
              }}
            >
              🔍 곡 검색으로 추가
            </div>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="곡 이름 검색..."
              style={{
                width: '100%',
                background: '#1c1c27',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '13px',
                color: '#f0f0f0',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '8px',
              }}
            />
            {[
              {
                title: 'Blinding Lights',
                artist: 'The Weeknd',
                url: 'https://youtube.com/watch?v=4NRXx6U8ABQ',
              },
              {
                title: 'Levitating',
                artist: 'Dua Lipa',
                url: 'https://youtube.com/watch?v=TUVcZfQe-Kw',
              },
              {
                title: 'As It Was',
                artist: 'Harry Styles',
                url: 'https://youtube.com/watch?v=H5v3kku4y6Q',
              },
              {
                title: 'Stay',
                artist: 'The Kid LAROI',
                url: 'https://youtube.com/watch?v=kTJczUoc26U',
              },
              {
                title: 'Heat Waves',
                artist: 'Glass Animals',
                url: 'https://youtube.com/watch?v=mRD0-GxqHVo',
              },
            ]
              .filter(
                (s) =>
                  s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  s.artist.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((s, i) => (
                <div
                  key={i}
                  onClick={() => addSongFromSearch(s.title, s.artist, s.url)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: '#1c1c27',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    marginBottom: '6px',
                  }}
                >
                  <div style={{ fontSize: '20px' }}>🎵</div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#f0f0f0',
                      }}
                    >
                      {s.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b6b80' }}>
                      {s.artist}
                    </div>
                  </div>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: '#b9ff66',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#0a0a0f',
                    }}
                  >
                    +
                  </div>
                </div>
              ))}
          </div>

          {/* 추가된 곡 목록 */}
          {songs.length > 0 && (
            <div
              style={{
                marginTop: '16px',
                borderTop: '1px solid rgba(255,255,255,0.07)',
                paddingTop: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: '#6b6b80',
                  marginBottom: '10px',
                }}
              >
                추가된 곡 {songs.length}개
              </div>
              {songs.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: '#1c1c27',
                    borderRadius: '10px',
                    marginBottom: '6px',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#6b6b80',
                      width: '16px',
                    }}
                  >
                    {i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#f0f0f0',
                      }}
                    >
                      {s.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b6b80' }}>
                      {s.artist}
                    </div>
                  </div>
                  <button
                    onClick={() => removeSong(i)}
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      border: 'none',
                      background: 'rgba(255,107,107,0.15)',
                      color: '#ff6b6b',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
