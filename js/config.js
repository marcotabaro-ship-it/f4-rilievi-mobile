// ================================================================
// FILE: js/config.js
// PROGETTO: F4 Rilievi Mobile
// ================================================================

const APP_CONFIG = {

  SUPABASE_URL:      'https://yqjnszswhvfbqjlbspon.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlxam5zenN3aHZmYnFqbGJzcG9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMTc3MDgsImV4cCI6MjA5MjU5MzcwOH0.movW9tLfZprCE7t6Zsbox3IZvTYlaS5UrSL2LN3Z7kM',

  VERSION:  '2.1.0',
  APP_NAME: 'F4 Rilievi Mobile',

  SYNC_MODE_KEY: 'f4m_sync_mode',

  // ============================================================
  // IMMAGINI STRATIGRAFIE (percorso dalla root del sito)
  // ============================================================
  STRAT_IMAGES: {
    'SERR_A': 'img/SerramentiAttaccoMuroA.jpg',
    'SERR_B': 'img/SerramentiAttaccoMuroB.jpg',
    'SERR_C': 'img/SerramentiAttaccoMuroC.jpg',
    'SERR_D': 'img/SerramentiAttaccoMuroD.jpg',
    'SERR_E': 'img/SerramentiAttaccoMuroE.jpg'
  },

  PORTA_IMAGES: {
    'N_H': 'img/PorteIntTipoForoNh.jpg',
    'N_L': 'img/PorteIntTipoForoNl.jpg',
    'P_H': 'img/PorteIntTipoForoPh.jpg',
    'P_L': 'img/PorteIntTipoForoPl.jpg'
  },

  ACC_IMAGES: {
    'avvolgibile':  'img/Avvolgibile.jpeg',
    'cassonetto':   'img/Cassonetto_PVC.webp',
    'controtelaio': 'img/Controtelaio_legno.png',
    'frangisole':   'img/Frangisole.jpeg',
    'gru':          'img/Gru.png',
    'posa':         'img/Posa.jpeg',
    'scuretto':     'img/Scuretto.jpeg',
    'tenda_zip':    'img/Tenda_zip.jpeg',
    'termocassa':   'img/Termocassa.jpeg',
    'zanzariera':   'img/Zanzariera.jpeg'
  },

  // ============================================================
  // STRATIGRAFIE: lettere per tipo immagine
  // ============================================================
  STRAT_QUOTE: {
    'SERR_A': ['W','X','Y','Z'],
    'SERR_B': ['W','X','Y','Z','J'],
    'SERR_C': ['X','Y','Z','J'],
    'SERR_D': ['X','Y','Z','J','Q'],
    'SERR_E': ['X','Y','Z','J','Q']
  },

  STRAT_QUOTE_DESC: {
    'W': 'Strato inferiore (mm)',
    'X': 'Strato intermedio (mm)',
    'Y': 'Strato superiore (mm)',
    'Z': 'Spessore totale muro (mm)',
    'J': 'Profondita aletta nel muro (mm)',
    'Q': 'Sporgenza / Sbalzo orizzontale (mm)'
  }
};
