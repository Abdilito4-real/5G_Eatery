// supabase.js - 5G Eatery Enhanced Configuration
const SUPABASE_URL = 'https://rvrkvivlexnhmqcxaqxl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_t-Q2aXJ3EvaTbGvwEaLesw_SXKAQUNd';

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = 'dlin3ddon';
const CLOUDINARY_UPLOAD_PRESET = '5G_Eatery';
const NOTIFICATION_SOUND = 'notification.wav'; // Make sure this path is correct

// Global theme manager
window.themeManager = {
  init() {
    const theme = localStorage.getItem('5g-eatery-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    this.updateToggleButton(theme);

    // Add theme toggle listeners
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => this.toggle());
    });
  },
  
  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('5g-eatery-theme', newTheme);
    this.updateToggleButton(newTheme);
  },

  updateToggleButton(theme) {
    const btns = document.querySelectorAll('.theme-toggle-btn');
    btns.forEach(btn => {
      if (theme === 'dark') {
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
        btn.title = "Switch to Light Mode";
      } else {
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
        btn.title = "Switch to Dark Mode";
      }
    });
  }
};

// Global audio manager for notifications
window.audioManager = {
  context: null,
  sound: null,
  isUnlocked: false,
  audioInitialized: false,
  
  init() {
    if (this.audioInitialized) return;
    
    try {
      // Create audio element but don't play yet
      this.sound = new Audio();
      this.sound.src = NOTIFICATION_SOUND;
      this.sound.preload = 'auto';
      this.sound.volume = 0.7;
      
      // Preload the audio
      this.sound.load();
      
      // Check if audio is supported
      this.sound.addEventListener('canplaythrough', () => {
        console.log('Audio loaded successfully');
      });
      
      this.sound.addEventListener('error', (e) => {
        console.warn('Audio loading error:', e);
      });
      
      this.audioInitialized = true;
    } catch (e) {
      console.warn('Audio initialization failed:', e);
    }
  },
  
  async unlock() {
    if (this.isUnlocked) return true;
    
    try {
      // For browsers that require user interaction
      if (this.sound) {
        // Play a silent sound to unlock audio
        this.sound.volume = 0.01;
        const playPromise = this.sound.play();
        
        if (playPromise !== undefined) {
          await playPromise;
          // Immediately pause
          this.sound.pause();
          this.sound.currentTime = 0;
          this.sound.volume = 0.7;
          this.isUnlocked = true;
          console.log('Audio unlocked successfully');
          return true;
        }
      }
      
      // Alternative: Use Web Audio API
      if (!this.context) {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
      
      // Create a silent buffer to unlock
      const buffer = this.context.createBuffer(1, 1, 22050);
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.context.destination);
      source.start(0);
      
      this.isUnlocked = true;
      console.log('Audio context unlocked');
      return true;
      
    } catch (e) {
      console.warn('Could not unlock audio:', e);
      return false;
    }
  },
  
  async play() {
    try {
      // Check if sound is enabled in config
      if (!window.CONFIG || !window.CONFIG.SOUND_ENABLED) {
        return;
      }
      
      if (!this.isUnlocked) {
        console.log('Audio not unlocked. Will not play.');
        return;
      }
      
      // Create a new audio instance for each play to allow overlapping
      const playSound = new Audio(NOTIFICATION_SOUND);
      playSound.volume = 0.7;
      
      // Play and handle any errors
      const playPromise = playSound.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('Playback failed:', error);
        });
      }
    } catch (e) {
      console.warn('Could not play notification:', e);
    }
  },
  
  async test() {
    // Test function to verify sound is working
    const wasUnlocked = this.isUnlocked;
    if (!wasUnlocked) {
      await this.unlock();
    }
    await this.play();
    return this.isUnlocked;
  }
};

// Initialize audio on page load
document.addEventListener('DOMContentLoaded', () => {
  window.audioManager.init();
});

// Also initialize when DOM is ready (for browsers where DOMContentLoaded already fired)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.audioManager.init();
  });
} else {
  window.audioManager.init();
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

// Cloudinary upload helper with progress tracking
window.uploadToCloudinary = async (file, onProgress) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const statusMessage = {
        400: 'Bad Request - Check upload preset and cloud name',
        401: 'Unauthorized - Check Cloudinary credentials',
        403: 'Forbidden - Upload preset may not allow unsigned uploads',
        500: 'Cloudinary Server Error - Please try again'
      }[response.status] || `HTTP ${response.status}`;
      
      throw new Error(`Cloudinary upload failed: ${statusMessage}. ${errorData.error?.message || ''}`);
    }
    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary Error:', error);
    throw error;
  }
};

// Initialize theme
document.addEventListener('DOMContentLoaded', () => {
  window.themeManager.init();
});

// Error handler
window.handleSupabaseError = (error, defaultMessage = 'Operation failed') => {
  console.error('Supabase Error:', error);
  return {
    message: error?.message || defaultMessage,
    details: error?.details || '',
    hint: error?.hint || ''
  };
};

// Check if user is authenticated
window.isUserAuthenticated = async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session ? true : false;
};
