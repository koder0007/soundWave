import { useEffect, useRef, useState } from 'react'
import './App.css'

const API_PREFIX = '/api'

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('soundwave-user')
    return savedUser ? JSON.parse(savedUser) : null
  })
  const [authMode, setAuthMode] = useState('login')
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
  })
  const [songs, setSongs] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [currentTrack, setCurrentTrack] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [uploadForm, setUploadForm] = useState({ title: '', file: null })
  const [albumForm, setAlbumForm] = useState({ title: '', musicIds: '' })
  const audioRef = useRef(null)

  useEffect(() => {
    if (user) {
      localStorage.setItem('soundwave-user', JSON.stringify(user))
      fetchSongs()
    } else {
      localStorage.removeItem('soundwave-user')
      setSongs([])
      setCurrentTrack(null)
    }
  }, [user])

  const apiRequest = async (endpoint, options = {}) => {
    const headers = { ...(options.headers || {}) }
    const isFormData = options.body instanceof FormData

    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(`${API_PREFIX}${endpoint}`, {
      credentials: 'include',
      ...options,
      headers,
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.message || 'Request failed')
    }

    return data
  }

  const fetchSongs = async () => {
    try {
      const data = await apiRequest('/music')
      setSongs(data.musics || [])
    } catch (err) {
      setError(err.message)
    }
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register'
      const payload = {
        username: form.username,
        email: form.email,
        password: form.password,
        role: form.role,
      }

      if (authMode === 'login' && !payload.username) {
        throw new Error('Username or email is required')
      }

      if (authMode === 'register' && (!payload.username || !payload.email || !payload.password)) {
        throw new Error('Username, email, and password are required')
      }

      const result = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          role: form.role,
        }),
      })

      setUser(result.user)
      setSuccess(authMode === 'login' ? 'Logged in successfully.' : 'Account created successfully.')
      setForm({ username: '', email: '', password: '', role: 'user' })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    setUser(null)
    setError('')
    setSuccess('Logged out successfully.')
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
  }

  const handleSongPlay = (song) => {
    const audio = audioRef.current
    if (!audio) return

    if (currentTrack && currentTrack.id === song.id && !audio.paused) {
      audio.pause()
      setCurrentTrack(null)
      return
    }

    setCurrentTrack(song)
    audio.src = song.uri
    audio.play().catch(() => {
      setError('Your browser blocked autoplay. Click play again.')
    })
  }

  const handleSongPause = () => {
    const audio = audioRef.current
    if (!audio) return

    audio.pause()
    setCurrentTrack(null)
  }

  const featuredTrack = currentTrack || songs[0] || null
  const filteredSongs = songs.filter((song) => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return true

    return (
      (song.title || '').toLowerCase().includes(query) ||
      (song.artist || '').toLowerCase().includes(query)
    )
  })

  const handleFeaturedPlay = () => {
    if (!featuredTrack) return
    handleSongPlay(featuredTrack)
  }

  const handleUploadSubmit = async (event) => {
    event.preventDefault()
    if (!user || user.role !== 'artist') {
      setError('Only artists can upload songs.')
      return
    }

    try {
      const formData = new FormData()
      formData.append('title', uploadForm.title)
      formData.append('music', uploadForm.file)

      await apiRequest('/music/upload', {
        method: 'POST',
        body: formData,
      })

      setSuccess('Song uploaded successfully.')
      setUploadForm({ title: '', file: null })
      fetchSongs()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAlbumSubmit = async (event) => {
    event.preventDefault()
    if (!user || user.role !== 'artist') {
      setError('Only artists can create albums.')
      return
    }

    try {
      const musicIds = albumForm.musicIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)

      if (!albumForm.title || musicIds.length === 0) {
        throw new Error('Album title and at least one music ID are required')
      }

      await apiRequest('/music/album', {
        method: 'POST',
        body: JSON.stringify({
          title: albumForm.title,
          musics: musicIds,
        }),
      })

      setSuccess('Album created successfully.')
      setAlbumForm({ title: '', musicIds: '' })
    } catch (err) {
      setError(err.message)
    }
  }

  const isArtist = user?.role === 'artist'
  const canAccessMusicLibrary = user && (user.role === 'user' || user.role === 'artist')

  if (!user) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="brand-block">
            <p className="eyebrow">Soundwave</p>
            <h1>Listen and share your sound.</h1>
            <p className="subtext">
              Sign in as a listener or artist to explore tracks and start uploading music.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <div className="segmented-control">
              <button
                type="button"
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => setAuthMode('login')}
              >
                Sign in
              </button>
              <button
                type="button"
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => setAuthMode('register')}
              >
                Sign up
              </button>
            </div>

            <label>
              Username
              <input
                name="username"
                value={form.username}
                onChange={handleInputChange}
                placeholder="Enter username"
              />
            </label>

            {authMode === 'register' && (
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleInputChange}
                  placeholder="Enter email"
                />
              </label>
            )}

            <label>
              Password
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleInputChange}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                      <path d="M4 4l16 16" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            {authMode === 'register' && (
              <label>
                Account type
                <select name="role" value={form.role} onChange={handleInputChange}>
                  <option value="user">User</option>
                  <option value="artist">Artist</option>
                </select>
              </label>
            )}

            {error && <p className="message error">{error}</p>}
            {success && <p className="message success">{success}</p>}

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : authMode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Soundwave</p>
          <h2>Discover fresh tracks</h2>
        </div>

        <div className="topbar-actions">
          <span className="user-pill">
            {user.username} · {user.role}
          </span>
          <button type="button" className="ghost-button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      {error && <p className="message error">{error}</p>}
      {success && <p className="message success">{success}</p>}

      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Featured playlist</p>
          <h3>Midnight Drive</h3>
          <p className="hero-text">
            A handpicked mix of warm synths, electric basslines, and smooth vocals to set the mood.
          </p>

          <div className="hero-actions">
            <button type="button" className="primary-button" onClick={handleFeaturedPlay}>
              {currentTrack ? 'Resume' : 'Play now'}
            </button>
            {currentTrack && (
              <button type="button" className="ghost-button" onClick={handleSongPause}>
                Pause
              </button>
            )}
          </div>

          <div className="hero-meta">
            <div>
              <span>Listeners</span>
              <strong>18.4k</strong>
            </div>
            <div>
              <span>Trending</span>
              <strong>New mix</strong>
            </div>
            <div>
              <span>Genre</span>
              <strong>Electronic</strong>
            </div>
          </div>
        </div>

        <div className="hero-art">
          <div className="art-disk">
            <div className="art-core" />
          </div>

          <div className="track-card">
            <span>Now playing</span>
            <strong>{featuredTrack ? featuredTrack.title : 'No track selected'}</strong>
            <small>{featuredTrack ? featuredTrack.artist || 'Soundwave' : 'Curated mix'}</small>
          </div>
        </div>
      </section>

      {canAccessMusicLibrary && (
        <main className="dashboard">
          <section className="library-panel">
          <div className="panel-header">
            <h3>Library</h3>
            <span>{filteredSongs.length} tracks</span>
          </div>

          <div className="search-box">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search music by title or artist"
            />
            <button type="button" className="small-button search-button">
              Search
            </button>
          </div>

          <div className="song-list">
            {filteredSongs.length === 0 ? (
              <p className="empty-state">No matching songs found.</p>
            ) : (
              filteredSongs.map((song) => (
                <div key={song.id || song._id} className={`song-card ${currentTrack?.id === song.id ? 'active' : ''}`}>
                  <div>
                    <h4>{song.title}</h4>
                    <p>{song.artist}</p>
                  </div>

                  <div className="song-actions">
                    <button type="button" className="small-button" onClick={() => handleSongPlay(song)}>
                      {currentTrack?.id === song.id ? 'Playing' : 'Listen'}
                    </button>

                    {currentTrack?.id === song.id && (
                      <button type="button" className="ghost-button small-action" onClick={handleSongPause}>
                        Pause
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {isArtist && (
          <aside className="artist-panel">
            <div className="panel-header">
              <h3>Artist studio</h3>
            </div>

            <form className="stack-form" onSubmit={handleUploadSubmit}>
              <h4>Upload a song</h4>
              <label>
                Song title
                <input
                  value={uploadForm.title}
                  onChange={(event) => setUploadForm({ ...uploadForm, title: event.target.value })}
                  placeholder="Track name"
                />
              </label>

              <label>
                Music file
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(event) =>
                    setUploadForm({
                      ...uploadForm,
                      file: event.target.files?.[0] || null,
                    })
                  }
                />
              </label>

              <button type="submit" className="primary-button">
                Upload song
              </button>
            </form>

            <form className="stack-form" onSubmit={handleAlbumSubmit}>
              <h4>Create album</h4>
              <label>
                Album title
                <input
                  value={albumForm.title}
                  onChange={(event) => setAlbumForm({ ...albumForm, title: event.target.value })}
                  placeholder="Album name"
                />
              </label>

              <label>
                Music IDs
                <input
                  value={albumForm.musicIds}
                  onChange={(event) => setAlbumForm({ ...albumForm, musicIds: event.target.value })}
                  placeholder="comma separated music ids"
                />
              </label>

              <button type="submit" className="primary-button">
                Save album
              </button>
            </form>
            </aside>
          )}
        </main>
      )}

      <audio ref={audioRef} className="hidden-player" />
    </div>
  )
}

export default App
